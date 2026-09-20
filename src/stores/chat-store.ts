import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { Conversation, Message } from '@/lib/types/conversation'
import { MessageType } from '@/lib/types/messages'
import { STORAGE_KEYS } from '@/lib/constants'

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  isLoading: boolean
  error: string | null
  /** Accumulated streaming text from the current LLM response */
  streamingContent: string

  /** Load conversations from chrome.storage.local */
  loadConversations: () => Promise<void>

  /** Send a user message and get streamed LLM response via port */
  sendMessage: (content: string) => Promise<void>

  /** Stop the currently running agent process */
  stopAgent: () => void

  /** Create a new empty conversation, returns its ID */
  createConversation: () => string

  /** Switch active conversation */
  setActiveConversation: (id: string) => void

  /** Reset: start a fresh conversation */
  resetConversation: () => void

  /** Delete a conversation */
  deleteConversation: (id: string) => void

  /** Clear error state */
  clearError: () => void
}

/** Reference to the active streaming port so we can disconnect it to stop the agent */
let _activePort: chrome.runtime.Port | null = null

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  isLoading: false,
  error: null,
  streamingContent: '',

  loadConversations: async () => {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CONVERSATIONS)
    const stored = result[STORAGE_KEYS.CONVERSATIONS]
    const conversations: Conversation[] = Array.isArray(stored) ? stored : []
    const activeId = conversations.length > 0 ? conversations[conversations.length - 1].id : null
    set({ conversations, activeConversationId: activeId })
  },

  sendMessage: async (content: string) => {
    const state = get()
    let conversationId = state.activeConversationId

    // Auto-create a conversation if none active
    if (!conversationId) {
      conversationId = get().createConversation()
    }

    // Optimistically add the user message to state
    const userMessage: Message = {
      id: nanoid(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }

    set((s) => ({
      isLoading: true,
      error: null,
      streamingContent: '',
      conversations: s.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, messages: [...c.messages, userMessage], updatedAt: new Date().toISOString() }
          : c
      ),
    }))

    // Open a port for streaming communication
    const finalConvId = conversationId
    try {
      const port = chrome.runtime.connect({ name: 'sidekick-ai-stream' })
      _activePort = port

      port.onMessage.addListener((msg: { type: string; payload: Record<string, unknown> }) => {
        handleStreamPortMessage(msg, finalConvId, port)
      })

      port.onDisconnect.addListener(() => {
        _activePort = null
        const s = get()
        if (s.isLoading) {
          set({ isLoading: false, streamingContent: '' })
        }
      })

      // Send the message through the port
      port.postMessage({
        type: MessageType.SEND_MESSAGE,
        payload: { conversationId: finalConvId, content },
      })
    } catch {
      _activePort = null
      set({ isLoading: false, error: 'Failed to connect to background worker.' })
    }
  },

  stopAgent: () => {
    // 1. Disconnect the streaming port → triggers AbortController in background
    //    which aborts the agent loop + LLM fetch
    if (_activePort) {
      _activePort.disconnect()
      _activePort = null
    }
    // 2. Clear token buffer
    if (_tokenFlushTimer) { clearTimeout(_tokenFlushTimer); _tokenFlushTimer = null }
    _tokenBuffer = ''
    // 3. Send STOP_AGENT to background → closes all Sidekick AI group tabs
    chrome.runtime.sendMessage({ type: MessageType.STOP_AGENT }).catch(() => {})
    // 4. Reset UI state
    set({ isLoading: false, streamingContent: '' })
  },

  createConversation: () => {
    const id = nanoid()
    const newConversation: Conversation = {
      id,
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    set((s) => ({
      conversations: [...s.conversations, newConversation],
      activeConversationId: id,
    }))
    return id
  },

  setActiveConversation: (id: string) => {
    set({ activeConversationId: id, error: null })
  },

  resetConversation: () => {
    const id = nanoid()
    const fresh: Conversation = {
      id,
      title: 'New Chat',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    set((s) => ({
      conversations: [...s.conversations, fresh],
      activeConversationId: id,
      error: null,
    }))
  },

  deleteConversation: (id: string) => {
    set((s) => {
      const filtered = s.conversations.filter((c) => c.id !== id)
      const newActiveId = s.activeConversationId === id
        ? (filtered.length > 0 ? filtered[filtered.length - 1].id : null)
        : s.activeConversationId
      return { conversations: filtered, activeConversationId: newActiveId }
    })
    // Also delete from storage
    chrome.storage.local.get(STORAGE_KEYS.CONVERSATIONS).then((result) => {
      const stored = result[STORAGE_KEYS.CONVERSATIONS]
      if (Array.isArray(stored)) {
        const filtered = stored.filter((c: Conversation) => c.id !== id)
        chrome.storage.local.set({ [STORAGE_KEYS.CONVERSATIONS]: filtered })
      }
    })
  },

  clearError: () => set({ error: null }),
}))

