/** Max characters to extract from the page */
const MAX_TEXT_LENGTH = 15000

/** Detect if current page is LinkedIn */
function isLinkedIn(): boolean {
  return window.location.hostname.includes('linkedin.com')
}

/** Extract structured data from JSON-LD scripts (used by LinkedIn for profile data) */
function extractJsonLd(): string {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]')
  const parts: string[] = []

  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? '')
      if (data['@type'] === 'Person') {
        if (data.name) parts.push(`Name: ${data.name}`)
        if (data.jobTitle) parts.push(`Job Title: ${data.jobTitle}`)
        if (data.worksFor?.name) parts.push(`Company: ${data.worksFor.name}`)
        if (data.address?.addressLocality) parts.push(`Location: ${data.address.addressLocality}`)
        if (data.description) parts.push(`About: ${data.description}`)
        if (data.url) parts.push(`Profile URL: ${data.url}`)
        if (Array.isArray(data.alumniOf)) {
          const schools = data.alumniOf.map((s: { name?: string }) => s.name).filter(Boolean)
          if (schools.length) parts.push(`Education: ${schools.join(', ')}`)
        }
      }
    } catch {
      // Ignore invalid JSON-LD
    }
  }

  return parts.length > 0 ? parts.join('\n') : ''
}

/** Extract visible text from LinkedIn profile using targeted selectors */
function readLinkedInProfile(): string {
  const sections: string[] = []

  // 1. JSON-LD structured data (most reliable)
  const jsonLd = extractJsonLd()
  if (jsonLd) sections.push('--- Profile Info ---\n' + jsonLd)

  // 2. Target LinkedIn's main content sections
  const selectors = [
    // Profile header
    '.pv-top-card',
    '.ph5.pb5',
    '[data-view-name="profile-card"]',
    // About section
    '.pv-about-section',
    '#about ~ .display-flex',
    '[data-view-name="profile-component-entity"]',
    // Experience
    '#experience',
    '.experience-section',
    '.pvs-list',
    // Main content area
    'main',
    '[role="main"]',
  ]

  const seen = new Set<string>()

  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector)
    for (const el of elements) {
      const htmlEl = el as HTMLElement
      // Skip hidden elements
      if (htmlEl.offsetParent === null && htmlEl.style.display !== 'fixed') continue

      const text = cleanElementText(htmlEl)
      if (text.length > 20 && !seen.has(text.slice(0, 100))) {
        seen.add(text.slice(0, 100))
        sections.push(text)
      }
    }
  }

  // Fallback: if we got very little, use the generic cleaned approach
  if (sections.join('\n').length < 200) {
    sections.push(readGenericText())
  }

  const combined = sections.join('\n\n')
  if (combined.length <= MAX_TEXT_LENGTH) return combined
  return combined.slice(0, MAX_TEXT_LENGTH) + '\n\n[...content truncated]'
}

/** Clean text from a specific element, removing noise */
function cleanElementText(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement

  // Remove noisy elements
  const removeTags = ['script', 'style', 'noscript', 'svg', 'iframe', 'code', 'img']
  for (const tag of removeTags) {
    clone.querySelectorAll(tag).forEach((e) => e.remove())
  }

  // Remove hidden elements (LinkedIn uses these for JSON state)
  clone.querySelectorAll('[style*="display: none"], [style*="display:none"], [hidden]').forEach((e) => e.remove())
  clone.querySelectorAll('[class*="visually-hidden"], .a11y-text, .sr-only').forEach((e) => e.remove())

  const raw = clone.innerText || clone.textContent || ''
  return raw
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\{[^}]{50,}\}/g, '') // Remove inline JSON objects
    .replace(/\[[^\]]{100,}\]/g, '') // Remove large JSON arrays
    .trim()
}

/** Generic text extraction for non-LinkedIn sites */
function readGenericText(): string {
  const clone = document.body.cloneNode(true) as HTMLElement
  const removeTags = ['script', 'style', 'noscript', 'svg', 'iframe']
  for (const tag of removeTags) {
    clone.querySelectorAll(tag).forEach((el) => el.remove())
  }

  const raw = clone.innerText || clone.textContent || ''
  const cleaned = raw
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()

  if (cleaned.length <= MAX_TEXT_LENGTH) return cleaned
  return cleaned.slice(0, MAX_TEXT_LENGTH) + '\n\n[...content truncated]'
}

/** Extract visible text content from the page, with site-specific handling */
export function readPageText(): string {
  if (isLinkedIn()) {
    return readLinkedInProfile()
  }
  return readGenericText()
}

/** Get page metadata (title, URL, meta description) */
export function readPageMeta(): { title: string; url: string; description: string } {
  const metaDesc = document.querySelector('meta[name="description"]')
  return {
    title: document.title,
    url: window.location.href,
    description: metaDesc?.getAttribute('content') ?? '',
  }
}
