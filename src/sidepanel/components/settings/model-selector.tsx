import { useState, useEffect, useMemo, useRef } from 'react'
import { Search, Loader2, ChevronDown, RefreshCw } from 'lucide-react'
import { Input } from '@/sidepanel/components/ui/input'
import { useSettingsStore } from '@/stores/settings-store'
import { cn } from '@/lib/utils'

interface ModelSelectorProps {
  value: string
  onChange: (value: string) => void
  apiKey?: string
}

/** Searchable dropdown to select LLM model from OpenRouter's catalog */
export function ModelSelector({ value, onChange, apiKey }: ModelSelectorProps) {
  const { availableModels, modelsLoading, modelsError, loadModels } = useSettingsStore()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Fetch models when API key is available
  useEffect(() => {
    if (apiKey) {
      loadModels(apiKey)
    }
  }, [apiKey, loadModels])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return availableModels
    const q = search.toLowerCase()
    return availableModels.filter(
      (m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q)
    )
  }, [availableModels, search])

  const selectedModel = availableModels.find((m) => m.id === value)
  const displayName = selectedModel?.name ?? value ?? 'Select a model'

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex items-center gap-1.5">
        <label className="text-sm font-medium">
          Model
          {modelsLoading && <Loader2 className="inline h-3 w-3 ml-1.5 animate-spin" />}
          {!modelsLoading && availableModels.length > 4 && (
            <span className="text-muted-foreground font-normal ml-1.5">
              ({availableModels.length} available)
            </span>
          )}
        </label>
        {!modelsLoading && apiKey && (
          <button
            type="button"
            onClick={() => loadModels(apiKey)}
            title="Refresh models"
            className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center justify-between w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
          'hover:bg-accent hover:text-accent-foreground transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring'
        )}
      >
        <span className="truncate text-left">{displayName}</span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="border border-border rounded-md bg-popover shadow-md">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search models..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Model list */}
          <div className="overflow-y-auto max-h-60 overscroll-contain">
            {modelsError && (
              <p className="text-xs text-destructive px-3 py-2">{modelsError}</p>
            )}
            {filtered.length === 0 && !modelsLoading && (
              <p className="text-xs text-muted-foreground px-3 py-2">No models found</p>
            )}
            {filtered.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => {
                  onChange(model.id)
                  setOpen(false)
                  setSearch('')
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors',
                  model.id === value && 'bg-accent font-medium'
                )}
              >
                <div className="truncate">{model.name}</div>
                <div className="text-xs text-muted-foreground truncate">{model.id}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
