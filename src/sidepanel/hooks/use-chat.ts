import { useChatStore } from '@/stores/chat-store'

/** Convenience hook wrapping the chat store for components */
export function useChat() {
  const {
    conversations,
    activeConversationId,
    isLoading,
    error,
    streamingContent,
    sendMessage,
    stopAgent,
    createConversation,
    clearError,
  } = useChatStore()

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null

  return {
    messages: activeConversation?.messages ?? [],
    isLoading,
    error,
    streamingContent,
    sendMessage,
    stopAgent,
    createConversation,
    clearError,
  }
}
