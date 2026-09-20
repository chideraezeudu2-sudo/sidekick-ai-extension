import type { ToolCall } from '@/lib/types/tools'
import { Wrench, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolCallCardProps {
  toolCall: ToolCall
}

/** Visual indicator for a tool call (pending/running/success/error) */
export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const statusIcon = {
    pending: <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />,
    running: <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />,
    success: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
    error: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  }

  return (
    <div
      className={cn(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
        toolCall.status === 'error' ? 'border-destructive/30 bg-destructive/5' : 'border-border bg-muted/50'
      )}
    >
      <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{toolCall.tool}</span>
          {statusIcon[toolCall.status]}
        </div>
        {toolCall.result && toolCall.status === 'error' && (
          <p className="text-destructive mt-1 truncate">{toolCall.result}</p>
        )}
      </div>
    </div>
  )
}
