/** Result of "peeking" at a target element before acting on it */
export interface ElementPeekResult {
  found: boolean
  rect?: { x: number; y: number; width: number; height: number }
  text?: string
}

/** Risk tier assigned to an action before it executes */
export type RiskTier = 'safe' | 'high'

/** Messages sent from the background service worker to the content-script avatar overlay */
export type AvatarMessage =
  | { type: 'AVATAR_SHOW' }
  | { type: 'AVATAR_HIDE' }
  | { type: 'AVATAR_FLY_TO'; x: number; y: number; width: number; height: number }
  | { type: 'AVATAR_CONFIRM_REQUEST'; requestId: string; x: number; y: number; width: number; height: number; label: string }
  | { type: 'AVATAR_CONFIRM_CANCEL'; requestId: string }

/** Response sent back from the content-script avatar overlay when a confirmation resolves */
export interface AvatarConfirmResponse {
  requestId: string
  approved: boolean
}