/** Batched streaming token buffer — avoids flooding React with per-token re-renders */
let _tokenBuffer = ''
let _tokenFlushTimer: ReturnType<typeof setTimeout> | null = null
const TOKEN_FLUSH_INTERVAL = 80 // ms — flush accumulated tokens to UI

function flushTokenBuffer(): void {
  if (_tokenBuffer.length === 0) return
  const buffered = _tokenBuffer
  _tokenBuffer = ''
  useChatStore.setState((s) => ({
    streamingContent: s.streamingContent + buffered,
  }))
}

/** Handle incoming stream port messages and update the store */
function handleStreamPortMessage(
  msg: { type: string; payload: Record<string, unknown> },
  conversationId: string,
  port: chrome.runtime.Port
): void {
  const { setState, getState } = useChatStore

  switch (msg.type) {
    case MessageType.STREAM_TOKEN:
      // Buffer tokens and flush periodically to avoid flooding the UI
      _tokenBuffer += msg.payload.token as string
      if (!_tokenFlushTimer) {
        _tokenFlushTimer = setTimeout(() => {
          _tokenFlushTimer = null
          flushTokenBuffer()
        }, TOKEN_FLUSH_INTERVAL)
      }
      break

    case MessageType.STREAM_TOOL_CALL: {
      // Flush buffered tokens before switching to tool call mode
      if (_tokenFlushTimer) { clearTimeout(_tokenFlushTimer); _tokenFlushTimer = null }
      _tokenBuffer = ''

      const toolMsg = msg.payload.message as Message
      setState((s) => ({
        streamingContent: '',
        conversations: s.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, toolMsg], updatedAt: new Date().toISOString() }
            : c
        ),
      }))
      break
    }

    case MessageType.STREAM_TOOL_RESULT: {
      const { toolCallId, result, success } = msg.payload as {
        toolCallId: string; result: string; success: boolean
      }
      // Optimized: only update the specific conversation and search from the end
      // (tool results always belong to the most recent assistant message with that toolCallId)
      setState((s) => ({
        conversations: s.conversations.map((c) => {
          if (c.id !== conversationId) return c
          const msgs = c.messages
          // Search backwards — the relevant assistant message is always near the end
          for (let i = msgs.length - 1; i >= 0; i--) {
            const m = msgs[i]
            if (m.role !== 'assistant' || !m.toolCalls) continue
            const tcIdx = m.toolCalls.findIndex((tc) => tc.id === toolCallId)
            if (tcIdx === -1) continue
            // Found the message — create a shallow copy with the updated tool call
            const updatedCalls = [...m.toolCalls]
            updatedCalls[tcIdx] = { ...updatedCalls[tcIdx], status: success ? 'success' as const : 'error' as const, result }
            const updatedMsgs = [...msgs]
            updatedMsgs[i] = { ...m, toolCalls: updatedCalls }
            return { ...c, messages: updatedMsgs }
          }
          return c
        }),
      }))
      break
    }

    case MessageType.STREAM_END: {
      // Flush any remaining buffered tokens before finalizing
      if (_tokenFlushTimer) { clearTimeout(_tokenFlushTimer); _tokenFlushTimer = null }
      _tokenBuffer = ''

      const newMessages = (msg.payload.messages as Message[]) ?? []
      const state = getState()
      const conv = state.conversations.find((c) => c.id === conversationId)
      // Determine which messages are already in state (tool call messages sent via STREAM_TOOL_CALL)
      const existingIds = new Set(conv?.messages.map((m) => m.id) ?? [])
      const missingMessages = newMessages.filter((m) => !existingIds.has(m.id))

      setState((s) => ({
        isLoading: false,
        streamingContent: '',
        conversations: s.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, messages: [...c.messages, ...missingMessages], updatedAt: new Date().toISOString() }
            : c
        ),
      }))
      _activePort = null
      port.disconnect()
      break
    }

    case MessageType.STREAM_ERROR:
      // Flush any remaining buffered tokens
      if (_tokenFlushTimer) { clearTimeout(_tokenFlushTimer); _tokenFlushTimer = null }
      _tokenBuffer = ''

      setState({
        isLoading: false,
        streamingContent: '',
        error: msg.payload.error as string,
      })
      _activePort = null
      port.disconnect()
      break
  }
}
