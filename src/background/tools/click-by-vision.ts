import { BACKEND_VISION_URL } from '@/lib/constants'
import { getOrCreateInstallId } from '@/background/storage/install-id'

export interface VisionLocateResult {
  found: boolean
  x?: number
  y?: number
  label?: string
  /** Set when the plan doesn't include vision fallback — surfaced to the model/user as-is */
  upgradeMessage?: string
}

/** Capture the visible tab as a JPEG data URL */
async function captureTab(tabId: number): Promise<string | null> {
  try {
    const tab = await chrome.tabs.get(tabId)
    return await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 70 })
  } catch (err) {
    console.error('Screenshot capture failed:', err)
    return null
  }
}

/** Ask the backend's vision fallback to locate an element described in plain language */
export async function locateByVision(description: string, tabId: number): Promise<VisionLocateResult> {
  const imageDataUrl = await captureTab(tabId)
  if (!imageDataUrl) return { found: false }

  const installId = await getOrCreateInstallId()

  let response: Response
  try {
    response = await fetch(BACKEND_VISION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Install-Id': installId },
      body: JSON.stringify({ imageDataUrl, description }),
    })
  } catch {
    return { found: false }
  }

  if (response.status === 402) {
    const data = await response.json().catch(() => null)
    return { found: false, upgradeMessage: data?.error?.message || 'Vision fallback requires a Pro+ plan.' }
  }

  if (!response.ok) return { found: false }

  const data = await response.json().catch(() => null)
  if (!data || typeof data.x !== 'number' || typeof data.y !== 'number') return { found: false }
  return { found: !!data.found, x: data.x, y: data.y, label: data.label }
}

/** Injected function: click whatever's at a given viewport coordinate */
function injectedClickAtPoint(x: number, y: number): { success: boolean; message: string } {
  const el = document.elementFromPoint(x, y)
  if (!el) return { success: false, message: `Nothing found at (${x}, ${y})` }

  const eventInit: MouseEventInit = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }
  el.dispatchEvent(new MouseEvent('mousedown', eventInit))
  el.dispatchEvent(new MouseEvent('mouseup', eventInit))
  el.dispatchEvent(new MouseEvent('click', eventInit))
  if (el instanceof HTMLElement) el.click()

  return { success: true, message: `Clicked element at (${x}, ${y})` }
}

/** Click at the given viewport coordinates on a tab (used after a successful vision locate) */
export async function clickAtPoint(tabId: number, x: number, y: number): Promise<{ success: boolean; message: string }> {
  try {
    const results = await chrome.scripting.executeScript({ target: { tabId }, func: injectedClickAtPoint, args: [x, y] })
    return results?.[0]?.result ?? { success: false, message: 'Could not execute click.' }
  } catch (err) {
    return { success: false, message: `Click failed: ${err instanceof Error ? err.message : String(err)}` }
  }
}
