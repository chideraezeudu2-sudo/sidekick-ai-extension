import type { Message } from '@/lib/types/conversation'
import { ToolCallCard } from './tool-call-card'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
}

/** Single chat bubble: user (right, primary) or assistant (left, muted) */
export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  // Don't render tool result messages — they're internal to the agent loop
  if (message.role === 'tool') return null

  // Assistant message with tool calls — show the tool cards
  if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
    return (
      <div className="flex flex-col gap-1.5 max-w-[85%]">
        {message.toolCalls.map((tc) => (
          <ToolCallCard key={tc.id} toolCall={tc} />
        ))}
        {message.content && (
          <div className="bg-muted text-foreground rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-muted text-foreground rounded-bl-md'
        )}
      >
        {message.content}
      </div>
    </div>
  )
}
