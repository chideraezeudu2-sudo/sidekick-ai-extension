import { MessageSquare, Settings, Activity } from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

/** Bottom navigation tabs: Chat / Activity / Settings */
export function NavigationTabs() {
  const { activeView, setActiveView } = useUIStore()

  return (
    <nav className="flex border-t border-border shrink-0 h-12">
      <button
        onClick={() => setActiveView('chat')}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors',
          activeView === 'chat'
            ? 'text-primary bg-accent'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <MessageSquare className="h-4 w-4" />
        Chat
      </button>
      <button
        onClick={() => setActiveView('activity')}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors',
          activeView === 'activity'
            ? 'text-primary bg-accent'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Activity className="h-4 w-4" />
        Activity
      </button>
      <button
        onClick={() => setActiveView('settings')}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 text-xs font-medium transition-colors',
          activeView === 'settings'
            ? 'text-primary bg-accent'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Settings className="h-4 w-4" />
        Settings
      </button>
    </nav>
  )
}
