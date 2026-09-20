import type { ToolResult } from '@/lib/types/tools'

/** Function injected into the page to scroll by direction/amount or to a specific element */
function injectedScroll(
  direction: string | null,
  amount: number,
  selector: string | null
): { success: boolean; message: string } {
  // Scroll to a specific element if selector is provided
  if (selector) {
    const el = document.querySelector(selector)
    if (!el) {
      return { success: false, message: `Element not found: ${selector}` }
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return {
      success: true,
      message: `Scrolled to element "${selector}" — page Y: ${Math.round(window.scrollY)}px`,
    }
  }

  // Scroll by direction
  const pixels = direction === 'up' ? -amount : amount
  window.scrollBy({ top: pixels, behavior: 'smooth' })

  return {
    success: true,
    message: `Scrolled ${direction} by ${amount}px — page Y: ${Math.round(window.scrollY + pixels)}px`,
  }
}

/** Scroll the page by direction/amount or to a specific CSS selector */
export async function executeScrollPage(
  toolCallId: string,
  args: Record<string, unknown>,
  tabId: number
): Promise<ToolResult> {
  const direction = (args.direction as string | undefined) ?? null
  const amount = (args.amount as number | undefined) ?? 500
  const selector = (args.selector as string | undefined) ?? null

  // Must have either a selector or a valid direction
  if (!selector && (!direction || (direction !== 'up' && direction !== 'down'))) {
    return {
      toolCallId,
      tool: 'scroll_page',
      success: false,
      result: 'Provide either a "selector" or a "direction" (up/down)',
    }
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: injectedScroll,
      args: [direction, amount, selector],
    })

    const data = results?.[0]?.result as { success: boolean; message: string } | undefined
    if (!data) {
      return { toolCallId, tool: 'scroll_page', success: false, result: 'No result from executeScript' }
    }

    return { toolCallId, tool: 'scroll_page', success: data.success, result: data.message }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { toolCallId, tool: 'scroll_page', success: false, result: `Failed to scroll: ${message}` }
  }
}
