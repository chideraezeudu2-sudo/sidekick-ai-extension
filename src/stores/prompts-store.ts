import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { CustomPrompt } from '@/lib/types/settings'
import { STORAGE_KEYS } from '@/lib/constants'

interface PromptsState {
  prompts: CustomPrompt[]

  /** Load prompts from chrome.storage.local */
  loadPrompts: () => Promise<void>

  /** Add a new prompt */
  addPrompt: (command: string, label: string, content: string) => Promise<void>

  /** Update an existing prompt */
  updatePrompt: (id: string, updates: Partial<Omit<CustomPrompt, 'id'>>) => Promise<void>

  /** Delete a prompt */
  deletePrompt: (id: string) => Promise<void>

  /** Find prompt by slash command name */
  findByCommand: (command: string) => CustomPrompt | undefined
}

/** Persist prompts to chrome.storage.local */
async function persistPrompts(prompts: CustomPrompt[]) {
  await chrome.storage.local.set({ [STORAGE_KEYS.PROMPTS]: prompts })
}

export const usePromptsStore = create<PromptsState>((set, get) => ({
  prompts: [],

  loadPrompts: async () => {
    const result = await chrome.storage.local.get(STORAGE_KEYS.PROMPTS)
    const stored = result[STORAGE_KEYS.PROMPTS]
    const prompts: CustomPrompt[] = Array.isArray(stored) ? stored : []
    set({ prompts })
  },

  addPrompt: async (command: string, label: string, content: string) => {
    const cleaned = command.replace(/[^a-z0-9_-]/gi, '').toLowerCase()
    const prompt: CustomPrompt = { id: nanoid(), command: cleaned, label, content }
    const updated = [...get().prompts, prompt]
    set({ prompts: updated })
    await persistPrompts(updated)
  },

  updatePrompt: async (id: string, updates: Partial<Omit<CustomPrompt, 'id'>>) => {
    if (updates.command) {
      updates.command = updates.command.replace(/[^a-z0-9_-]/gi, '').toLowerCase()
    }
    const updated = get().prompts.map((p) => (p.id === id ? { ...p, ...updates } : p))
    set({ prompts: updated })
    await persistPrompts(updated)
  },

  deletePrompt: async (id: string) => {
    const updated = get().prompts.filter((p) => p.id !== id)
    set({ prompts: updated })
    await persistPrompts(updated)
  },

  findByCommand: (command: string) => {
    return get().prompts.find((p) => p.command === command.toLowerCase())
  },
}))
