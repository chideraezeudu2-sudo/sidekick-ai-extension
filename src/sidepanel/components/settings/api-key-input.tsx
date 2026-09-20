import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from '@/sidepanel/components/ui/input'
import { Button } from '@/sidepanel/components/ui/button'

interface ApiKeyInputProps {
  value: string
  onChange: (value: string) => void
}

/** Password input with visibility toggle for the OpenRouter API key */
export function ApiKeyInput({ value, onChange }: ApiKeyInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor="api-key">
        Your own OpenRouter API key (optional)
      </label>
      <p className="text-xs text-muted-foreground -mt-1">
        Sidekick AI works without this using your plan's included actions. Add your
        own key to skip plan limits entirely.
      </p>
      <div className="relative">
        <Input
          id="api-key"
          type={visible ? 'text' : 'password'}
          placeholder="sk-or-..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-10"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  )
}
