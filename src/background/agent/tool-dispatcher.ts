import type { OpenAIToolCall, ToolResult } from '@/lib/types/tools'
import type { ElementPeekResult } from '@/lib/types/avatar'
import { executeTool } from '@/background/tools/tool-registry'
import { peekClickSelector } from '@/background/tools/click-selector'
import { peekClickText } from '@/background/tools/click-text'
import { peekFillInput } from '@/background/tools/fill-input'
import { locateByVision, clickAtPoint } from '@/background/tools/click-by-vision'
import { classifyActionRisk } from '@/background/agent/risk-classifier'
import { flyAvatarTo, requestAvatarConfirm } from '@/background/agent/avatar-controller'
import { getSettings } from '@/background/storage/settings-store'

/** Tools whose target we can locate before acting, for avatar flight + risk gating */
const GATED_TOOLS = new Set(['click_selector', 'click_text', 'fill_input'])

async function peekTarget(toolName: string, args: Record<string, unknown>, tabId: number): Promise<ElementPeekResult> {
  switch (toolName) {
    case 'click_selector':
      return peekClickSelector(args, tabId)
    case 'click_text':
      return peekClickText(args, tabId)
    case 'fill_input':
      return peekFillInput(args, tabId)
    default:
      return { found: false }
  }
}

/** Dispatch a tool call to the appropriate handler, routing consequential actions through the avatar first */
export async function dispatchToolCall(
  toolCall: OpenAIToolCall,
  tabId: number
): Promise<ToolResult> {
  const toolName = toolCall.function.name
  let args: Record<string, unknown> = {}

  try {
    args = JSON.parse(toolCall.function.arguments || '{}')
  } catch {
    return {
      toolCallId: toolCall.id,
      tool: toolName,
      success: false,
      result: 'Invalid tool arguments (malformed JSON).',
    }
  }

  if (!GATED_TOOLS.has(toolName) && toolName !== 'click_by_vision') {
    return executeTool(toolCall.id, toolName, args, tabId)
  }

  if (toolName === 'click_by_vision') {
    return dispatchClickByVision(toolCall.id, args, tabId)
  }

  const settings = await getSettings()
  const peek = await peekTarget(toolName, args, tabId)

  // If we couldn't locate the element ourselves, fall through to the tool's own
  // (more thorough) matching logic and let it report the failure normally.
  if (!peek.found || !peek.rect) {
    return executeTool(toolCall.id, toolName, args, tabId)
  }

  if (settings.avatarEnabled) {
    await flyAvatarTo(tabId, peek.rect)
  }

  const risk = classifyActionRisk(toolName, peek.text)
  const mustConfirm =
    settings.confirmationPolicy === 'always' ||
    (settings.confirmationPolicy !== 'never' && risk === 'high')

  if (mustConfirm) {
    const label = describeAction(toolName, args, peek.text)
    const approved = settings.avatarEnabled
      ? await requestAvatarConfirm(tabId, peek.rect, label)
      : true // no avatar to show the prompt on — don't silently block automation the user disabled the UI for
    if (!approved) {
      return {
        toolCallId: toolCall.id,
        tool: toolName,
        success: false,
        result: `User declined to confirm this action: ${label}`,
      }
    }
  } else if (settings.avatarEnabled) {
    // Small pause so the flight animation is visible before the click lands
    await new Promise((resolve) => setTimeout(resolve, 450))
  }

  return executeTool(toolCall.id, toolName, args, tabId)
}

/** Handle click_by_vision: the vision call itself doubles as the "peek", then the same avatar/risk gate applies */
async function dispatchClickByVision(toolCallId: string, args: Record<string, unknown>, tabId: number): Promise<ToolResult> {
  const description = (args.description as string) || ''
  const settings = await getSettings()

  const located = await locateByVision(description, tabId)

  if (located.upgradeMessage) {
    return { toolCallId, tool: 'click_by_vision', success: false, result: located.upgradeMessage }
  }

  if (!located.found || located.x === undefined || located.y === undefined) {
    return {
      toolCallId,
      tool: 'click_by_vision',
      success: false,
      result: `Could not visually locate: ${description}`,
    }
  }

  // Treat it as a small point-sized rect for the avatar/confirm bubble
  const rect = { x: located.x - 10, y: located.y - 10, width: 20, height: 20 }

  if (settings.avatarEnabled) {
    await flyAvatarTo(tabId, rect)
  }

  const risk = classifyActionRisk('click_selector', located.label || description)
  const mustConfirm = settings.confirmationPolicy === 'always' || (settings.confirmationPolicy !== 'never' && risk === 'high')

  if (mustConfirm) {
    const label = `Click "${located.label || description}"`
    const approved = settings.avatarEnabled ? await requestAvatarConfirm(tabId, rect, label) : true
    if (!approved) {
      return { toolCallId, tool: 'click_by_vision', success: false, result: `User declined to confirm this action: ${label}` }
    }
  } else if (settings.avatarEnabled) {
    await new Promise((resolve) => setTimeout(resolve, 450))
  }

  const clickResult = await clickAtPoint(tabId, located.x, located.y)
  return { toolCallId, tool: 'click_by_vision', success: clickResult.success, result: clickResult.message }
}

/** Build a short human-readable description of what's about to happen, for the confirm bubble */
function describeAction(toolName: string, args: Record<string, unknown>, targetText?: string): string {
  const target = targetText?.trim() || (args.selector as string) || (args.text as string) || 'this element'
  if (toolName === 'fill_input') {
    return `Fill "${target}"`
  }
  return `Click "${target}"`
}
