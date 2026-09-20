import type { ToolResult } from '@/lib/types/tools'

/** Map of special key names to their KeyboardEvent key values */
const KEY_MAP: Record<string, string> = {
  enter: 'Enter',
  tab: 'Tab',
  escape: 'Escape',
  esc: 'Escape',
  backspace: 'Backspace',
  delete: 'Delete',
  arrowup: 'ArrowUp',
  arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft',
  arrowright: 'ArrowRight',
  space: ' ',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
}

/** Function injected into the page to dispatch keyboard events */
function injectedPressKey(
  key: string,
  modifiers: { ctrl: boolean; shift: boolean; alt: boolean; meta: boolean }
): { success: boolean; message: string } {
  const target = document.activeElement || document.body

  const eventInit: KeyboardEventInit = {
    key,
    code: key.length === 1 ? `Key${key.toUpperCase()}` : key,
    bubbles: true,
    cancelable: true,
    ctrlKey: modifiers.ctrl,
    shiftKey: modifiers.shift,
    altKey: modifiers.alt,
    metaKey: modifiers.meta,
  }

  target.dispatchEvent(new KeyboardEvent('keydown', eventInit))
  target.dispatchEvent(new KeyboardEvent('keypress', eventInit))
  target.dispatchEvent(new KeyboardEvent('keyup', eventInit))

  const mod = [
    modifiers.ctrl && 'Ctrl',
    modifiers.shift && 'Shift',
    modifiers.alt && 'Alt',
    modifiers.meta && 'Meta',
  ].filter(Boolean).join('+')

  const label = mod ? `${mod}+${key}` : key
  const tag = (target as HTMLElement).tagName?.toLowerCase() ?? 'unknown'
  return { success: true, message: `Pressed "${label}" on <${tag}>` }
}

/** Press a keyboard key on the currently focused element */
export async function executePressKey(
  toolCallId: string,
  args: Record<string, unknown>,
  tabId: number
): Promise<ToolResult> {
  const rawKey = args.key as string | undefined

  if (!rawKey || typeof rawKey !== 'string') {
    return { toolCallId, tool: 'press_key', success: false, result: 'Missing required argument: key' }
  }

  // Resolve the key name
  const key = KEY_MAP[rawKey.toLowerCase()] ?? rawKey

  const modifiers = {
    ctrl: args.ctrl === true,
    shift: args.shift === true,
    alt: args.alt === true,
    meta: args.meta === true,
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: injectedPressKey,
      args: [key, modifiers],
    })

    const data = results?.[0]?.result as { success: boolean; message: string } | undefined
    if (!data) {
      return { toolCallId, tool: 'press_key', success: false, result: 'No result from executeScript' }
    }

    return { toolCallId, tool: 'press_key', success: data.success, result: data.message }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { toolCallId, tool: 'press_key', success: false, result: `Failed to press key: ${message}` }
  }
}
