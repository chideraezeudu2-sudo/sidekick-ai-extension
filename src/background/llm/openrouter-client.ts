import type { Message } from '@/lib/types/conversation'
import type { Settings } from '@/lib/types/settings'
import type { OpenAITool, OpenAIToolCall } from '@/lib/types/tools'
import { BACKEND_CHAT_URL } from '@/lib/constants'
import { getOrCreateInstallId } from '@/background/storage/install-id'
import { formatMessagesForApi } from './message-formatter'

/** Response from the LLM — either text content or tool calls */
export interface LLMCallResult {
  content: string | null
  toolCalls: OpenAIToolCall[]
}

/** Chunk types emitted by the streaming LLM call */
export type StreamChunk =
  | { type: 'token'; content: string }
  | { type: 'tool_calls'; calls: OpenAIToolCall[] }
  | { type: 'error'; error: string }

/** Build headers for a call to our backend: install ID always, the user's own key only if they set one (BYOK bypasses plan limits) */
async function buildBackendHeaders(settings: Settings): Promise<Record<string, string>> {
  const installId = await getOrCreateInstallId()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Install-Id': installId,
  }
  if (settings.openrouterApiKey) {
    headers['X-User-Llm-Key'] = settings.openrouterApiKey
  }
  return headers
}

/** Pause before each retry of a rate-limited request, in ms; index = attempt number */
const RATE_LIMIT_BACKOFF_MS = [2000, 8000]

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

/**
 * POST to the backend, pausing and retrying when the provider rate limits us.
 *
 * The shared provider key allows only a few requests per minute, while a single
 * agent task needs one round trip per step, so a 429 partway through a task is
 * expected rather than exceptional. Retrying here keeps the task alive instead
 * of failing the user's command.
 *
 * A plan-limit 429 is returned untouched: that is the user's own quota, and
 * waiting will not clear it.
 */
async function fetchWithRateLimitRetry(
  url: string,
  init: RequestInit,
  signal?: AbortSignal
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, init)
    if (response.status !== 429) return response

    let code = ''
    try {
      code = (await response.clone().json())?.error?.code ?? ''
    } catch {
      // non-JSON error body; fall through to the generic retry
    }
    if (code === 'PLAN_LIMIT_REACHED') return response
    if (attempt >= RATE_LIMIT_BACKOFF_MS.length) return response

    const retryAfter = Number(response.headers.get('retry-after'))
    const waitMs =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 15000)
        : RATE_LIMIT_BACKOFF_MS[attempt]

    console.warn(`[llm] provider rate limited; retrying in ${waitMs}ms (attempt ${attempt + 1})`)
    await sleep(waitMs, signal)
  }
}

/** Send messages to the LLM via Sidekick AI's backend, with optional tool definitions */
export async function callLLM(
  messages: Message[],
  settings: Settings,
  tools?: OpenAITool[],
  signal?: AbortSignal
): Promise<LLMCallResult> {
  let response: Response

  const body: Record<string, unknown> = {
    model: settings.selectedModel,
    messages: formatMessagesForApi(messages),
  }

  // Only include tools if provided and non-empty
  if (tools && tools.length > 0) {
    body.tools = tools
  }

  try {
    response = await fetchWithRateLimitRetry(
      BACKEND_CHAT_URL,
      {
        method: 'POST',
        headers: await buildBackendHeaders(settings),
        body: JSON.stringify(body),
      },
      signal
    )
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new Error('Network error. Check your connection.')
  }

  if (!response.ok) {
    let errorDetail = ''
    let errorCode = ''
    try {
      const errorData = await response.json()
      errorDetail = errorData?.error?.message || JSON.stringify(errorData)
      errorCode = errorData?.error?.code || ''
    } catch {
      errorDetail = await response.text().catch(() => '')
    }

    if (response.status === 429 && errorCode === 'PLAN_LIMIT_REACHED') {
      throw new Error(errorDetail)
    }
    if (response.status === 401) {
      throw new Error('Invalid API key. Check your OpenRouter key in Settings, or remove it to use Sidekick AI\'s built-in AI.')
    }
    if (response.status === 429) {
      throw new Error('Rate limit reached. Please wait a moment.')
    }
    if (response.status >= 500) {
      throw new Error('Server error. Try again later.')
    }
    throw new Error(`Error (${response.status}): ${errorDetail}`)
  }

  const data = await response.json()
  const choice = data?.choices?.[0]?.message

  if (!choice) {
    throw new Error('Unexpected response format from the server.')
  }

  return {
    content: choice.content ?? null,
    toolCalls: choice.tool_calls ?? [],
  }
}

