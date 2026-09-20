import { nanoid } from 'nanoid'
import { MessageType } from '@/lib/types/messages'
import type { SendMessagePayload } from '@/lib/types/messages'
import { getSettings } from '@/background/storage/settings-store'
import { getConversation, saveConversation } from '@/background/storage/conversation-store'
import { runAgentLoop } from '@/background/agent/agent-loop'
import type { AgentEvent } from '@/background/agent/agent-loop'
import { MAX_CONVERSATION_MESSAGES } from '@/lib/constants'

/** Send a typed message through the port (safe if port disconnected) */
function postToPort(
  port: chrome.runtime.Port,
  msg: { type: MessageType; payload: Record<string, unknown> }
): void {
  try {
    port.postMessage(msg)
  } catch {
    // Port disconnected — ignore
  }
}

/** Handle the agent loop events and forward them through the port */
function createEventHandler(
  port: chrome.runtime.Port,
  conversationId: string
): (event: AgentEvent) => void {
  return (event: AgentEvent) => {
    switch (event.type) {
      case 'token':
        postToPort(port, {
          type: MessageType.STREAM_TOKEN,
          payload: { conversationId, token: event.content },
        })
        break
      case 'message':
        if (event.message.toolCalls && event.message.toolCalls.length > 0) {
          postToPort(port, {
            type: MessageType.STREAM_TOOL_CALL,
            payload: { conversationId, message: event.message },
          })
        }
        break
      case 'tool_end':
        postToPort(port, {
          type: MessageType.STREAM_TOOL_RESULT,
          payload: {
            conversationId,
            toolCallId: event.toolCallId,
            result: event.result,
            success: event.success,
          },
        })
        break
      // 'done' and 'error' are handled by the caller
    }
  }
}

/** Process a SEND_MESSAGE received through a streaming port */
async function processStreamMessage(
  port: chrome.runtime.Port,
  payload: SendMessagePayload,
  signal: AbortSignal
): Promise<void> {
  const { conversationId, content } = payload

  const settings = await getSettings()

  // Get or create conversation
  let conversation = await getConversation(conversationId)
  if (!conversation) {
    conversation = {
      id: conversationId,
      title: content.slice(0, 50),
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  // Add user message
  conversation.messages.push({
    id: nanoid(),
    role: 'user',
    content,
    timestamp: new Date().toISOString(),
  })

  // Trim to max
  if (conversation.messages.length > MAX_CONVERSATION_MESSAGES) {
    conversation.messages = conversation.messages.slice(-MAX_CONVERSATION_MESSAGES)
  }

  postToPort(port, {
    type: MessageType.STREAM_START,
    payload: { conversationId },
  })

  try {
    const onEvent = createEventHandler(port, conversationId)
    const { newMessages } = await runAgentLoop(conversation, settings, onEvent, signal)

    conversation.messages.push(...newMessages)
    conversation.updatedAt = new Date().toISOString()
    await saveConversation(conversation)

    postToPort(port, {
      type: MessageType.STREAM_END,
      payload: { conversationId, messages: newMessages },
    })
  } catch (err) {
    conversation.updatedAt = new Date().toISOString()
    await saveConversation(conversation)

    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.'
    postToPort(port, {
      type: MessageType.STREAM_ERROR,
      payload: { conversationId, error: errorMessage },
    })
  }
}

/** Handle a port connection for streaming agent responses */
export function handlePortConnection(port: chrome.runtime.Port): void {
  const controller = new AbortController()

  // Abort when the port disconnects (user pressed Stop or side panel closed)
  port.onDisconnect.addListener(() => {
    controller.abort()
  })

  port.onMessage.addListener((msg: { type: string; payload: unknown }) => {
    if (msg.type === MessageType.SEND_MESSAGE) {
      const payload = msg.payload as SendMessagePayload
      processStreamMessage(port, payload, controller.signal).catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        const errorMessage = err instanceof Error ? err.message : 'Unexpected error.'
        postToPort(port, {
          type: MessageType.STREAM_ERROR,
          payload: { conversationId: payload.conversationId, error: errorMessage },
        })
      })
    }
  })
}
