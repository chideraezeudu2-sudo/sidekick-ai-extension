import type { ToolResult } from '@/lib/types/tools'
import type { ElementPeekResult } from '@/lib/types/avatar'

/** Peek at a fill target's position/label without touching it — used for the avatar and risk check */
function injectedPeekFill(selector: string): ElementPeekResult {
  const el = document.querySelector(selector)
  if (!el) return { found: false }
  el.scrollIntoView({ behavior: 'instant', block: 'center' })
  const rect = el.getBoundingClientRect()
  const label =
    el.getAttribute('aria-label') ||
    el.getAttribute('placeholder') ||
    el.getAttribute('name') ||
    el.id ||
    document.querySelector(`label[for="${el.id}"]`)?.textContent ||
    ''
  return { found: true, rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }, text: label.slice(0, 200) }
}

/** Locate a fill_input target and return its position/label without filling it */
export async function peekFillInput(args: Record<string, unknown>, tabId: number): Promise<ElementPeekResult> {
  const selector = args.selector as string | undefined
  if (!selector) return { found: false }
  try {
    const results = await chrome.scripting.executeScript({ target: { tabId }, func: injectedPeekFill, args: [selector] })
    return results?.[0]?.result ?? { found: false }
  } catch {
    return { found: false }
  }
}

/** Check if an element is a contenteditable or rich text editor */
function isEditable(el: Element): boolean {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true
  const htmlEl = el as HTMLElement
  if (htmlEl.contentEditable === 'true') return true
  if (htmlEl.getAttribute('role') === 'textbox') return true
  return false
}

/** Fill a standard input/textarea/select */
function fillStandardInput(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string): void {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) {
    setter.call(el, value)
  } else {
    el.value = value
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.dispatchEvent(new Event('blur', { bubbles: true }))
}

/** Fill a contenteditable element (ProseMirror, Airtable, etc.) */
function fillContentEditable(el: HTMLElement, value: string): void {
  el.focus()
  // Select all existing content
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(el)
  selection?.removeAllRanges()
  selection?.addRange(range)
  // Insert text via execCommand (works with ProseMirror, Draft.js, etc.)
  document.execCommand('insertText', false, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

/** Function injected into the page to fill an element with a value */
function injectedFill(selector: string, value: string): { success: boolean; message: string } {
  const el = document.querySelector(selector)
  if (!el) {
    return { success: false, message: `Element not found: ${selector}` }
  }

  if (!isEditable(el)) {
    return { success: false, message: `Element <${el.tagName.toLowerCase()}> is not editable (not input/textarea/select/contenteditable)` }
  }

  (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
  ;(el as HTMLElement).focus()

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    fillStandardInput(el, value)
  } else {
    fillContentEditable(el as HTMLElement, value)
  }

  const tag = el.tagName.toLowerCase()
  const preview = value.length > 50 ? value.slice(0, 50) + '...' : value
  return { success: true, message: `Filled <${tag}> "${selector}" with "${preview}"` }
}

/** Fill an input/textarea/select/contenteditable element matching the CSS selector */
export async function executeFillInput(
  toolCallId: string,
  args: Record<string, unknown>,
  tabId: number
): Promise<ToolResult> {
  const selector = args.selector as string | undefined
  const value = args.value as string | undefined

  if (!selector || typeof selector !== 'string') {
    return { toolCallId, tool: 'fill_input', success: false, result: 'Missing required argument: selector' }
  }
  if (value === undefined || typeof value !== 'string') {
    return { toolCallId, tool: 'fill_input', success: false, result: 'Missing required argument: value' }
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: injectedFill,
      args: [selector, value],
    })

    const data = results?.[0]?.result as { success: boolean; message: string } | undefined
    if (!data) {
      return { toolCallId, tool: 'fill_input', success: false, result: 'No result from executeScript' }
    }

    return { toolCallId, tool: 'fill_input', success: data.success, result: data.message }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { toolCallId, tool: 'fill_input', success: false, result: `Failed to fill input: ${message}` }
  }
}
