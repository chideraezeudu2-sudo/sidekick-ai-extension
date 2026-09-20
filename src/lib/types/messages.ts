/** Chrome message passing types between sidepanel ↔ service worker */

export enum MessageType {
  SEND_MESSAGE = 'SEND_MESSAGE',
  LLM_RESPONSE = 'LLM_RESPONSE',
  LLM_ERROR = 'LLM_ERROR',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  TOOL_CALL_START = 'TOOL_CALL_START',
  TOOL_CALL_END = 'TOOL_CALL_END',
  EXECUTE_TOOL = 'EXECUTE_TOOL',
  TOOL_RESULT = 'TOOL_RESULT',
  STREAM_START = 'STREAM_START',
  STREAM_TOKEN = 'STREAM_TOKEN',
  STREAM_TOOL_CALL = 'STREAM_TOOL_CALL',
  STREAM_TOOL_RESULT = 'STREAM_TOOL_RESULT',
  STREAM_END = 'STREAM_END',
  STREAM_ERROR = 'STREAM_ERROR',
  STOP_AGENT = 'STOP_AGENT',
}

export interface SendMessagePayload {
  conversationId: string
  content: string
}

export interface LLMResponsePayload {
  conversationId: string
  message: {
    id: string
    role: 'assistant'
    content: string
    timestamp: string
    toolCalls?: import('./tools').ToolCall[]
  }
}

export interface LLMErrorPayload {
  conversationId: string
  error: string
}

export interface UpdateSettingsPayload {
  openrouterApiKey?: string
  selectedModel?: string
  mode?: 'assistive' | 'automation'
  avatarEnabled?: boolean
  confirmationPolicy?: 'high_risk_only' | 'always' | 'never'
}

export type ChromeMessage =
  | { type: MessageType.SEND_MESSAGE; payload: SendMessagePayload }
  | { type: MessageType.LLM_RESPONSE; payload: LLMResponsePayload }
  | { type: MessageType.LLM_ERROR; payload: LLMErrorPayload }
  | { type: MessageType.UPDATE_SETTINGS; payload: UpdateSettingsPayload }
  | { type: MessageType.STOP_AGENT }

/** Messages sent over the streaming port (background → sidepanel) */
export interface StreamStartPayload {
  conversationId: string
}

export interface StreamTokenPayload {
  conversationId: string
  token: string
}

export interface StreamToolCallPayload {
  conversationId: string
  message: import('./conversation').Message
}

export interface StreamToolResultPayload {
  conversationId: string
  toolCallId: string
  result: string
  success: boolean
}

export interface StreamEndPayload {
  conversationId: string
  messages: import('./conversation').Message[]
}

export interface StreamErrorPayload {
  conversationId: string
  error: string
}

export type StreamPortMessage =
  | { type: MessageType.STREAM_START; payload: StreamStartPayload }
  | { type: MessageType.STREAM_TOKEN; payload: StreamTokenPayload }
  | { type: MessageType.STREAM_TOOL_CALL; payload: StreamToolCallPayload }
  | { type: MessageType.STREAM_TOOL_RESULT; payload: StreamToolResultPayload }
  | { type: MessageType.STREAM_END; payload: StreamEndPayload }
  | { type: MessageType.STREAM_ERROR; payload: StreamErrorPayload }
