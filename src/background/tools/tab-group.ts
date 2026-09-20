/** Sidekick AI tab group ID — persisted across tool calls within a session */
let sidekickGroupId: number | null = null

/** Add a tab to the Sidekick AI tab group, creating it if needed */
export async function addTabToSidekickGroup(tabId: number): Promise<void> {
  try {
    // Check if the group still exists
    if (sidekickGroupId !== null) {
      try {
        await chrome.tabGroups.get(sidekickGroupId)
      } catch {
        sidekickGroupId = null // Group was closed, reset
      }
    }

    // Create group or add to existing
    if (sidekickGroupId === null) {
      sidekickGroupId = await chrome.tabs.group({ tabIds: [tabId] })
      await chrome.tabGroups.update(sidekickGroupId, {
        title: 'Sidekick AI',
        color: 'green',
        collapsed: false,
      })
    } else {
      await chrome.tabs.group({ tabIds: [tabId], groupId: sidekickGroupId })
    }
  } catch {
    // Tab grouping failed — non-critical, ignore
  }
}

/** Close all tabs in the Sidekick AI tab group */
export async function closeSidekickGroupTabs(): Promise<void> {
  if (sidekickGroupId === null) return
  try {
    await chrome.tabGroups.get(sidekickGroupId)
    // Get all tabs in this group
    const tabs = await chrome.tabs.query({ groupId: sidekickGroupId })
    const tabIds = tabs.map((t) => t.id).filter((id): id is number => id !== undefined)
    if (tabIds.length > 0) {
      await chrome.tabs.remove(tabIds)
    }
  } catch {
    // Group doesn't exist or tabs already closed
  }
  sidekickGroupId = null
}
