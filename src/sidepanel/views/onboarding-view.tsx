import { useState } from 'react'
import logoUrl from '/icons/logo-original.png'
import { useUIStore } from '@/stores/ui-store'
import { useSettingsStore } from '@/stores/settings-store'
import { Button } from '@/sidepanel/components/ui/button'
import { DEFAULT_MODEL_ID } from '@/lib/constants'

/** First-launch onboarding — works out of the box, no API key needed */
export function OnboardingView() {
  const [starting, setStarting] = useState(false)
  const completeOnboarding = useUIStore((s) => s.completeOnboarding)
  const updateSettings = useSettingsStore((s) => s.updateSettings)

  const handleGetStarted = async () => {
    setStarting(true)
    await updateSettings({ selectedModel: DEFAULT_MODEL_ID })
    await completeOnboarding()
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen px-6 gap-6">
      {/* Logo + Title */}
      <div className="flex flex-col items-center gap-2">
        <img src={logoUrl} alt="Sidekick AI" className="h-12 w-12" />
        <h1 className="text-xl font-bold">Welcome to Sidekick AI</h1>
        <p className="text-sm text-muted-foreground text-center">
          An AI buddy that flies around the page and clicks things for you.
        </p>
        <p className="text-xs text-muted-foreground text-center">
          You get 10 free actions to try it — no account or API key needed. Add your
          own OpenRouter key later in Settings for unlimited use without upgrading.
        </p>
      </div>

      {/* CTA */}
      <Button onClick={handleGetStarted} disabled={starting} className="w-full" size="lg">
        {starting ? 'Starting…' : 'Get Started'}
      </Button>
    </div>
  )
}
