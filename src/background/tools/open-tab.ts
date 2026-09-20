import type { ToolResult } from '@/lib/types/tools'

/** Validate that a string is a proper HTTP(S) URL */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/** Open a new browser tab with the given URL */
export async function executeOpenTab(
  toolCallId: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const url = args.url as string | undefined

  if (!url || typeof url !== 'string') {
    return { toolCallId, tool: 'open_tab', success: false, result: 'Missing required argument: url' }
  }

  if (!isValidUrl(url)) {
    return { toolCallId, tool: 'open_tab', success: false, result: `Invalid URL: ${url}. Must be a valid http or https URL.` }
  }

  try {
    const tab = await chrome.tabs.create({ url })
    return {
      toolCallId,
      tool: 'open_tab',
      success: true,
      result: `Opened new tab (id: ${tab.id}) with URL: ${url}`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { toolCallId, tool: 'open_tab', success: false, result: `Failed to open tab: ${message}` }
  }
}
