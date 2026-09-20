/** A single entry in the activity log tracking tool executions */
export interface ActivityLogEntry {
  id: string
  conversationId: string
  /** Tool name: 'read_page', 'click_selector', etc. */
  action: string
  /** URL, selector, or description of the tool target */
  target: string
  result: 'success' | 'error'
  /** Result summary or error message */
  details: string
  /** ISO 8601 timestamp */
  timestamp: string
}
