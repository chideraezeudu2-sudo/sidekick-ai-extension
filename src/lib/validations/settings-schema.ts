import { z } from 'zod/v4'

/** Zod schema for validating user settings */
export const settingsSchema = z.object({
  openrouterApiKey: z.string(),
  selectedModel: z.string().min(1, 'Model selection is required'),
  mode: z.enum(['assistive', 'automation']),
  avatarEnabled: z.boolean(),
  confirmationPolicy: z.enum(['high_risk_only', 'always', 'never']),
})

/** Schema for partial settings updates */
export const partialSettingsSchema = settingsSchema.partial()

export type ValidatedSettings = z.infer<typeof settingsSchema>
