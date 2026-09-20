import { z } from 'zod/v4'

/** Zod schema for validating a tool call from the LLM */
export const toolCallSchema = z.object({
  id: z.string().min(1),
  tool: z.string().min(1),
  args: z.record(z.string(), z.unknown()),
  status: z.enum(['pending', 'running', 'success', 'error']),
  result: z.string().optional(),
  startedAt: z.string().optional(),
  completedAt: z.string().optional(),
})

/** Zod schema for EXECUTE_TOOL message payload (worker → content script) */
export const executeToolSchema = z.object({
  tool: z.string().min(1),
  args: z.record(z.string(), z.unknown()),
})
