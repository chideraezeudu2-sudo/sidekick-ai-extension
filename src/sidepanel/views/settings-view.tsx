import { useState, useEffect } from 'react'
import { useSettingsStore } from '@/stores/settings-store'
import { usePromptsStore } from '@/stores/prompts-store'
import { ApiKeyInput } from '@/sidepanel/components/settings/api-key-input'
import { ModelSelector } from '@/sidepanel/components/settings/model-selector'
import { PromptManager } from '@/sidepanel/components/settings/prompt-manager'
import { AvatarSettings } from '@/sidepanel/components/settings/avatar-settings'
import { UsagePanel } from '@/sidepanel/components/settings/usage-panel'
import { Button } from '@/sidepanel/components/ui/button'
import type { Settings } from '@/lib/types/settings'
import { toast } from 'sonner'

/** Settings view: API key config + model selection + avatar/confirmation + prompt manager */
export function SettingsView() {
  const { settings, loadSettings, updateSettings } = useSettingsStore()
  const loadPrompts = usePromptsStore((s) => s.loadPrompts)
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('')
  const [avatarEnabled, setAvatarEnabled] = useState(true)
  const [confirmationPolicy, setConfirmationPolicy] = useState<Settings['confirmationPolicy']>('high_risk_only')

  useEffect(() => {
    loadSettings()
    loadPrompts()
  }, [loadSettings, loadPrompts])

  // Sync local form state when settings load
  useEffect(() => {
    if (settings) {
      setApiKey(settings.openrouterApiKey)
      setModel(settings.selectedModel)
      setAvatarEnabled(settings.avatarEnabled)
      setConfirmationPolicy(settings.confirmationPolicy)
    }
  }, [settings])

  const handleSave = async () => {
    await updateSettings({
      openrouterApiKey: apiKey,
      selectedModel: model,
      avatarEnabled,
      confirmationPolicy,
    })
    toast.success('Settings saved')
  }

  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      <h2 className="text-lg font-semibold">Settings</h2>

      <div className="border border-border rounded-md p-3">
        <UsagePanel />
      </div>

      <ApiKeyInput value={apiKey} onChange={setApiKey} />
      <ModelSelector value={model} onChange={setModel} apiKey={apiKey} />

      <div className="border-t border-border pt-4">
        <AvatarSettings
          avatarEnabled={avatarEnabled}
          confirmationPolicy={confirmationPolicy}
          onChangeAvatarEnabled={setAvatarEnabled}
          onChangeConfirmationPolicy={setConfirmationPolicy}
        />
      </div>

      <Button onClick={handleSave} className="w-full">
        Save
      </Button>

      <div className="border-t border-border pt-4">
        <PromptManager />
      </div>
    </div>
  )
}
