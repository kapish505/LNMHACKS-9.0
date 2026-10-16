/**
 * Compute how many viewport-heights the user has scrolled into the arrow section.
 * Uses the DOM element with id="arrow-section" as the reference.
 *
 * Returns a large negative number if the element doesn't exist,
 * so all scroll-range checks naturally evaluate to "not yet".
 *
 * The value is cached per scroll event. Three independent consumers read this
 * every frame (RadialSpeedLines, CursorArrow, HorizontalTimeline); measuring once
 * instead of three times removes two forced layouts per frame. The element
 * reference is cached too, so the common path touches neither
 * getElementById nor getBoundingClientRect.
 */

let cachedVH = -100
let cachedAt = -1
let cachedEl: HTMLElement | null = null
let listening = false

// Safety net for layout shifts that arrive without a scroll or resize event
// (late fonts, images settling). Worst case this costs ~8 measurements/second
// while idle, versus 180/second before.
const MAX_AGE_MS = 120

export function invalidateArrowSectionVH(): void {
  cachedAt = -1
}

function startListening(): void {
  if (listening || typeof window === 'undefined') return
  listening = true
  window.addEventListener('scroll', invalidateArrowSectionVH, { passive: true })
  window.addEventListener('resize', invalidateArrowSectionVH, { passive: true })
  // The arrow section's height is in vh, so anything that changes layout above
  // it moves this value. Fonts are the common late mover.
  if (document.fonts?.ready) {
    document.fonts.ready.then(invalidateArrowSectionVH).catch(() => {})
  }
}

export function getArrowSectionVH(): number {
  if (typeof document === 'undefined') return -100
  startListening()

  const now = performance.now()
  if (cachedAt >= 0 && now - cachedAt < MAX_AGE_MS) return cachedVH

  if (!cachedEl || !cachedEl.isConnected) {
    cachedEl = document.getElementById('arrow-section')
  }

  if (!cachedEl) {
    cachedVH = -100
    cachedAt = now
    return cachedVH
  }

  cachedVH = -cachedEl.getBoundingClientRect().top / window.innerHeight
  cachedAt = now
  return cachedVH
}
