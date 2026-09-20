import type { ToolResult } from '@/lib/types/tools'
import { addTabToSidekickGroup } from './tab-group'

/** Validate that a string is a proper HTTP(S) URL */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/** Navigate the active tab to a given URL via chrome.tabs.update */
export async function executeGotoUrl(
  toolCallId: string,
  args: Record<string, unknown>,
  _tabId: number
): Promise<ToolResult> {
  const url = args.url as string | undefined

  if (!url || typeof url !== 'string') {
    return { toolCallId, tool: 'goto_url', success: false, result: 'Missing required argument: url' }
  }

  if (!isValidUrl(url)) {
    return { toolCallId, tool: 'goto_url', success: false, result: `Invalid URL: ${url}. Must be a valid http or https URL.` }
  }

  try {
    const newTab = await chrome.tabs.create({ url })
    if (newTab.id) {
      await addTabToSidekickGroup(newTab.id)
    }
    return {
      toolCallId,
      tool: 'goto_url',
      success: true,
      result: `Opened ${url} in new tab (tab ID: ${newTab.id})`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { toolCallId, tool: 'goto_url', success: false, result: `Failed to navigate: ${message}` }
  }
}
