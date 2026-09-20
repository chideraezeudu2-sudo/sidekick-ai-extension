import type { ToolResult } from '@/lib/types/tools'
import type { ElementPeekResult } from '@/lib/types/avatar'

/** Peek at an element without clicking it — used to locate it for the avatar and risk check before acting */
function injectedPeek(selector: string): ElementPeekResult {
  const el = document.querySelector(selector)
  if (!el) return { found: false }
  el.scrollIntoView({ behavior: 'instant', block: 'center' })
  const rect = el.getBoundingClientRect()
  const text = (el as HTMLElement).innerText?.slice(0, 200) || el.getAttribute('aria-label') || ''
  return { found: true, rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }, text }
}

/** Locate a click_selector target and return its position/text without clicking it */
export async function peekClickSelector(args: Record<string, unknown>, tabId: number): Promise<ElementPeekResult> {
  const selector = args.selector as string | undefined
  if (!selector) return { found: false }
  try {
    const results = await chrome.scripting.executeScript({ target: { tabId }, func: injectedPeek, args: [selector] })
    return results?.[0]?.result ?? { found: false }
  } catch {
    return { found: false }
  }
}

/** Function injected into the page to find, scroll to, and click/double-click an element */
function injectedClick(selector: string, doubleClick: boolean): { success: boolean; message: string } {
  const el = document.querySelector(selector)
  if (!el) {
    return { success: false, message: `Element not found: ${selector}` }
  }

  el.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const htmlEl = el instanceof HTMLElement ? el : null
  const eventInit: MouseEventInit = { bubbles: true, cancelable: true, view: window }

  if (doubleClick) {
    // Simulate full double-click sequence: mousedown → mouseup → click → mousedown → mouseup → click → dblclick
    el.dispatchEvent(new MouseEvent('mousedown', eventInit))
    el.dispatchEvent(new MouseEvent('mouseup', eventInit))
    el.dispatchEvent(new MouseEvent('click', eventInit))
    el.dispatchEvent(new MouseEvent('mousedown', eventInit))
    el.dispatchEvent(new MouseEvent('mouseup', eventInit))
    el.dispatchEvent(new MouseEvent('click', eventInit))
    el.dispatchEvent(new MouseEvent('dblclick', eventInit))
  } else {
    if (htmlEl) {
      htmlEl.click()
    } else {
      el.dispatchEvent(new MouseEvent('click', eventInit))
    }
  }

  const tag = el.tagName.toLowerCase()
  const text = (el as HTMLElement).innerText?.slice(0, 80) || ''
  const action = doubleClick ? 'Double-clicked' : 'Clicked'
  return { success: true, message: `${action} <${tag}>${text ? ` "${text}"` : ''}` }
}

/** Click or double-click on a DOM element matching the given CSS selector */
export async function executeClickSelector(
  toolCallId: string,
  args: Record<string, unknown>,
  tabId: number
): Promise<ToolResult> {
  const selector = args.selector as string | undefined
  const doubleClick = args.double_click === true

  if (!selector || typeof selector !== 'string') {
    return { toolCallId, tool: 'click_selector', success: false, result: 'Missing required argument: selector' }
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: injectedClick,
      args: [selector, doubleClick],
    })

    const data = results?.[0]?.result as { success: boolean; message: string } | undefined
    if (!data) {
      return { toolCallId, tool: 'click_selector', success: false, result: 'No result from executeScript' }
    }

    return { toolCallId, tool: 'click_selector', success: data.success, result: data.message }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { toolCallId, tool: 'click_selector', success: false, result: `Failed to click: ${message}` }
  }
}
