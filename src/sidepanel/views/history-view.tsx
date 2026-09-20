import { useChatStore } from '@/stores/chat-store'
import { useUIStore } from '@/stores/ui-store'
import { MessageSquare, Trash2 } from 'lucide-react'

/** Conversation history list */
export function HistoryView() {
  const { conversations, activeConversationId, setActiveConversation } = useChatStore()
  const setActiveView = useUIStore((s) => s.setActiveView)
  const deleteConversation = useChatStore((s) => s.deleteConversation)

  const handleSelect = (id: string) => {
    setActiveConversation(id)
    setActiveView('chat')
  }

  // Show conversations in reverse chronological order
  const sorted = [...conversations]
    .filter((c) => c.messages.length > 0)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <MessageSquare className="h-10 w-10" />
        <p className="text-sm">No conversation history</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">History</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map((conv) => {
          const firstUserMsg = conv.messages.find((m) => m.role === 'user')
          const preview = firstUserMsg?.content ?? conv.title
          const isActive = conv.id === activeConversationId
          const date = new Date(conv.updatedAt)
          const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

          return (
            <div
              key={conv.id}
              className={`flex items-center gap-2 px-4 py-3 border-b border-border cursor-pointer hover:bg-accent transition-colors ${isActive ? 'bg-accent' : ''}`}
              onClick={() => handleSelect(conv.id)}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{preview}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dateStr} · {conv.messages.filter((m) => m.role !== 'system' && m.role !== 'tool').length} messages
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  deleteConversation(conv.id)
                }}
                title="Delete conversation"
                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
