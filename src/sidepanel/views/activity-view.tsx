import { useActivityStore } from '@/stores/activity-store'
import { Activity, Trash2, MousePointerClick, Eye, Search, Terminal } from 'lucide-react'
import { Button } from '@/sidepanel/components/ui/button'
import { cn } from '@/lib/utils'

/** Map tool action names to icons */
function getActionIcon(action: string) {
  if (action.includes('click') || action.includes('select')) return MousePointerClick
  if (action.includes('read') || action.includes('get') || action.includes('extract')) return Eye
  if (action.includes('search') || action.includes('find') || action.includes('query')) return Search
  return Terminal
}

/** Format ISO timestamp to a short relative or absolute string */
function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHrs = Math.floor(diffMin / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Single activity log entry row */
function ActivityRow({ entry }: { entry: import('@/lib/types/activity').ActivityLogEntry }) {
  const Icon = getActionIcon(entry.action)
  const isError = entry.result === 'error'

  return (
    <div className="flex items-start gap-2.5 px-4 py-2.5 border-b border-border">
      <div className={cn(
        'mt-0.5 p-1 rounded',
        isError ? 'text-destructive bg-destructive/10' : 'text-primary bg-primary/10'
      )}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium truncate">{entry.action}</span>
          <span className={cn(
            'text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0',
            isError
              ? 'bg-destructive/10 text-destructive'
              : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          )}>
            {entry.result}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.target}</p>
        <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{entry.details}</p>
      </div>
      <span className="text-[10px] text-muted-foreground shrink-0 mt-0.5">
        {formatTimestamp(entry.timestamp)}
      </span>
    </div>
  )
}

/** Activity log view: shows all tool executions in reverse chronological order */
export function ActivityView() {
  const { entries, clearEntries } = useActivityStore()

  const sorted = [...entries].reverse()

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <Activity className="h-10 w-10" />
        <p className="text-sm">No activity yet</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-semibold">Activity Log</h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs text-muted-foreground hover:text-destructive"
          onClick={() => { void clearEntries() }}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Clear
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map((entry) => (
          <ActivityRow key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}
