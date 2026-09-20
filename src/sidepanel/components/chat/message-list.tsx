import { useEffect, useRef } from 'react'
import type { Message } from '@/lib/types/conversation'
import { ScrollArea } from '@/sidepanel/components/ui/scroll-area'
import { MessageBubble } from './message-bubble'
import { Loader2, MessageSquare } from 'lucide-react'

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
  /** Partially streamed text from the current LLM response */
  streamingContent?: string
}

/** Scrollable list of chat messages with auto-scroll */
export function MessageList({ messages, isLoading, streamingContent }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive or streaming content updates
  // Use 'auto' (instant) instead of 'smooth' to avoid queuing costly scroll animations
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [messages, isLoading, streamingContent])

  // Empty state
  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <MessageSquare className="h-10 w-10" />
        <p className="text-sm">Ask Sidekick AI anything</p>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 p-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {/* Show streaming content as a partial assistant bubble */}
        {streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap bg-muted text-foreground">
              {streamingContent}
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-foreground/50 animate-pulse rounded-sm" />
            </div>
          </div>
        )}

        {isLoading && !streamingContent && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Sidekick is thinking...
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