/** Handle non-200 responses with descriptive errors */
async function handleStreamError(response: Response): Promise<string> {
  let detail = ''
  let code = ''
  try {
    const parsed = JSON.parse(await response.text())
    detail = parsed?.error?.message || ''
    code = parsed?.error?.code || ''
  } catch {
    // ignore parse errors
  }
  if (code === 'PLAN_LIMIT_REACHED') return detail
  if (response.status === 401) return 'Invalid API key. Check your OpenRouter key in Settings, or remove it to use Sidekick AI\'s built-in AI.'
  if (response.status === 429) return 'Rate limit reached. Please wait a moment.'
  if (response.status >= 500) return 'Server error. Try again later.'
  return `Error (${response.status}): ${detail}`
}

/** Partial tool call accumulated across SSE deltas */
interface PartialToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

/** Parse a single SSE data JSON object, accumulating tool calls */
function processSSEDelta(
  parsed: Record<string, unknown>,
  accumulated: PartialToolCall[]
): StreamChunk | null {
  const choices = parsed.choices as Array<Record<string, unknown>> | undefined
  if (!choices || choices.length === 0) return null

  const delta = choices[0].delta as Record<string, unknown> | undefined
  if (!delta) return null

  // Text content token
  if (typeof delta.content === 'string' && delta.content.length > 0) {
    return { type: 'token', content: delta.content }
  }

  // Tool call deltas — accumulate progressively
  const toolCallDeltas = delta.tool_calls as Array<Record<string, unknown>> | undefined
  if (toolCallDeltas) {
    for (const tcd of toolCallDeltas) {
      const index = typeof tcd.index === 'number' ? tcd.index : accumulated.length
      const fn = tcd.function as Record<string, string> | undefined

      if (!accumulated[index]) {
        accumulated[index] = {
          id: (tcd.id as string) ?? '',
          type: 'function',
          function: { name: fn?.name ?? '', arguments: fn?.arguments ?? '' },
        }
      } else {
        if (tcd.id) accumulated[index].id = tcd.id as string
        if (fn?.name) accumulated[index].function.name += fn.name
        if (fn?.arguments) accumulated[index].function.arguments += fn.arguments
      }
    }
  }

  return null
}

/** Stream LLM responses via SSE — yields tokens and tool calls */
export async function* callLLMStream(
  messages: Message[],
  settings: Settings,
  tools?: OpenAITool[],
  signal?: AbortSignal
): AsyncGenerator<StreamChunk> {
  const body: Record<string, unknown> = {
    model: settings.selectedModel,
    messages: formatMessagesForApi(messages),
    stream: true,
  }

  if (tools && tools.length > 0) {
    body.tools = tools
  }

  let response: Response
  try {
    response = await fetchWithRateLimitRetry(
      BACKEND_CHAT_URL,
      {
        method: 'POST',
        headers: await buildBackendHeaders(settings),
        body: JSON.stringify(body),
      },
      signal
    )
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    yield { type: 'error', error: 'Network error. Check your connection.' }
    return
  }

  if (!response.ok) {
    yield { type: 'error', error: await handleStreamError(response) }
    return
  }

  if (!response.body) {
    yield { type: 'error', error: 'No response body received from OpenRouter.' }
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  const accumulatedToolCalls: PartialToolCall[] = []
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      // Keep incomplete last line in buffer
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') continue

        try {
          const parsed = JSON.parse(data) as Record<string, unknown>
          const chunk = processSSEDelta(parsed, accumulatedToolCalls)
          if (chunk) yield chunk
        } catch {
          // Skip malformed JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  // Yield accumulated tool calls if any
  if (accumulatedToolCalls.length > 0) {
    const validCalls = accumulatedToolCalls.filter((tc) => tc.id && tc.function.name)
    if (validCalls.length > 0) {
      yield { type: 'tool_calls', calls: validCalls as OpenAIToolCall[] }
    }
  }
}
