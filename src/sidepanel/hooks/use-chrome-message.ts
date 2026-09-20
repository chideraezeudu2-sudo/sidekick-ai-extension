import { MessageType } from '@/lib/types/messages'
import type { ChromeMessage } from '@/lib/types/messages'

/** Send a typed Chrome message to the background worker and get a response */
export async function sendChromeMessage<T = unknown>(message: ChromeMessage): Promise<T> {
  return chrome.runtime.sendMessage(message)
}

/** Helper to check if a response is an LLM error */
export function isLLMError(response: unknown): response is { type: MessageType.LLM_ERROR; payload: { error: string } } {
  return (
    typeof response === 'object' &&
    response !== null &&
    'type' in response &&
    (response as { type: string }).type === MessageType.LLM_ERROR
  )
}
