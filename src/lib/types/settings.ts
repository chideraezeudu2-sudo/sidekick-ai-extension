/** User settings stored in chrome.storage.sync */
export interface Settings {
  openrouterApiKey: string
  selectedModel: string
  mode: 'assistive' | 'automation'
  /** Whether the on-page flying avatar is shown while the agent acts */
  avatarEnabled: boolean
  /** When to pause and ask the user before executing an action:
   *  'high_risk_only' (default) — pause only for payment/destructive/consequential actions
   *  'always' — pause before every click or form fill
   *  'never' — never pause (not recommended) */
  confirmationPolicy: 'high_risk_only' | 'always' | 'never'
}

/** A saved prompt callable via /command in the chat */
export interface CustomPrompt {
  id: string
  /** Slash command name (without the /) */
  command: string
  /** Short label shown in the UI */
  label: string
  /** The full prompt content sent to the LLM */
  content: string
}
