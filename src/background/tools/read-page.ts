import { MessageType } from '@/lib/types/messages'
import type { ToolResult } from '@/lib/types/tools'

/** DOM reading function injected directly into the page via chrome.scripting.executeScript */
function injectedReadPage(): string {
  const MAX_LEN = 15000
  const isLI = window.location.hostname.includes('linkedin.com')

  // Extract JSON-LD structured data (LinkedIn puts Person data here)
  function extractJsonLd(): string {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]')
    const parts: string[] = []
    for (const script of scripts) {
      try {
        const data = JSON.parse(script.textContent ?? '')
        const items = Array.isArray(data) ? data : [data]
        for (const item of items) {
          if (item['@type'] === 'Person' || item['@type'] === 'ProfilePage') {
            const p = item['@type'] === 'ProfilePage' ? (item.mainEntity ?? item) : item
            if (p.name) parts.push('Name: ' + p.name)
            if (p.jobTitle) parts.push('Job Title: ' + p.jobTitle)
            if (p.worksFor) {
              const company = typeof p.worksFor === 'string' ? p.worksFor : p.worksFor.name
              if (company) parts.push('Company: ' + company)
            }
            if (p.address) {
              const loc = typeof p.address === 'string' ? p.address : p.address.addressLocality
              if (loc) parts.push('Location: ' + loc)
            }
            if (p.description) parts.push('About: ' + p.description)
            if (p.url) parts.push('Profile URL: ' + p.url)
            if (Array.isArray(p.alumniOf)) {
              const schools = p.alumniOf.map((s: { name?: string }) => s.name).filter(Boolean)
              if (schools.length) parts.push('Education: ' + schools.join(', '))
            }
            if (p.memberOf) {
              const orgs = (Array.isArray(p.memberOf) ? p.memberOf : [p.memberOf])
                .map((o: { name?: string }) => o.name).filter(Boolean)
              if (orgs.length) parts.push('Organizations: ' + orgs.join(', '))
            }
          }
        }
      } catch { /* skip invalid */ }
    }
    return parts.join('\n')
  }

  /** Tags to skip entirely when extracting text */
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'IFRAME', 'CODE', 'LINK'])

  /** Check if an element should be skipped (hidden or noise) */
  function shouldSkip(el: Element): boolean {
    if (SKIP_TAGS.has(el.tagName)) return true
    const htmlEl = el as HTMLElement
    if (htmlEl.hidden) return true
    const style = htmlEl.style
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return true
    const cls = htmlEl.className
    if (typeof cls === 'string' && (cls.includes('visually-hidden') || cls.includes('sr-only') || cls.includes('a11y-text'))) return true
    return false
  }

  /** Extract visible text from an element using TreeWalker (avoids cloning entire DOM) */
  function cleanEl(el: HTMLElement): string {
    const parts: string[] = []
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE && shouldSkip(node as Element)) {
          return NodeFilter.FILTER_REJECT // skip this subtree
        }
        return NodeFilter.FILTER_ACCEPT
      },
    })

    while (walker.nextNode()) {
      if (walker.currentNode.nodeType === Node.TEXT_NODE) {
        const text = walker.currentNode.textContent?.trim()
        if (text) parts.push(text)
      }
    }

    const raw = parts.join(' ')
    return raw
      .replace(/\{[^}]{80,}\}/g, '')    // remove JSON objects
      .replace(/\[[^\]]{200,}\]/g, '')   // remove large arrays
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
  }

  // LinkedIn-specific extraction
  if (isLI) {
    const parts: string[] = []

    // JSON-LD
    const ld = extractJsonLd()
    if (ld) parts.push('--- Structured Profile Data ---\n' + ld)

    // Try main content area with targeted selectors
    const mainEl = document.querySelector('main') || document.querySelector('[role="main"]')
    if (mainEl) {
      const text = cleanEl(mainEl as HTMLElement)
      if (text.length > 50) parts.push('--- Page Content ---\n' + text)
    }

    // If still empty, try broader approach
    if (parts.join('').length < 100) {
      const body = cleanEl(document.body)
      if (body.length > 50) parts.push('--- Page Content ---\n' + body)
    }

    const combined = parts.join('\n\n')
    return combined.length <= MAX_LEN
      ? combined
      : combined.slice(0, MAX_LEN) + '\n\n[...truncated]'
  }

  // Generic site extraction — use TreeWalker instead of cloneNode to avoid freezing
  const cleaned = cleanEl(document.body)
  return cleaned.length <= MAX_LEN
    ? cleaned
    : cleaned.slice(0, MAX_LEN) + '\n\n[...truncated]'
}

/** Read page via chrome.scripting.executeScript (no content script needed) */
async function readPageViaScripting(tabId: number): Promise<string> {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: injectedReadPage,
  })

  if (results && results[0]?.result) {
    return results[0].result as string
  }
  throw new Error('No result from executeScript')
}

/** Execute read_page: tries content script first, falls back to direct injection */
export async function executeReadPage(toolCallId: string, tabId: number): Promise<ToolResult> {
  // Get page meta via scripting API (always works)
  let title = ''
  let url = ''
  let description = ''

  try {
    const metaResults = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => ({
        title: document.title,
        url: window.location.href,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '',
      }),
    })
    if (metaResults?.[0]?.result) {
      const meta = metaResults[0].result as { title: string; url: string; description: string }
      title = meta.title
      url = meta.url
      description = meta.description
    }
  } catch { /* meta extraction failed, continue */ }

  // Strategy 1: try content script message (fastest, handles scan overlay)
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: MessageType.EXECUTE_TOOL,
      args: { tool: 'read_page' },
    })
    if (response?.success) {
      return { toolCallId, tool: 'read_page', success: true, result: response.result }
    }
  } catch {
    // Content script not loaded — fall through to strategy 2
  }

  // Strategy 2: inject reading function directly via chrome.scripting
  try {
    const text = await readPageViaScripting(tabId)
    const header = `Page: ${title}\nURL: ${url}\n${description ? `Description: ${description}\n` : ''}\n---\n\n`
    return {
      toolCallId,
      tool: 'read_page',
      success: true,
      result: header + text,
    }
  } catch {
    // Strategy 2 also failed
  }

  return {
    toolCallId,
    tool: 'read_page',
    success: false,
    result: 'Could not read page. The page may be restricted (e.g. chrome:// pages).',
  }
}
