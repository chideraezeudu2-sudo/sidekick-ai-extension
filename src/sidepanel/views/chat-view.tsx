import { useChat } from '@/sidepanel/hooks/use-chat'
import { MessageList } from '@/sidepanel/components/chat/message-list'
import { ChatInput } from '@/sidepanel/components/chat/chat-input'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/sidepanel/components/ui/button'

/** Main chat view: message list + input */
export function ChatView() {
  const { messages, isLoading, error, streamingContent, sendMessage, stopAgent, clearError } = useChat()

  return (
    <div className="flex flex-col h-full">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive text-sm border-b border-destructive/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={clearError}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          isLoading={isLoading}
          streamingContent={streamingContent}
        />
      </div>

      {/* Input area */}
      <ChatInput onSend={sendMessage} isLoading={isLoading} onStop={stopAgent} />
    </div>
  )
}
