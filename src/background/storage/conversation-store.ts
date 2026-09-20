import type { Conversation } from '@/lib/types/conversation'
import { STORAGE_KEYS } from '@/lib/constants'

/** Retrieve all conversation metadata (id, title, timestamps) */
export async function listConversations(): Promise<Conversation[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CONVERSATIONS)
  const conversations = result[STORAGE_KEYS.CONVERSATIONS]
  if (!Array.isArray(conversations)) return []
  return conversations
}

/** Retrieve a single conversation by ID */
export async function getConversation(id: string): Promise<Conversation | null> {
  const conversations = await listConversations()
  return conversations.find((c) => c.id === id) ?? null
}

/** Save (create or update) a conversation */
export async function saveConversation(conv: Conversation): Promise<void> {
  const conversations = await listConversations()
  const index = conversations.findIndex((c) => c.id === conv.id)
  if (index >= 0) {
    conversations[index] = conv
  } else {
    conversations.push(conv)
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.CONVERSATIONS]: conversations })
}

/** Delete a conversation by ID */
export async function deleteConversation(id: string): Promise<void> {
  const conversations = await listConversations()
  const filtered = conversations.filter((c) => c.id !== id)
  await chrome.storage.local.set({ [STORAGE_KEYS.CONVERSATIONS]: filtered })
}
