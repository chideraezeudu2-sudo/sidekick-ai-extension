/** Injects a looping scanning wave animation overlay on the page */

const OVERLAY_ID = 'sidekick-ai-scan-overlay'

/** Show the scanning wave animation (loops until removeScanOverlay is called) */
export function showScanOverlay(): void {
  removeScanOverlay()

  const style = document.createElement('style')
  style.id = `${OVERLAY_ID}-style`
  style.textContent = `
    #${OVERLAY_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      pointer-events: none;
      overflow: hidden;
    }
    #${OVERLAY_ID}::before {
      content: '';
      position: absolute;
      left: -10%;
      right: -10%;
      height: 40%;
      background: linear-gradient(
        180deg,
        transparent 0%,
        rgba(76, 175, 80, 0.03) 20%,
        rgba(76, 175, 80, 0.08) 40%,
        rgba(76, 175, 80, 0.12) 50%,
        rgba(76, 175, 80, 0.08) 60%,
        rgba(76, 175, 80, 0.03) 80%,
        transparent 100%
      );
      animation: sidekick-scan-wave 2s ease-in-out infinite;
    }
    @keyframes sidekick-scan-wave {
      0% { top: -40%; }
      100% { top: 110%; }
    }
  `

  const overlay = document.createElement('div')
  overlay.id = OVERLAY_ID

  document.head.appendChild(style)
  document.body.appendChild(overlay)
}

/** Remove the scanning overlay */
export function removeScanOverlay(): void {
  document.getElementById(OVERLAY_ID)?.remove()
  document.getElementById(`${OVERLAY_ID}-style`)?.remove()
}
