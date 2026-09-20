import type { OpenAITool, ToolResult } from '@/lib/types/tools'
import { executeReadPage } from './read-page'
import { executeGotoUrl } from './goto-url'
import { executeClickSelector } from './click-selector'
import { executeFillInput } from './fill-input'
import { executeScrollPage } from './scroll-page'
import { executeTypeText } from './type-text'
import { executePressKey } from './press-key'
import { executeClickText } from './click-text'

/** Tool handler signature */
type ToolHandler = (toolCallId: string, args: Record<string, unknown>, tabId: number) => Promise<ToolResult>

/** Registry mapping tool names to their handlers */
const toolHandlers: Record<string, ToolHandler> = {
  read_page: (toolCallId, _args, tabId) => executeReadPage(toolCallId, tabId),
  goto_url: (toolCallId, args, tabId) => executeGotoUrl(toolCallId, args, tabId),
  click_selector: (toolCallId, args, tabId) => executeClickSelector(toolCallId, args, tabId),
  fill_input: (toolCallId, args, tabId) => executeFillInput(toolCallId, args, tabId),
  scroll_page: (toolCallId, args, tabId) => executeScrollPage(toolCallId, args, tabId),
  type_text: (toolCallId, args, tabId) => executeTypeText(toolCallId, args, tabId),
  press_key: (toolCallId, args, tabId) => executePressKey(toolCallId, args, tabId),
  click_text: (toolCallId, args, tabId) => executeClickText(toolCallId, args, tabId),
}

/** Execute a tool by name */
export async function executeTool(
  toolCallId: string,
  toolName: string,
  args: Record<string, unknown>,
  tabId: number
): Promise<ToolResult> {
  const handler = toolHandlers[toolName]
  if (!handler) {
    return {
      toolCallId,
      tool: toolName,
      success: false,
      result: `Unknown tool: ${toolName}`,
    }
  }
  return handler(toolCallId, args, tabId)
}

/** OpenAI-compatible tool definitions sent to the LLM */
export const TOOL_DEFINITIONS: OpenAITool[] = [
  {
    type: 'function',
    function: {
      name: 'read_page',
      description: 'Read the text content of the currently active browser tab. Returns the page title, URL, and visible text content. Use this to understand what the user is looking at.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'goto_url',
      description: 'Open a URL in a new browser tab. Use this when the user asks to go to a website or page. Only call this tool ONCE per URL — never call it multiple times for the same request.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The full URL to open (must start with http:// or https://)',
          },
        },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'click_selector',
      description: 'Click or double-click on an element in the current page identified by a CSS selector. The element is scrolled into view before clicking. Use this after reading the page to interact with buttons, links, cells, or other clickable elements. Use double_click: true for Airtable cells, spreadsheet cells, or any element that requires a double-click to edit.',
      parameters: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'A CSS selector that uniquely identifies the element to click (e.g. "#submit-btn", "a[href=\'/login\']", "button.primary")',
          },
          double_click: {
            type: 'boolean',
            description: 'Set to true to double-click the element. Required for editing cells in Airtable, Google Sheets, or similar apps. Default: false.',
          },
        },
        required: ['selector'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fill_input',
      description: 'Fill a text input, textarea, select, or contenteditable element on the current page. Works with standard forms AND rich text editors (Airtable, Google Docs, Notion, etc.).',
      parameters: {
        type: 'object',
        properties: {
          selector: {
            type: 'string',
            description: 'A CSS selector for the element (e.g. "#email", "[contenteditable=true]", ".ProseMirror", "[role=textbox]")',
          },
          value: {
            type: 'string',
            description: 'The text value to fill',
          },
        },
        required: ['selector', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'type_text',
      description: 'Type text into the currently focused element. No selector needed — just types into whatever is active. Use this AFTER clicking or double-clicking a cell/field to enter edit mode. Ideal for Airtable cells, spreadsheets, and rich text editors where finding the right selector is difficult.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text to type into the focused element',
          },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scroll_page',
      description: 'Scroll the current page up or down by a pixel amount, or scroll to a specific element. Use this to reveal content that is not currently visible.',
      parameters: {
        type: 'object',
        properties: {
          direction: {
            type: 'string',
            enum: ['up', 'down'],
            description: 'Scroll direction. Required unless "selector" is provided.',
          },
          amount: {
            type: 'number',
            description: 'Number of pixels to scroll (default: 500)',
          },
          selector: {
            type: 'string',
            description: 'CSS selector of an element to scroll into view. If provided, direction is ignored.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'press_key',
      description: 'Press a keyboard key on the currently focused element. Use this for keyboard navigation in apps like Airtable, Google Sheets, or any web app. Common keys: Tab (move to next cell), Enter (open cell for editing or confirm), Escape (close editor or cancel), ArrowUp/ArrowDown/ArrowLeft/ArrowRight (navigate). Combine with modifiers (ctrl, shift) for shortcuts.',
      parameters: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'The key to press. Examples: "Tab", "Enter", "Escape", "ArrowDown", "ArrowRight", "Backspace", "a", "1". Case-insensitive for special keys.',
          },
          ctrl: {
            type: 'boolean',
            description: 'Hold Ctrl while pressing the key (default: false)',
          },
          shift: {
            type: 'boolean',
            description: 'Hold Shift while pressing the key (default: false)',
          },
          alt: {
            type: 'boolean',
            description: 'Hold Alt while pressing the key (default: false)',
          },
          meta: {
            type: 'boolean',
            description: 'Hold Meta/Cmd while pressing the key (default: false)',
          },
        },
        required: ['key'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'click_text',
      description: 'Find an element by its visible text and click on it or near it. This is the BEST tool for Airtable and complex web apps where CSS selectors are unreliable. Use position="right" to click on the value area next to a field label (e.g. click right of "icebreaker" to activate that field). Use position="on" to click directly on the text. Use double_click for cells that need double-click to edit.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The visible text to search for on the page (case-insensitive). Examples: "icebreaker", "Submit", "Bertrand".',
          },
          position: {
            type: 'string',
            enum: ['on', 'right', 'below'],
            description: 'Where to click relative to the found text. "on" clicks directly on it (default). "right" clicks to the right of it (use this for Airtable field values). "below" clicks below it.',
          },
          offset: {
            type: 'number',
            description: 'Pixel offset from the text element (default: 50 for "right", 20 for "below", 0 for "on").',
          },
          double_click: {
            type: 'boolean',
            description: 'Double-click instead of single click (default: false). Use for Airtable grid cells.',
          },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'click_by_vision',
      description:
        'Last-resort click for when click_selector AND click_text both fail to find the target (e.g. canvas-drawn apps, custom UI with no real DOM elements or text nodes for the target — icon-only buttons, drawn graphics). Looks at a screenshot of the page and clicks the described spot. Slower and only works on paid plans — try click_selector and click_text first, in that order, before this.',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'A plain-language description of what to click, e.g. "the red circular record button in the bottom toolbar" or "the small trash-can icon next to the third row".',
          },
        },
        required: ['description'],
      },
    },
  },
]
