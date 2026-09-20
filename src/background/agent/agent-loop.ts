import { nanoid } from 'nanoid'
import type { Message, Conversation } from '@/lib/types/conversation'
import type { Settings } from '@/lib/types/settings'
import type { ToolCall, OpenAIToolCall } from '@/lib/types/tools'
import { callLLM, callLLMStream } from '@/background/llm/openrouter-client'
import { TOOL_DEFINITIONS } from '@/background/tools/tool-registry'
import { SYSTEM_PROMPT } from '@/background/llm/prompts'
import { dispatchToolCall } from './tool-dispatcher'
import { logActivity } from '@/background/storage/activity-store'
import { addTabToSidekickGroup } from '@/background/tools/tab-group'
import { showAvatarOnTab, hideAvatarOnTab } from '@/background/agent/avatar-controller'

/** Max iterations to prevent infinite loops */
const MAX_ITERATIONS = 40

/** Tell the content script to stop the scan animation */
async function stopScanOverlay(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id) {
      await chrome.tabs.sendMessage(tab.id, { type: 'SCAN_STOP' })
    }
  } catch {
    // Content script might not be loaded — ignore
  }
}

/** Tell the content script to fade out and remove the avatar — safe to call even if it was never shown */
async function stopAvatar(): Promise<void> {
  const tabId = await getActiveTabId()
  if (tabId !== null) await hideAvatarOnTab(tabId)
}

/** Result of the agent loop — all new messages produced */
export interface AgentLoopResult {
  newMessages: Message[]
  error?: string
}

/** Events emitted by the agent loop for real-time UI updates */
export type AgentEvent =
  | { type: 'tool_start'; toolCall: ToolCall }
  | { type: 'tool_end'; toolCallId: string; result: string; success: boolean }
  | { type: 'token'; content: string }
  | { type: 'message'; message: Message }
  | { type: 'done'; messages: Message[] }
  | { type: 'error'; error: string }

/** Get the active tab ID */
async function getActiveTabId(): Promise<number | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab?.id ?? null
}

/** Try streaming LLM call; returns content + tool calls, emitting tokens via onEvent */
async function tryStreamIteration(
  allMessages: Message[],
  settings: Settings,
  onEvent?: (event: AgentEvent) => void,
  signal?: AbortSignal
): Promise<{ content: string; toolCalls: OpenAIToolCall[] } | null> {
  let content = ''
  let toolCalls: OpenAIToolCall[] = []

  try {
    for await (const chunk of callLLMStream(allMessages, settings, TOOL_DEFINITIONS, signal)) {
      if (chunk.type === 'token') {
        content += chunk.content
        onEvent?.({ type: 'token', content: chunk.content })
      } else if (chunk.type === 'tool_calls') {
        toolCalls = chunk.calls
      } else if (chunk.type === 'error') {
        return null // Fall back to non-streaming
      }
    }
  } catch {
    return null // Fall back to non-streaming
  }

  return { content, toolCalls }
}

/** Execute tool calls, emitting events and logging activity */
async function executeToolCalls(
  apiToolCalls: OpenAIToolCall[],
  toolCalls: ToolCall[],
  conversationId: string,
  newMessages: Message[],
  allMessages: Message[],
  onEvent?: (event: AgentEvent) => void
): Promise<void> {
  const tabId = await getActiveTabId()

  if (tabId === null) {
    for (const tc of apiToolCalls) {
      const msg: Message = {
        id: nanoid(), role: 'tool',
        content: 'No active tab available to execute this tool.',
        timestamp: new Date().toISOString(), toolCallId: tc.id,
      }
      newMessages.push(msg)
      allMessages.push(msg)
    }
    return
  }

  // Add the active tab to the Sidekick AI group as soon as tools start executing
  await addTabToSidekickGroup(tabId)

  for (const tc of apiToolCalls) {
    const matchingCall = toolCalls.find((c) => c.id === tc.id)
    if (matchingCall) {
      matchingCall.status = 'running'
      onEvent?.({ type: 'tool_start', toolCall: { ...matchingCall } })
    }

    const toolResult = await dispatchToolCall(tc, tabId)

    if (matchingCall) {
      matchingCall.status = toolResult.success ? 'success' : 'error'
      matchingCall.result = toolResult.result
      matchingCall.completedAt = new Date().toISOString()
    }

    onEvent?.({
      type: 'tool_end',
      toolCallId: tc.id,
      result: toolResult.result,
      success: toolResult.success,
    })

    // Log to activity store
    await logActivity({
      conversationId,
      action: tc.function.name,
      target: extractToolTarget(tc),
      result: toolResult.success ? 'success' : 'error',
      details: toolResult.result.slice(0, 500),
    })

    const toolResultMsg: Message = {
      id: nanoid(), role: 'tool',
      content: toolResult.result,
      timestamp: new Date().toISOString(), toolCallId: tc.id,
    }
    newMessages.push(toolResultMsg)
    allMessages.push(toolResultMsg)
  }
}

/** Extract a human-readable target from a tool call's arguments */
function extractToolTarget(tc: OpenAIToolCall): string {
  try {
    const args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>
    return (args.url as string) ?? (args.selector as string) ?? (args.query as string) ?? tc.function.name
  } catch {
    return tc.function.name
  }
}

