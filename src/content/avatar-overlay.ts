/** The on-page avatar overlay — a small character that flies to elements the agent acts on. */

const ROOT_ID = 'sidekick-avatar-root'
const AVATAR_SIZE = 40

let confirmResolve: ((approved: boolean) => void) | null = null
let activeRequestId: string | null = null

function ensureRoot(): HTMLElement {
  let root = document.getElementById(ROOT_ID)
  if (root) return root

  const style = document.createElement('style')
  style.id = `${ROOT_ID}-style`
  style.textContent = `
    #${ROOT_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      pointer-events: none;
      overflow: visible;
    }
    #${ROOT_ID} .cw-avatar {
      position: absolute;
      width: ${AVATAR_SIZE}px;
      height: ${AVATAR_SIZE}px;
      transform: translate(-50%, -50%);
      transition: left 0.5s cubic-bezier(0.34, 1.2, 0.64, 1), top 0.5s cubic-bezier(0.34, 1.2, 0.64, 1);
      display: flex;
      align-items: center;
      justify-content: center;
      filter: drop-shadow(0 3px 8px rgba(0,0,0,0.45));
      opacity: 0;
      transition-property: left, top, opacity;
    }
    #${ROOT_ID} .cw-avatar img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      animation: cw-bob 1.6s ease-in-out infinite;
    }
    @keyframes cw-bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
    #${ROOT_ID} .cw-avatar.cw-visible { opacity: 1; }
    #${ROOT_ID} .cw-avatar.cw-pulse {
      animation: cw-pulse 1s ease-in-out infinite;
    }
    @keyframes cw-pulse {
      0%, 100% { transform: translate(-50%, -50%) scale(1); }
      50% { transform: translate(-50%, -50%) scale(1.18); }
    }
    #${ROOT_ID} .cw-ring {
      position: absolute;
      border: 2px solid rgba(124, 58, 237, 0.9);
      border-radius: 10px;
      pointer-events: none;
      transition: left 0.5s cubic-bezier(0.34, 1.2, 0.64, 1), top 0.5s cubic-bezier(0.34, 1.2, 0.64, 1), width 0.5s ease, height 0.5s ease, opacity 0.2s ease;
      opacity: 0;
    }
    #${ROOT_ID} .cw-ring.cw-visible { opacity: 1; }
    #${ROOT_ID} .cw-confirm {
      position: absolute;
      pointer-events: auto;
      transform: translate(-50%, 0);
      background: #18181b;
      color: #fff;
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      font: 13px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-width: 240px;
      opacity: 0;
      transition: opacity 0.15s ease;
    }
    #${ROOT_ID} .cw-confirm.cw-visible { opacity: 1; }
    #${ROOT_ID} .cw-confirm-label { font-weight: 600; }
    #${ROOT_ID} .cw-confirm-sub { color: #a1a1aa; font-size: 11px; }
    #${ROOT_ID} .cw-confirm-row { display: flex; gap: 6px; }
    #${ROOT_ID} .cw-btn {
      flex: 1;
      border: none;
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    #${ROOT_ID} .cw-btn-confirm { background: #7c3aed; color: #fff; }
    #${ROOT_ID} .cw-btn-cancel { background: #3f3f46; color: #e4e4e7; }
  `
  document.head.appendChild(style)

  root = document.createElement('div')
  root.id = ROOT_ID

  const avatar = document.createElement('div')
  avatar.className = 'cw-avatar'
  const avatarImg = document.createElement('img')
  avatarImg.src = chrome.runtime.getURL('icons/ghost-avatar.png')
  avatarImg.alt = 'Sidekick AI'
  avatar.appendChild(avatarImg)
  root.appendChild(avatar)

  const ring = document.createElement('div')
  ring.className = 'cw-ring'
  root.appendChild(ring)

  document.body.appendChild(root)
  return root
}

function getEls() {
  const root = ensureRoot()
  return {
    root,
    avatar: root.querySelector('.cw-avatar') as HTMLElement,
    ring: root.querySelector('.cw-ring') as HTMLElement,
  }
}

export function showAvatar(): void {
  const { avatar } = getEls()
  // Start near the top-right corner so the entrance itself reads as "arriving"
  if (!avatar.style.left) {
    avatar.style.left = `${window.innerWidth - 60}px`
    avatar.style.top = `60px`
  }
  requestAnimationFrame(() => avatar.classList.add('cw-visible'))
}

