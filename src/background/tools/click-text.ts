import type { ToolResult } from '@/lib/types/tools'
import type { ElementPeekResult } from '@/lib/types/avatar'

/** Find an element by visible text without clicking it — used to locate it for the avatar and risk check */
function injectedPeekText(text: string): ElementPeekResult {
  const candidates: HTMLElement[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null)
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.textContent && node.textContent.trim().toLowerCase().includes(text.toLowerCase())) {
      const parent = node.parentElement
      if (parent && parent.offsetParent !== null) candidates.push(parent)
    }
  }
  if (candidates.length === 0) return { found: false }
  candidates.sort((a, b) => {
    const ar = a.getBoundingClientRect()
    const br = b.getBoundingClientRect()
    return ar.width * ar.height - br.width * br.height
  })
  const target = candidates[0]
  target.scrollIntoView({ behavior: 'instant', block: 'center' })
  const rect = target.getBoundingClientRect()
  return { found: true, rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }, text: target.innerText?.slice(0, 200) || text }
}

/** Locate a click_text target and return its position/text without clicking it */
export async function peekClickText(args: Record<string, unknown>, tabId: number): Promise<ElementPeekResult> {
  const text = args.text as string | undefined
  if (!text) return { found: false }
  try {
    const results = await chrome.scripting.executeScript({ target: { tabId }, func: injectedPeekText, args: [text] })
    return results?.[0]?.result ?? { found: false }
  } catch {
    return { found: false }
  }
}

/**
 * Injected function that finds an element by visible text and clicks on/near it.
 * This bypasses the need for CSS selectors — works on Airtable, Notion, etc.
 */
function injectedClickText(
  text: string,
  position: 'on' | 'right' | 'below',
  offsetPx: number,
  doubleClick: boolean
): { success: boolean; message: string } {
  // Collect all candidate elements containing the text
  const candidates: HTMLElement[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null)

  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.textContent && node.textContent.trim().toLowerCase().includes(text.toLowerCase())) {
      const parent = node.parentElement
      if (parent && parent.offsetParent !== null) {
        candidates.push(parent)
      }
    }
  }

  if (candidates.length === 0) {
    return { success: false, message: `No visible element found containing text: "${text}"` }
  }

  // Pick the best candidate: smallest element that contains the text (most specific match)
  candidates.sort((a, b) => {
    const aRect = a.getBoundingClientRect()
    const bRect = b.getBoundingClientRect()
    return (aRect.width * aRect.height) - (bRect.width * bRect.height)
  })

  const target = candidates[0]
  const rect = target.getBoundingClientRect()

  // Calculate click coordinates based on position
  let clickX: number
  let clickY: number

  switch (position) {
    case 'right':
      clickX = rect.right + offsetPx
      clickY = rect.top + rect.height / 2
      break
    case 'below':
      clickX = rect.left + rect.width / 2
      clickY = rect.bottom + offsetPx
      break
    case 'on':
    default:
      clickX = rect.left + rect.width / 2
      clickY = rect.top + rect.height / 2
      break
  }

  // Ensure coordinates are within viewport
  clickX = Math.max(0, Math.min(clickX, window.innerWidth - 1))
  clickY = Math.max(0, Math.min(clickY, window.innerHeight - 1))

  // Find the actual element at the click coordinates
  const clickTarget = document.elementFromPoint(clickX, clickY) as HTMLElement | null

  if (!clickTarget) {
    return { success: false, message: `No element found at click coordinates (${Math.round(clickX)}, ${Math.round(clickY)})` }
  }

  // Scroll into view if needed
  clickTarget.scrollIntoView({ behavior: 'instant', block: 'center' })

  // Recalculate after scroll
  const newRect = target.getBoundingClientRect()
  switch (position) {
    case 'right':
      clickX = newRect.right + offsetPx
      clickY = newRect.top + newRect.height / 2
      break
    case 'below':
      clickX = newRect.left + newRect.width / 2
      clickY = newRect.bottom + offsetPx
      break
    default:
      clickX = newRect.left + newRect.width / 2
      clickY = newRect.top + newRect.height / 2
      break
  }

  const finalTarget = document.elementFromPoint(clickX, clickY) as HTMLElement | null
  const el = finalTarget || clickTarget

  // Dispatch full mouse event sequence
  const eventInit: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: clickX,
    clientY: clickY,
  }

  if (doubleClick) {
    el.dispatchEvent(new MouseEvent('mousedown', eventInit))
    el.dispatchEvent(new MouseEvent('mouseup', eventInit))
    el.dispatchEvent(new MouseEvent('click', eventInit))
    el.dispatchEvent(new MouseEvent('mousedown', eventInit))
    el.dispatchEvent(new MouseEvent('mouseup', eventInit))
    el.dispatchEvent(new MouseEvent('click', eventInit))
    el.dispatchEvent(new MouseEvent('dblclick', eventInit))
  } else {
    el.dispatchEvent(new MouseEvent('mouseover', { ...eventInit }))
    el.dispatchEvent(new MouseEvent('mouseenter', { ...eventInit }))
    el.dispatchEvent(new MouseEvent('mousedown', eventInit))
    el.dispatchEvent(new MouseEvent('mouseup', eventInit))
    el.dispatchEvent(new MouseEvent('click', eventInit))
  }

  // Also try focus
  if (typeof el.focus === 'function') el.focus()

  const tag = el.tagName.toLowerCase()
  const elText = el.innerText?.slice(0, 60) || ''
  const action = doubleClick ? 'Double-clicked' : 'Clicked'
  const posLabel = position === 'on' ? 'on' : `${position} of`
  return {
    success: true,
    message: `${action} ${posLabel} "${text}" → hit <${tag}>${elText ? ` "${elText}"` : ''} at (${Math.round(clickX)}, ${Math.round(clickY)})`,
  }
}

/** Find an element by its visible text and click on/near it */
export async function executeClickText(
  toolCallId: string,
  args: Record<string, unknown>,
  tabId: number
): Promise<ToolResult> {
  const text = args.text as string | undefined

  if (!text || typeof text !== 'string') {
    return { toolCallId, tool: 'click_text', success: false, result: 'Missing required argument: text' }
  }

  const position = (args.position as string) || 'on'
  if (!['on', 'right', 'below'].includes(position)) {
    return { toolCallId, tool: 'click_text', success: false, result: 'position must be "on", "right", or "below"' }
  }

  const offset = typeof args.offset === 'number' ? args.offset : (position === 'right' ? 50 : position === 'below' ? 20 : 0)
  const doubleClick = args.double_click === true

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: injectedClickText,
      args: [text, position as 'on' | 'right' | 'below', offset, doubleClick],
    })

    const data = results?.[0]?.result as { success: boolean; message: string } | undefined
    if (!data) {
      return { toolCallId, tool: 'click_text', success: false, result: 'No result from executeScript' }
    }

    return { toolCallId, tool: 'click_text', success: data.success, result: data.message }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { toolCallId, tool: 'click_text', success: false, result: `Failed to click text: ${message}` }
  }
}
