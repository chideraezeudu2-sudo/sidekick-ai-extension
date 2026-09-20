import { z } from 'zod/v4'
import { MessageType } from '@/lib/types/messages'

/** Zod schema for validating a chat message */
export const messageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message cannot be empty'),
  timestamp: z.iso.datetime(),
})

/** Zod schema for SEND_MESSAGE payload */
export const sendMessageSchema = z.object({
  type: z.literal(MessageType.SEND_MESSAGE),
  payload: z.object({
    conversationId: z.string().min(1),
    content: z.string().min(1, 'Message cannot be empty'),
  }),
})

/** Zod schema for UPDATE_SETTINGS payload */
export const updateSettingsSchema = z.object({
  type: z.literal(MessageType.UPDATE_SETTINGS),
  payload: z.object({
    openrouterApiKey: z.string().optional(),
    selectedModel: z.string().optional(),
    mode: z.enum(['assistive', 'automation']).optional(),
  }),
})
