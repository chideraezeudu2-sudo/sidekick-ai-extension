import type { ToolCall } from './tools'

/** Chat message within a conversation */
export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  timestamp: string // ISO 8601
  toolCalls?: ToolCall[]
  toolCallId?: string // for role:'tool' messages — references the ToolCall.id
}

/** A conversation containing messages */
export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: string
  updatedAt: string
}
