import { useState } from 'react'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { usePromptsStore } from '@/stores/prompts-store'
import { Input } from '@/sidepanel/components/ui/input'
import { Button } from '@/sidepanel/components/ui/button'
import { cn } from '@/lib/utils'
import type { CustomPrompt } from '@/lib/types/settings'

/** Manage saved prompts with slash commands */
export function PromptManager() {
  const { prompts, addPrompt, updatePrompt, deletePrompt } = usePromptsStore()
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Slash Commands</label>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Add command"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Save prompts and call them with /command in the chat.
      </p>

      {/* Add form */}
      {adding && (
        <PromptForm
          onSave={async (cmd, label, content) => {
            await addPrompt(cmd, label, content)
            setAdding(false)
          }}
          onCancel={() => setAdding(false)}
          existingCommands={prompts.map((p) => p.command)}
        />
      )}

      {/* Prompt list */}
      <div className="space-y-2">
        {prompts.map((prompt) =>
          editId === prompt.id ? (
            <PromptForm
              key={prompt.id}
              initial={prompt}
              onSave={async (cmd, label, content) => {
                await updatePrompt(prompt.id, { command: cmd, label, content })
                setEditId(null)
              }}
              onCancel={() => setEditId(null)}
              existingCommands={prompts.filter((p) => p.id !== prompt.id).map((p) => p.command)}
            />
          ) : (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onEdit={() => setEditId(prompt.id)}
              onDelete={() => deletePrompt(prompt.id)}
            />
          )
        )}
      </div>

      {prompts.length === 0 && !adding && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No commands yet. Click + to add one.
        </p>
      )}
    </div>
  )
}

/** Display a saved prompt */
function PromptCard({
  prompt,
  onEdit,
  onDelete,
}: {
  prompt: CustomPrompt
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-start gap-2 p-2.5 rounded-md border border-border bg-card">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-primary">/{prompt.command}</span>
          <span className="text-xs text-muted-foreground truncate">{prompt.label}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{prompt.content}</p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

/** Form to add/edit a prompt */
function PromptForm({
  initial,
  onSave,
  onCancel,
  existingCommands,
}: {
  initial?: CustomPrompt
  onSave: (command: string, label: string, content: string) => Promise<void>
  onCancel: () => void
  existingCommands: string[]
}) {
  const [command, setCommand] = useState(initial?.command ?? '')
  const [label, setLabel] = useState(initial?.label ?? '')
  const [content, setContent] = useState(initial?.content ?? '')

  const cleanCmd = command.replace(/[^a-z0-9_-]/gi, '').toLowerCase()
  const duplicate = existingCommands.includes(cleanCmd) && cleanCmd !== initial?.command
  const valid = cleanCmd.length > 0 && label.trim().length > 0 && content.trim().length > 0 && !duplicate

  const handleSave = async () => {
    if (!valid) return
    await onSave(cleanCmd, label.trim(), content.trim())
  }

  return (
    <div className="space-y-2 p-2.5 rounded-md border border-border bg-muted/50">
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Command</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">/</span>
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="name"
              className={cn('pl-6 h-8 text-sm font-mono', duplicate && 'border-destructive')}
              autoFocus
            />
          </div>
          {duplicate && <p className="text-xs text-destructive mt-0.5">Already exists</p>}
        </div>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground">Label</label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="My prompt"
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Prompt content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write the prompt that will be sent to the AI..."
          rows={3}
          className="w-full resize-vertical bg-transparent text-sm rounded-md border border-input px-3 py-2 placeholder:text-muted-foreground focus:outline-none min-h-[60px] max-h-[200px]"
        />
      </div>
      <div className="flex justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5 mr-1" /> Cancel
        </Button>
        <Button size="sm" onClick={handleSave} disabled={!valid}>
          <Check className="h-3.5 w-3.5 mr-1" /> Save
        </Button>
      </div>
    </div>
  )
}