/**
 * Run the agentic loop: send messages to LLM, execute tool calls, iterate.
 * Returns all new messages (assistant + tool results) produced during the loop.
 * Optionally emits events for real-time streaming to the UI.
 */
export async function runAgentLoop(
  conversation: Conversation,
  settings: Settings,
  onEvent?: (event: AgentEvent) => void,
  signal?: AbortSignal
): Promise<AgentLoopResult> {
  const newMessages: Message[] = []

  if (settings.avatarEnabled) {
    const tabId = await getActiveTabId()
    if (tabId !== null) await showAvatarOnTab(tabId)
  }

  // Prepend system prompt if not already there
  const allMessages: Message[] = [...conversation.messages]
  if (allMessages.length === 0 || allMessages[0].role !== 'system') {
    allMessages.unshift({
      id: 'system',
      role: 'system',
      content: SYSTEM_PROMPT,
      timestamp: new Date().toISOString(),
    })
  }

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    // Check if aborted before each iteration
    if (signal?.aborted) {
      await stopScanOverlay()
      await stopAvatar()
      const abortMsg: Message = {
        id: nanoid(), role: 'assistant',
        content: 'Process stopped by user.',
        timestamp: new Date().toISOString(),
      }
      newMessages.push(abortMsg)
      onEvent?.({ type: 'message', message: abortMsg })
      onEvent?.({ type: 'done', messages: newMessages })
      return { newMessages }
    }

    // Try streaming first, fall back to non-streaming
    const streamResult = await tryStreamIteration(allMessages, settings, onEvent, signal)
    const content = streamResult?.content ?? null
    const apiToolCalls = streamResult?.toolCalls ?? []

    // If streaming failed entirely, fall back to non-streaming callLLM
    if (!streamResult) {
      const fallback = await callLLM(allMessages, settings, TOOL_DEFINITIONS, signal)
      return handleNonStreamingResult(
        fallback, conversation.id, allMessages, newMessages, onEvent
      )
    }

    // No tool calls — final text response
    if (apiToolCalls.length === 0) {
      await stopScanOverlay()
      await stopAvatar()
      const assistantMessage: Message = {
        id: nanoid(), role: 'assistant',
        content: content || '',
        timestamp: new Date().toISOString(),
      }
      newMessages.push(assistantMessage)
      allMessages.push(assistantMessage)
      onEvent?.({ type: 'message', message: assistantMessage })
      onEvent?.({ type: 'done', messages: newMessages })
      return { newMessages }
    }

    // Tool calls — create assistant message, execute tools, loop
    const toolCalls: ToolCall[] = apiToolCalls.map((tc) => ({
      id: tc.id,
      tool: tc.function.name,
      args: JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>,
      status: 'pending' as const,
    }))

    const assistantToolMessage: Message = {
      id: nanoid(), role: 'assistant',
      content: content || '',
      timestamp: new Date().toISOString(), toolCalls,
    }
    newMessages.push(assistantToolMessage)
    allMessages.push(assistantToolMessage)
    onEvent?.({ type: 'message', message: assistantToolMessage })

    await executeToolCalls(
      apiToolCalls, toolCalls, conversation.id,
      newMessages, allMessages, onEvent
    )
  }

  // Hit max iterations
  await stopScanOverlay()
  await stopAvatar()
  const fallbackMessage: Message = {
    id: nanoid(), role: 'assistant',
    content: 'I reached the maximum number of tool iterations. Here is what I found so far based on the tools I used.',
    timestamp: new Date().toISOString(),
  }
  newMessages.push(fallbackMessage)
  onEvent?.({ type: 'message', message: fallbackMessage })
  onEvent?.({ type: 'done', messages: newMessages })
  return { newMessages }
}

/** Handle a non-streaming fallback result (single iteration only) */
async function handleNonStreamingResult(
  result: { content: string | null; toolCalls: import('@/lib/types/tools').OpenAIToolCall[] },
  conversationId: string,
  allMessages: Message[],
  newMessages: Message[],
  onEvent?: (event: AgentEvent) => void
): Promise<AgentLoopResult> {
  if (!result.toolCalls || result.toolCalls.length === 0) {
    await stopScanOverlay()
    await stopAvatar()
    const msg: Message = {
      id: nanoid(), role: 'assistant',
      content: result.content || '',
      timestamp: new Date().toISOString(),
    }
    newMessages.push(msg)
    onEvent?.({ type: 'message', message: msg })
    onEvent?.({ type: 'done', messages: newMessages })
    return { newMessages }
  }

  const toolCalls: ToolCall[] = result.toolCalls.map((tc) => ({
    id: tc.id,
    tool: tc.function.name,
    args: JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>,
    status: 'pending' as const,
  }))

  const assistantMsg: Message = {
    id: nanoid(), role: 'assistant',
    content: result.content || '',
    timestamp: new Date().toISOString(), toolCalls,
  }
  newMessages.push(assistantMsg)
  allMessages.push(assistantMsg)
  onEvent?.({ type: 'message', message: assistantMsg })

  await executeToolCalls(
    result.toolCalls, toolCalls, conversationId,
    newMessages, allMessages, onEvent
  )

  onEvent?.({ type: 'done', messages: newMessages })
  return { newMessages }
}
