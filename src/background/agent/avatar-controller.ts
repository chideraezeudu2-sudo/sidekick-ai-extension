import { nanoid } from 'nanoid'
import type { AvatarConfirmResponse } from '@/lib/types/avatar'

/** Send a message to the content script on a tab, swallowing errors if it isn't loaded (e.g. chrome:// pages) */
async function sendToTab(tabId: number, message: Record<string, unknown>): Promise<unknown> {
  try {
    return await chrome.tabs.sendMessage(tabId, message)
  } catch {
    return null
  }
}

export async function showAvatarOnTab(tabId: number): Promise<void> {
  await sendToTab(tabId, { type: 'AVATAR_SHOW' })
}

export async function hideAvatarOnTab(tabId: number): Promise<void> {
  await sendToTab(tabId, { type: 'AVATAR_HIDE' })
}

export async function flyAvatarTo(
  tabId: number,
  rect: { x: number; y: number; width: number; height: number }
): Promise<void> {
  await sendToTab(tabId, { type: 'AVATAR_FLY_TO', ...rect })
}

/** Ask the user to confirm a high-risk action; resolves false if they decline, dismiss, or the tab is gone */
export async function requestAvatarConfirm(
  tabId: number,
  rect: { x: number; y: number; width: number; height: number },
  label: string
): Promise<boolean> {
  const requestId = nanoid()
  const response = (await sendToTab(tabId, {
    type: 'AVATAR_CONFIRM_REQUEST',
    requestId,
    ...rect,
    label,
  })) as AvatarConfirmResponse | null
  return response?.approved === true
}
