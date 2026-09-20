import { handleMessage } from './message-handler'
import { handlePortConnection } from './stream-handler'

// Listen for messages from sidepanel / content scripts (settings, etc.)
chrome.runtime.onMessage.addListener(handleMessage)

// Listen for port connections for streaming LLM responses
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidekick-ai-stream') {
    handlePortConnection(port)
  }
})

// Open side panel automatically when the extension icon is clicked
// setPanelBehavior is more reliable than action.onClicked + sidePanel.open()
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
  // Fallback for older Chrome versions
})

console.log('[Sidekick AI] Service worker started')
