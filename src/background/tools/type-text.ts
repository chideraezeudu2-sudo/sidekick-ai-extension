import type { ToolResult } from '@/lib/types/tools'

/** Function injected to type text into the currently focused/active element */
function injectedTypeText(value: string): { success: boolean; message: string } {
  // Find the active editable element
  let target = document.activeElement as HTMLElement | null

  // If no focused element, try to find the first visible contenteditable or textbox
  if (!target || target === document.body) {
    target = document.querySelector<HTMLElement>(
      '[contenteditable="true"]:not([aria-hidden="true"]), [role="textbox"], .ProseMirror, .ql-editor'
    )
  }

  if (!target) {
    return { success: false, message: 'No active editable element found. Click or double-click a cell/field first.' }
  }

  target.focus()

  // For standard inputs
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const proto = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) setter.call(target, value)
    else target.value = value
    target.dispatchEvent(new Event('input', { bubbles: true }))
    target.dispatchEvent(new Event('change', { bubbles: true }))
    const preview = value.length > 50 ? value.slice(0, 50) + '...' : value
    return { success: true, message: `Typed into <${target.tagName.toLowerCase()}>: "${preview}"` }
  }

  // For contenteditable / rich text editors (ProseMirror, Airtable, etc.)
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(target)
  selection?.removeAllRanges()
  selection?.addRange(range)

  // execCommand works with most rich text editors
  const inserted = document.execCommand('insertText', false, value)

  if (!inserted) {
    // Fallback: set textContent directly
    target.textContent = value
    target.dispatchEvent(new Event('input', { bubbles: true }))
  }

  const preview = value.length > 50 ? value.slice(0, 50) + '...' : value
  return { success: true, message: `Typed into <${target.tagName.toLowerCase()}>: "${preview}"` }
}

/** Type text into the currently focused element (no selector needed) */
export async function executeTypeText(
  toolCallId: string,
  args: Record<string, unknown>,
  tabId: number
): Promise<ToolResult> {
  const value = args.text as string | undefined

  if (value === undefined || typeof value !== 'string') {
    return { toolCallId, tool: 'type_text', success: false, result: 'Missing required argument: text' }
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: injectedTypeText,
      args: [value],
    })

    const data = results?.[0]?.result as { success: boolean; message: string } | undefined
    if (!data) {
      return { toolCallId, tool: 'type_text', success: false, result: 'No result from executeScript' }
    }

    return { toolCallId, tool: 'type_text', success: data.success, result: data.message }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { toolCallId, tool: 'type_text', success: false, result: `Failed to type text: ${message}` }
  }
}
