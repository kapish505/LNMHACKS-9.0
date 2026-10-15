'use client'

import { useEffect, useRef } from 'react'
import { subscribeLenisScroll, getLenisScrollSnapshot } from '@/lib/scroll-bus'
import { subscribeThemeChange } from '@/lib/theme-context'

/**
 * ScrollCircleTransition — Scroll-driven dot/circle dissolve transition
 * between the Hero section (CloudSky) and the About section (#F0EDE8).
 *
 * At scroll = 0: Completely transparent (zero circles drawn).
 * As the user scrolls down: Small cream (#F0EDE8) circles appear all over
 * the background, growing in size with scroll progress until they merge into
 * solid cream at the bottom edge connecting seamlessly with #about.
 */
export function ScrollCircleTransition() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const SPACING = 22 // Distance between circle centers
    const MAX_RADIUS = SPACING * 0.74 // Overlaps adjacent circles for solid fill at progress = 1

    let width = window.innerWidth
    let height = window.innerHeight
    let dpr = 1

    const resize = () => {
      dpr = Math.min(1.25, window.devicePixelRatio || 1)
      const parent = canvas.parentElement
      width = parent ? parent.clientWidth : window.innerWidth
      height = parent ? parent.clientHeight : window.innerHeight

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    let rafId: number | null = null
    let ticking = false

    const draw = () => {
      ticking = false
      const snap = getLenisScrollSnapshot()
      const scrollY = snap.scrollTop > 0 ? snap.scrollTop : window.scrollY

      // At top of page: 100% clean hero, zero circles drawn
      if (scrollY <= 4) {
        ctx.clearRect(0, 0, width, height)
        return
      }

      // Past hero section: completely solid or off-screen, avoid expensive matrix loops
      if (scrollY > height * 1.35) {
        ctx.clearRect(0, 0, width, height)
        return
      }

      ctx.clearRect(0, 0, width, height)

      // Overall scroll progress through the hero section (0 to ~1.2)
      const scrollFactor = Math.min(1.4, Math.max(0, scrollY / (height * 0.85)))
      if (scrollFactor <= 0.01) return

      const cols = Math.ceil(width / SPACING) + 2
      const rows = Math.ceil(height / SPACING) + 2

      ctx.fillStyle = document.documentElement.classList.contains('dark') ? '#090d16' : '#F0EDE8'
      ctx.beginPath()
      let hasCircles = false

      for (let r = 0; r < rows; r++) {
        const cy = r * SPACING
        const normY = cy / height // 0 at top of hero, 1 at bottom

        for (let c = 0; c < cols; c++) {
          const cx = c * SPACING + (r % 2 === 0 ? 0 : SPACING * 0.5)

          // Subtle deterministic spatial noise for organic halftone dissolve
          const noise = Math.sin(cx * 0.045 + cy * 0.075) * 0.07 + Math.cos(cx * 0.08 - cy * 0.03) * 0.04

          // Bottom of hero transitions first, spreading upwards across the bg
          // At normY = 1, threshold is 0. At normY = 0, threshold is 0.65
          const threshold = (1.0 - normY) * 0.65
          const raw = (scrollFactor - threshold) / (1.0 - threshold * 0.5 + 0.001) + noise
          const progress = Math.max(0, Math.min(1, raw))

          if (progress <= 0.06) continue

          // Non-linear easing: dots start small and expand smoothly
          const easeProg = progress * progress * (3 - 2 * progress)
          const radius = easeProg * MAX_RADIUS

          ctx.moveTo(cx + radius, cy)
          ctx.arc(cx, cy, radius, 0, Math.PI * 2)
          hasCircles = true
        }
      }

      if (hasCircles) {
        ctx.fill()
      }
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        rafId = requestAnimationFrame(draw)
      }
    }

    // Initial check (in case user reloaded midway down page)
    draw()

    const unsubLenis = subscribeLenisScroll(onScroll)
    window.addEventListener('scroll', onScroll, { passive: true })

    const onResize = () => {
      resize()
      draw()
    }
    const unsubTheme = subscribeThemeChange(() => {
      draw()
    })

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      unsubLenis()
      unsubTheme()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', resize)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 4 }}
      aria-hidden="true"
    />
  )
}
