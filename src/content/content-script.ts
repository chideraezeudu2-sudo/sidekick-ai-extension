import { handleContentMessage } from './message-bridge'

console.log('[Sidekick AI] Content script loaded')

chrome.runtime.onMessage.addListener(handleContentMessage)
