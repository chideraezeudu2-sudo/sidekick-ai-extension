import type { Message } from '@/lib/types/conversation'

/** OpenAI-compatible message formats expected by OpenRouter */
export type OpenAIMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[] }
  | { role: 'tool'; content: string; tool_call_id: string }

/** Convert our Message[] to the OpenAI message format */
export function formatMessagesForApi(messages: Message[]): OpenAIMessage[] {
  return messages.map((msg) => {
    if (msg.role === 'tool' && msg.toolCallId) {
      return {
        role: 'tool' as const,
        content: msg.content,
        tool_call_id: msg.toolCallId,
      }
    }

    if (msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.length > 0) {
      return {
        role: 'assistant' as const,
        content: msg.content || null,
        tool_calls: msg.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.tool,
            arguments: JSON.stringify(tc.args),
          },
        })),
      }
    }

    return {
      role: msg.role as 'user' | 'system',
      content: msg.content,
    }
  })
}
