import { SquarePen, History } from 'lucide-react'
import logoUrl from '/icons/icon-128.png'
import { useChatStore } from '@/stores/chat-store'
import { useUIStore } from '@/stores/ui-store'

/** Top header bar showing app name + history + new chat buttons */
export function Header() {
  const resetConversation = useChatStore((s) => s.resetConversation)
  const { activeView, setActiveView } = useUIStore()

  const handleNewChat = () => {
    resetConversation()
    setActiveView('chat')
  }

  const handleHistory = () => {
    setActiveView(activeView === 'history' ? 'chat' : 'history')
  }

  return (
    <header className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
      <div className="flex items-center gap-2">
        <img src={logoUrl} alt="Sidekick AI" className="h-5 w-5" />
        <h1 className="text-sm font-semibold">Sidekick AI</h1>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={handleHistory}
          title="Chat history"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <History className="h-4 w-4" />
        </button>
        <button
          onClick={handleNewChat}
          title="New chat"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <SquarePen className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}
