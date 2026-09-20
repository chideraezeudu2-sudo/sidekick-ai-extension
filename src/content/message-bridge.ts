import { MessageType } from '@/lib/types/messages'
import { readPageText, readPageMeta } from './dom-reader'
import { showScanOverlay, removeScanOverlay } from './scan-overlay'
import { showAvatar, hideAvatar, flyTo, requestConfirm, cancelPendingConfirm } from './avatar-overlay'
import type { AvatarMessage } from '@/lib/types/avatar'

const SCAN_STOP = 'SCAN_STOP'

/** Handle incoming messages from the service worker */
export function handleContentMessage(
  message: { type: string; args?: Record<string, unknown> } | AvatarMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): boolean {
  // Avatar overlay messages
  if (message.type.startsWith('AVATAR_')) {
    const avatarMessage = message as AvatarMessage
    switch (avatarMessage.type) {
      case 'AVATAR_SHOW':
        showAvatar()
        sendResponse({ ok: true })
        return true
      case 'AVATAR_HIDE':
        hideAvatar()
        sendResponse({ ok: true })
        return true
      case 'AVATAR_FLY_TO':
        flyTo({ x: avatarMessage.x, y: avatarMessage.y, width: avatarMessage.width, height: avatarMessage.height })
        sendResponse({ ok: true })
        return true
      case 'AVATAR_CONFIRM_REQUEST':
        requestConfirm(
          avatarMessage.requestId,
          { x: avatarMessage.x, y: avatarMessage.y, width: avatarMessage.width, height: avatarMessage.height },
          avatarMessage.label
        ).then((approved) => sendResponse({ requestId: avatarMessage.requestId, approved }))
        return true // keep the message channel open for the async response
      case 'AVATAR_CONFIRM_CANCEL':
        cancelPendingConfirm()
        sendResponse({ ok: true })
        return true
    }
  }

  // Stop scan animation
  if (message.type === SCAN_STOP) {
    removeScanOverlay()
    sendResponse({ ok: true })
    return true
  }

  if (message.type !== MessageType.EXECUTE_TOOL) return false

  const toolName = message.args?.tool as string | undefined

  switch (toolName) {
    case 'read_page': {
      showScanOverlay()
      const meta = readPageMeta()
      const text = readPageText()
      const result = `**Page:** ${meta.title}\n**URL:** ${meta.url}\n${meta.description ? `**Description:** ${meta.description}\n` : ''}\n---\n\n${text}`
      sendResponse({ success: true, result })
      return true
    }

    default:
      sendResponse({ success: false, result: `Unknown tool: ${toolName}` })
      return true
  }
}
