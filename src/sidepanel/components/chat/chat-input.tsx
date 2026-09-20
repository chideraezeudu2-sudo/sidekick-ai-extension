import { useState, useRef, useCallback, useMemo, type KeyboardEvent } from 'react'
import { Send, Zap } from 'lucide-react'
import { Button } from '@/sidepanel/components/ui/button'
import { usePromptsStore } from '@/stores/prompts-store'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (content: string) => void
  isLoading: boolean
  onStop: () => void
}

/** Auto-resizing textarea with slash command autocomplete and Send/Stop button */
export function ChatInput({ onSend, isLoading, onStop }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [manualResize, setManualResize] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prompts = usePromptsStore((s) => s.prompts)

  // Detect if user is typing a slash command
  const slashMatch = useMemo(() => {
    // Only match if the entire input starts with / (no text before)
    const match = value.match(/^\/([a-z0-9_-]*)$/i)
    return match ? match[1] : null
  }, [value])

  // Filter matching prompts
  const suggestions = useMemo(() => {
    if (slashMatch === null) return []
    if (slashMatch === '') return prompts // Show all when just "/"
    const q = slashMatch.toLowerCase()
    return prompts.filter(
      (p) => p.command.includes(q) || p.label.toLowerCase().includes(q)
    )
  }, [slashMatch, prompts])

  const showSuggestions = suggestions.length > 0

  const applySuggestion = useCallback((index: number) => {
    const prompt = suggestions[index]
    if (!prompt) return
    setValue(prompt.content)
    setSelectedIndex(0)
    textareaRef.current?.focus()
    // Auto-resize after applying
    requestAnimationFrame(() => {
      const el = textareaRef.current
      if (el) {
        el.style.height = 'auto'
        el.style.height = Math.min(el.scrollHeight, 96) + 'px'
      }
    })
  }, [suggestions])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isLoading) return

    // If exact slash command match, replace with prompt content before sending
    const exactMatch = prompts.find((p) => trimmed === `/${p.command}`)
    const finalContent = exactMatch ? exactMatch.content : trimmed

    onSend(finalContent)
    setValue('')
    setManualResize(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isLoading, onSend, prompts])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Navigate suggestions
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % suggestions.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
        return
      }
      if (e.key === 'Tab' || (e.key === 'Enter' && !e.shiftKey)) {
        e.preventDefault()
        applySuggestion(selectedIndex)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setValue('')
        return
      }
    }

    // Normal enter sends
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    setSelectedIndex(0)
    if (!manualResize) {
      const el = e.target
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 96) + 'px'
    }
  }

  const handleMouseDown = () => {
    const el = textareaRef.current
    if (!el) return
    const startH = el.offsetHeight
    const onMouseUp = () => {
      if (el.offsetHeight !== startH) setManualResize(true)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mouseup', onMouseUp)
  }

  return (
    <div className="relative">
      {/* Slash command suggestions dropdown */}
      {showSuggestions && (
        <div className="absolute bottom-full left-0 right-0 mx-3 mb-1 border border-border rounded-md bg-popover shadow-md overflow-hidden z-10">
          {suggestions.map((prompt, i) => (
            <button
              key={prompt.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault() // Keep focus on textarea
                applySuggestion(i)
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center gap-2',
                i === selectedIndex && 'bg-accent'
              )}
            >
              <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-mono text-primary">/{prompt.command}</span>
              <span className="text-muted-foreground truncate">{prompt.label}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 p-3 border-t border-border">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onMouseDown={handleMouseDown}
          placeholder="Type a message or / for commands..."
          disabled={isLoading}
          rows={1}
          className="flex-1 resize-vertical bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 min-h-[40px] max-h-[50vh] py-2 px-3 rounded-lg border border-input"
        />
        {isLoading ? (
          <Button
            size="icon"
            onClick={onStop}
            className="shrink-0 bg-destructive hover:bg-destructive/90 rounded-full"
          >
            <div className="h-3 w-3 rounded-sm bg-white" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!value.trim()}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
