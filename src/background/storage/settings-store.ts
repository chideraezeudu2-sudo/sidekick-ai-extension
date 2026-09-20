import type { Settings } from '@/lib/types/settings'
import { partialSettingsSchema } from '@/lib/validations/settings-schema'
import { STORAGE_KEYS, DEFAULT_MODEL_ID, DEFAULT_MODELS, LEGACY_MODEL_IDS } from '@/lib/constants'

const DEFAULT_SETTINGS: Settings = {
  openrouterApiKey: '',
  selectedModel: DEFAULT_MODEL_ID,
  mode: 'assistive',
  avatarEnabled: true,
  confirmationPolicy: 'high_risk_only',
}

/**
 * Map a stored model ID that the backend no longer serves onto a working one.
 * Without this, anyone who ran an earlier build keeps a retired ID in
 * chrome.storage.sync and every message fails with 404 model_not_found.
 */
function migrateModelId(selectedModel: string): string {
  const replacement = LEGACY_MODEL_IDS[selectedModel]
  if (replacement) return replacement
  const known = DEFAULT_MODELS.some((m) => m.id === selectedModel)
  return known ? selectedModel : DEFAULT_MODEL_ID
}

/** Retrieve settings from chrome.storage.sync */
export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS)
  const stored = result[STORAGE_KEYS.SETTINGS]
  if (!stored) return DEFAULT_SETTINGS
  const merged = { ...DEFAULT_SETTINGS, ...stored }
  return { ...merged, selectedModel: migrateModelId(merged.selectedModel) }
}

/** Save partial settings update to chrome.storage.sync */
export async function saveSettings(partial: Partial<Settings>): Promise<void> {
  const validated = partialSettingsSchema.parse(partial)
  const current = await getSettings()
  const updated = { ...current, ...validated }
  await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: updated })
}

/** Check if the user has configured an API key */
export async function hasApiKey(): Promise<boolean> {
  const settings = await getSettings()
  return settings.openrouterApiKey.length > 0
}
