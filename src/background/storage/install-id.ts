import { nanoid } from 'nanoid'

const STORAGE_KEY = 'sidekick_install_id'

/** Get this browser's anonymous install ID, creating one on first use */
export async function getOrCreateInstallId(): Promise<string> {
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  if (typeof stored[STORAGE_KEY] === 'string' && stored[STORAGE_KEY]) {
    return stored[STORAGE_KEY]
  }
  const id = nanoid()
  await chrome.storage.local.set({ [STORAGE_KEY]: id })
  return id
}
