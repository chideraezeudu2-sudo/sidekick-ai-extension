import { nanoid } from 'nanoid'
import { MessageType } from '@/lib/types/messages'
import type { ChromeMessage } from '@/lib/types/messages'
import type { Message } from '@/lib/types/conversation'
import { getSettings, saveSettings } from '@/background/storage/settings-store'
import { getConversation, saveConversation } from '@/background/storage/conversation-store'
import { runAgentLoop } from '@/background/agent/agent-loop'
import { partialSettingsSchema } from '@/lib/validations/settings-schema'
import { MAX_CONVERSATION_MESSAGES } from '@/lib/constants'
import { closeSidekickGroupTabs } from '@/background/tools/tab-group'

/** Handle SEND_MESSAGE: run the agent loop and return all new messages */
async function handleSendMessage(
  conversationId: string,
  content: string
): Promise<{ type: string; payload: unknown }> {
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

  // Trim to max messages
  if (conversation.messages.length > MAX_CONVERSATION_MESSAGES) {
    conversation.messages = conversation.messages.slice(-MAX_CONVERSATION_MESSAGES)
  }

  try {
    const { newMessages, error } = await runAgentLoop(conversation, settings)

    // Add all new messages to the conversation
    conversation.messages.push(...newMessages)
    conversation.updatedAt = new Date().toISOString()
    await saveConversation(conversation)

    if (error) {
      return {
        type: MessageType.LLM_ERROR,
        payload: { conversationId, error },
      }
    }

    // Find the last assistant message (the final response)
    const lastAssistant = [...newMessages].reverse().find(
      (m): m is Message & { role: 'assistant' } => m.role === 'assistant'
    )

    return {
      type: MessageType.LLM_RESPONSE,
      payload: {
        conversationId,
        messages: newMessages,
        message: lastAssistant ?? newMessages[newMessages.length - 1],
      },
    }
  } catch (err) {
    conversation.updatedAt = new Date().toISOString()
    await saveConversation(conversation)

    const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.'
    return {
      type: MessageType.LLM_ERROR,
      payload: { conversationId, error: errorMessage },
    }
  }
}

/** Handle UPDATE_SETTINGS: validate and save */
async function handleUpdateSettings(
  payload: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    const validated = partialSettingsSchema.parse(payload)
    await saveSettings(validated)
    return { success: true }
  } catch {
    return { success: false, error: 'Invalid settings data.' }
  }
}

/** Route incoming Chrome messages to the appropriate handler */
export function handleMessage(
  message: ChromeMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): boolean {
  switch (message.type) {
    case MessageType.SEND_MESSAGE:
      handleSendMessage(message.payload.conversationId, message.payload.content)
        .then((result) => sendResponse(result))
      return true

    case MessageType.UPDATE_SETTINGS:
      handleUpdateSettings(message.payload as Record<string, unknown>)
        .then((result) => sendResponse(result))
      return true

    case MessageType.STOP_AGENT:
      closeSidekickGroupTabs()
        .then(() => sendResponse({ success: true }))
        .catch(() => sendResponse({ success: false }))
      return true

    default:
      sendResponse({ error: 'Unknown message type' })
      return false
  }
}
