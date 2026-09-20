import { nanoid } from 'nanoid'
import type { ActivityLogEntry } from '@/lib/types/activity'
import { STORAGE_KEYS, MAX_ACTIVITY_ENTRIES } from '@/lib/constants'

/** Read all activity log entries from chrome.storage.local */
async function getEntries(): Promise<ActivityLogEntry[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVITY_LOG)
  const stored = result[STORAGE_KEYS.ACTIVITY_LOG]
  return Array.isArray(stored) ? stored : []
}

/** Log a tool execution to chrome.storage.local (background context) */
export async function logActivity(
  entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>
): Promise<void> {
  const entries = await getEntries()

  entries.push({
    ...entry,
    id: nanoid(),
    timestamp: new Date().toISOString(),
  })

  // Trim oldest entries if over the limit
  const trimmed = entries.length > MAX_ACTIVITY_ENTRIES
    ? entries.slice(-MAX_ACTIVITY_ENTRIES)
    : entries

  await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVITY_LOG]: trimmed })
}
