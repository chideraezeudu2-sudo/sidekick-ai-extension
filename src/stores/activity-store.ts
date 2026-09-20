import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { ActivityLogEntry } from '@/lib/types/activity'
import { STORAGE_KEYS, MAX_ACTIVITY_ENTRIES } from '@/lib/constants'

interface ActivityState {
  entries: ActivityLogEntry[]

  /** Load entries from chrome.storage.local */
  loadEntries: () => Promise<void>

  /** Add a new entry (from sidepanel context) */
  addEntry: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => Promise<void>

  /** Clear all entries */
  clearEntries: () => Promise<void>
}

export const useActivityStore = create<ActivityState>((set) => ({
  entries: [],

  loadEntries: async () => {
    const result = await chrome.storage.local.get(STORAGE_KEYS.ACTIVITY_LOG)
    const stored = result[STORAGE_KEYS.ACTIVITY_LOG]
    const entries: ActivityLogEntry[] = Array.isArray(stored) ? stored : []
    set({ entries })
  },

  addEntry: async (entry) => {
    const full: ActivityLogEntry = {
      ...entry,
      id: nanoid(),
      timestamp: new Date().toISOString(),
    }

    set((s) => {
      const updated = [...s.entries, full]
      const trimmed = updated.length > MAX_ACTIVITY_ENTRIES
        ? updated.slice(-MAX_ACTIVITY_ENTRIES)
        : updated
      // Persist asynchronously
      chrome.storage.local.set({ [STORAGE_KEYS.ACTIVITY_LOG]: trimmed })
      return { entries: trimmed }
    })
  },

  clearEntries: async () => {
    await chrome.storage.local.set({ [STORAGE_KEYS.ACTIVITY_LOG]: [] })
    set({ entries: [] })
  },
}))
