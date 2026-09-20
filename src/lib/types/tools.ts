/** Definition of a tool available to the agent */
export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
}

/** A tool call requested by the LLM */
export interface ToolCall {
  id: string
  tool: string
  args: Record<string, unknown>
  status: 'pending' | 'running' | 'success' | 'error'
  result?: string
  startedAt?: string
  completedAt?: string
}

/** Result returned after executing a tool */
export interface ToolResult {
  toolCallId: string
  tool: string
  success: boolean
  result: string
}

/** OpenAI-compatible tool definition for the API */
export interface OpenAITool {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

/** OpenAI-compatible tool call from API response */
export interface OpenAIToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string // JSON string
  }
}
