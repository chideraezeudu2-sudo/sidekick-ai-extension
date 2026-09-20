/** Models available through Sidekick AI's backend (Groq by default, or whatever your BYOK provider serves) */
export const DEFAULT_MODELS = [
  { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B (default)' },
  { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B (faster, lighter)' },
  { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet (needs your own OpenRouter key)' },
] as const

/** OpenRouter API endpoint */
export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * Sidekick AI's own backend proxy — holds the shared LLM key server-side and
 * enforces plan limits, so users don't need to bring their own API key.
 */
export const BACKEND_CHAT_URL = 'https://clickyweb-backend.onrender.com/v1/chat/completions'
export const BACKEND_USAGE_URL = 'https://clickyweb-backend.onrender.com/usage'
export const BACKEND_CHECKOUT_URL = 'https://clickyweb-backend.onrender.com/billing/create-checkout-session'
export const BACKEND_VISION_URL = 'https://clickyweb-backend.onrender.com/v1/vision-locate'

/** Max messages kept in a conversation to limit token usage */
export const MAX_CONVERSATION_MESSAGES = 50

/** Default model when none is selected */
export const DEFAULT_MODEL_ID: string = DEFAULT_MODELS[0].id

/**
 * Model IDs shipped by earlier builds that the backend no longer serves. Consulted
 * only when reading stored settings, so existing installs self-heal on next load.
 */
export const LEGACY_MODEL_IDS: Record<string, string> = {
  'gpt-oss-120b': 'openai/gpt-oss-120b',
  'llama-3.3-70b': 'openai/gpt-oss-120b',
  'qwen-3-32b': 'qwen/qwen3.8-27b',
  'llama-3.3-70b-versatile': 'openai/gpt-oss-120b',
  'llama-3.1-8b-instant': 'openai/gpt-oss-20b',
}

/** Max activity log entries kept */
export const MAX_ACTIVITY_ENTRIES = 200

/** Storage keys */
export const STORAGE_KEYS = {
  SETTINGS: 'sidekick_settings',
  CONVERSATIONS: 'sidekick_conversations',
  ONBOARDING: 'sidekick_onboarding_completed',
  PROMPTS: 'sidekick_custom_prompts',
  ACTIVITY_LOG: 'sidekick_activity_log',
} as const
