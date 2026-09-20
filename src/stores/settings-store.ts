import { create } from 'zustand'
import type { Settings } from '@/lib/types/settings'
import type { OpenRouterModel } from '@/lib/types/model'
import { MessageType } from '@/lib/types/messages'
import { STORAGE_KEYS, DEFAULT_MODEL_ID, DEFAULT_MODELS } from '@/lib/constants'

interface SettingsState {
  settings: Settings | null
  isLoading: boolean
  availableModels: OpenRouterModel[]
  modelsLoading: boolean
  modelsError: string | null

  /** Load settings from chrome.storage.sync */
  loadSettings: () => Promise<void>

  /** Update settings via background worker */
  updateSettings: (partial: Partial<Settings>) => Promise<void>

  /** Fetch all available models from OpenRouter API */
  loadModels: (apiKey: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  isLoading: false,
  availableModels: DEFAULT_MODELS.map((m) => ({ id: m.id, name: m.name })),
  modelsLoading: false,
  modelsError: null,

  loadSettings: async () => {
    set({ isLoading: true })
    const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS)
    const stored = result[STORAGE_KEYS.SETTINGS] as Partial<Settings> | undefined
    const settings: Settings = {
      openrouterApiKey: '',
      selectedModel: DEFAULT_MODEL_ID,
      mode: 'assistive',
      avatarEnabled: true,
      confirmationPolicy: 'high_risk_only',
      ...stored,
    }
    set({ settings, isLoading: false })
  },

  updateSettings: async (partial: Partial<Settings>) => {
    await chrome.runtime.sendMessage({
      type: MessageType.UPDATE_SETTINGS,
      payload: partial,
    })

    set((s) => ({
      settings: s.settings ? { ...s.settings, ...partial } : null,
    }))
  },

  loadModels: async (apiKey: string) => {
    if (!apiKey) return
    set({ modelsLoading: true, modelsError: null })

    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch models (${response.status})`)
      }

      const data = await response.json()
      const models: OpenRouterModel[] = (data.data ?? [])
        .filter((m: { id: string }) => !m.id.includes(':free') || true) // keep all
        .map((m: { id: string; name: string; description?: string; context_length?: number; pricing?: { prompt: string; completion: string } }) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          context_length: m.context_length,
          pricing: m.pricing,
        }))
        .sort((a: OpenRouterModel, b: OpenRouterModel) => a.name.localeCompare(b.name))

      set({ availableModels: models, modelsLoading: false })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load models'
      set({ modelsError: message, modelsLoading: false })
    }
  },
}))