export function hideAvatar(): void {
  const { root, avatar, ring } = getEls()
  avatar.classList.remove('cw-visible', 'cw-pulse')
  ring.classList.remove('cw-visible')
  removeConfirmBubble()
  setTimeout(() => root.remove(), 200)
}

function centerOf(rect: { x: number; y: number; width: number; height: number }) {
  return { cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2 }
}

/** Fly the avatar to hover over the given element rect (viewport coordinates) */
export function flyTo(rect: { x: number; y: number; width: number; height: number }): void {
  const { avatar, ring } = getEls()
  const { cx, cy } = centerOf(rect)
  avatar.classList.add('cw-visible')
  avatar.classList.remove('cw-pulse')
  avatar.style.left = `${cx}px`
  avatar.style.top = `${Math.max(24, cy - rect.height / 2 - 20)}px`

  ring.classList.add('cw-visible')
  ring.style.left = `${rect.x - 4}px`
  ring.style.top = `${rect.y - 4}px`
  ring.style.width = `${rect.width + 8}px`
  ring.style.height = `${rect.height + 8}px`
  setTimeout(() => ring.classList.remove('cw-visible'), 700)
}

function removeConfirmBubble(): void {
  document.getElementById(`${ROOT_ID}-bubble`)?.remove()
}

/**
 * Hover the avatar over the target and show a Confirm/Cancel bubble instead of acting.
 * Resolves true if the user approves, false if they cancel or dismiss.
 */
export function requestConfirm(
  requestId: string,
  rect: { x: number; y: number; width: number; height: number },
  label: string
): Promise<boolean> {
  return new Promise((resolve) => {
    // If a previous confirm is still pending, cancel it — only one action is ever in flight
    if (confirmResolve) confirmResolve(false)

    activeRequestId = requestId
    confirmResolve = resolve

    const { root, avatar, ring } = getEls()
    const { cx, cy } = centerOf(rect)
    avatar.classList.add('cw-visible', 'cw-pulse')
    avatar.style.left = `${cx}px`
    avatar.style.top = `${Math.max(24, cy - rect.height / 2 - 20)}px`

    ring.classList.add('cw-visible')
    ring.style.left = `${rect.x - 4}px`
    ring.style.top = `${rect.y - 4}px`
    ring.style.width = `${rect.width + 8}px`
    ring.style.height = `${rect.height + 8}px`

    removeConfirmBubble()
    const bubble = document.createElement('div')
    bubble.id = `${ROOT_ID}-bubble`
    bubble.className = 'cw-confirm'
    bubble.style.left = `${cx}px`
    bubble.style.top = `${Math.min(window.innerHeight - 90, cy + rect.height / 2 + 16)}px`
    bubble.innerHTML = `
      <div class="cw-confirm-label">Do this?</div>
      <div class="cw-confirm-sub">${escapeHtml(label).slice(0, 90)}</div>
      <div class="cw-confirm-row">
        <button class="cw-btn cw-btn-cancel" data-cw-action="cancel">Not now</button>
        <button class="cw-btn cw-btn-confirm" data-cw-action="confirm">Do it</button>
      </div>
    `
    root.appendChild(bubble)
    requestAnimationFrame(() => bubble.classList.add('cw-visible'))

    const onClick = (e: Event) => {
      const target = e.target as HTMLElement
      const action = target?.getAttribute('data-cw-action')
      if (!action) return
      settle(action === 'confirm')
    }
    bubble.addEventListener('click', onClick)

    function settle(approved: boolean) {
      bubble.removeEventListener('click', onClick)
      avatar.classList.remove('cw-pulse')
      removeConfirmBubble()
      if (confirmResolve && activeRequestId === requestId) {
        confirmResolve(approved)
        confirmResolve = null
        activeRequestId = null
      }
    }
  })
}

/** Cancel any pending confirmation (e.g. the agent was stopped) */
export function cancelPendingConfirm(): void {
  if (confirmResolve) {
    confirmResolve(false)
    confirmResolve = null
    activeRequestId = null
  }
  removeConfirmBubble()
}

function escapeHtml(s: string): string {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}
