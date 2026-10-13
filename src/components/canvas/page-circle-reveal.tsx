'use client'

import { useEffect, useRef, useState } from 'react'
import { subscribeWebsiteLoaded } from '@/lib/loader-bus'
import { subscribePageTransition } from '@/lib/page-transition-bus'

/**
 * PageCircleReveal — Signature radial dot-matrix screen transition.
 *
 * 1. On initial page load / refresh (after WebsiteLoader):
 *    Starts covered in black. Small circles appear in the center and ripple outwards
 *    towards the screen boundaries, expanding until they merge and completely dissolve
 *    the overlay, revealing the entire website beneath along with all components.
 *
 * 2. On navigation (clicking Register or any other page link):
 *    Plays the matching transition — small circles emerge from the center, rippling
 *    and expanding outwards until the screen is fully masked, then executes navigation.
 */
export function PageCircleReveal() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const SPACING = 20 // Distance between circle centers for dense, detailed dot matrix
    const MAX_RADIUS = SPACING * 0.78 // Overlaps adjacent circles for seamless 100% mask

    let width = window.innerWidth
    let height = window.innerHeight
    let dpr = 1

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    let mode: 'idle' | 'reveal' | 'exit' = 'idle'
    let animStart = 0
    const REVEAL_DURATION = 1000 // 1.0s majestic reveal
    const EXIT_DURATION = 750    // 0.75s swift page exit
    let targetUrl = ''
    let rafId: number | null = null

    // Draw solid black overlay initially
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)

    const drawFrame = (now: number) => {
      if (mode === 'idle') return

      const duration = mode === 'reveal' ? REVEAL_DURATION : EXIT_DURATION
      const elapsed = now - animStart
      const rawProgress = Math.min(1, elapsed / duration)
      // Ease out cubic
      const progress = 1 - Math.pow(1 - rawProgress, 3)

      const midX = width / 2
      const midY = height / 2
      const maxDist = Math.hypot(midX, midY)
      const waveRadius = progress * (maxDist + 350)

      const cols = Math.ceil(width / SPACING) + 2
      const rows = Math.ceil(height / SPACING) + 2

      if (mode === 'reveal') {
        // Redraw black background then punch transparent circle apertures
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, width, height)

        // Carve transparent apertures
        ctx.globalCompositeOperation = 'destination-out'
        ctx.fillStyle = '#ffffff'

        for (let r = 0; r < rows; r++) {
          const cy = r * SPACING
          const isOdd = r % 2 === 1

          for (let c = 0; c < cols; c++) {
            const cx = c * SPACING + (isOdd ? SPACING * 0.5 : 0)
            const dist = Math.hypot(cx - midX, cy - midY)

            if (waveRadius > dist) {
              const delta = waveRadius - dist
              const localT = Math.min(1, delta / 200)
              const easeProg = localT * localT * (3 - 2 * localT)
              const radius = easeProg * MAX_RADIUS

              if (radius > 0.5) {
                ctx.beginPath()
                ctx.arc(cx, cy, radius, 0, Math.PI * 2)
                ctx.fill()
              }
            }
          }
        }
      } else if (mode === 'exit') {
        // Clear canvas then draw growing black circles from center outwards
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = '#000000'

        for (let r = 0; r < rows; r++) {
          const cy = r * SPACING
          const isOdd = r % 2 === 1

          for (let c = 0; c < cols; c++) {
            const cx = c * SPACING + (isOdd ? SPACING * 0.5 : 0)
            const dist = Math.hypot(cx - midX, cy - midY)

            if (waveRadius > dist) {
              const delta = waveRadius - dist
              const localT = Math.min(1, delta / 200)
              const easeProg = localT * localT * (3 - 2 * localT)
              const radius = easeProg * MAX_RADIUS

              if (radius > 0.5) {
                ctx.beginPath()
                ctx.arc(cx, cy, radius, 0, Math.PI * 2)
                ctx.fill()
              }
            }
          }
        }
      }

      if (rawProgress < 1) {
        rafId = requestAnimationFrame(drawFrame)
      } else {
        // Animation finished
        if (mode === 'reveal') {
          mode = 'idle'
          ctx.clearRect(0, 0, width, height)
          setIsActive(false)
        } else if (mode === 'exit') {
          // Fill completely solid black before navigating
          ctx.fillRect(0, 0, width, height)
          if (targetUrl) {
            window.location.href = targetUrl
          }
        }
      }
    }

    let revealTriggered = false
    const triggerReveal = () => {
      if (revealTriggered) return
      revealTriggered = true
      setIsActive(true)
      mode = 'reveal'
      animStart = performance.now()
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(drawFrame)
    }

    // ── 1. Listen for website loader completion ──
    const unsubLoader = subscribeWebsiteLoaded((loaded) => {
      if (loaded && mode !== 'exit') {
        // Small delay so loader fade connects seamlessly
        setTimeout(triggerReveal, 100)
      }
    })

    // Fallback: If loader is already done or absent
    const fallbackTimer = setTimeout(() => {
      if (!revealTriggered && mode !== 'exit') {
        triggerReveal()
      }
    }, 1600)

    // ── 2. Listen for page transitions (e.g. Register click) ──
    const unsubTransition = subscribePageTransition((url: string) => {
      targetUrl = url
      setIsActive(true)
      mode = 'exit'
      animStart = performance.now()
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(drawFrame)
    })

    // ── 3. Global link interceptor for external/route links ──
    const onGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (!href) return

      // Ignore in-page hash anchors (e.g. #about, #sponsors, #hero)
      if (href.startsWith('#')) return
      if (href.startsWith('javascript:')) return
      if (target.getAttribute('target') === '_blank') return

      e.preventDefault()
      targetUrl = href
      setIsActive(true)
      mode = 'exit'
      animStart = performance.now()
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(drawFrame)
    }

    document.addEventListener('click', onGlobalClick, { capture: true })

    return () => {
      unsubLoader()
      unsubTransition()
      clearTimeout(fallbackTimer)
      document.removeEventListener('click', onGlobalClick, { capture: true })
      window.removeEventListener('resize', resize)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      id="page-circle-reveal"
      className={`fixed inset-0 z-[98] ${
        isActive ? 'pointer-events-auto block' : 'pointer-events-none hidden'
      }`}
      aria-hidden="true"
    />
  )
}
