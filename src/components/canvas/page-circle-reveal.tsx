'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { subscribeWebsiteLoaded, isWebsiteLoaded, setWebsiteLoaded } from '@/lib/loader-bus'
import { subscribePageTransition } from '@/lib/page-transition-bus'
import { resetLenisScroll } from '@/lib/scroll-bus'

/**
 * PageCircleReveal — Signature radial dot-matrix screen transition.
 *
 * 1. On initial page load / refresh (after WebsiteLoader):
 *    Starts covered in black. Small circles appear in the center and ripple outwards
 *    towards the screen boundaries, expanding until they merge and completely dissolve
 *    the overlay, revealing the entire website beneath along with all components.
 *
 * 2. On navigation (clicking Register, Hack Guide, or Back to Home):
 *    Executes a seamless SPA transition without any browser reload or black freeze:
 *    - Expanding black circles ripple outward, merging into 100% black mask (600ms).
 *    - Next.js client-side router (router.push) swaps the route silently underneath.
 *    - Lenis & window scroll immediately reset to top.
 *    - Expanding transparent circular apertures blossom outward, smoothly dissolving
 *      the black overlay and unveiling the new page (750ms).
 */
export function PageCircleReveal() {
  const router = useRouter()
  const pathname = usePathname()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isActive, setIsActive] = useState(true)

  // Keep fresh refs for the animation loop
  const routerRef = useRef(router)
  routerRef.current = router
  const pathnameRef = useRef(pathname)
  pathnameRef.current = pathname

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const SPACING = 20 // Distance between circle centers for dense, detailed dot matrix
    const MAX_RADIUS = SPACING * 0.85 // Generous overlap for seamless 100% mask

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
    const REVEAL_DURATION = 750 // 0.75s graceful dot-matrix reveal
    const EXIT_DURATION = 600   // 0.60s swift dot-matrix mask
    let targetUrl = ''
    let rafId: number | null = null

    // ── Helper: trigger reveal animation ──
    const triggerReveal = () => {
      if (mode === 'reveal') return
      setIsActive(true)
      mode = 'reveal'
      animStart = performance.now()
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(drawFrame)
    }

    // ── Helper: trigger exit transition to targetUrl ──
    const startExitTransition = (url: string) => {
      if (mode !== 'idle') return
      // Normalize target and current paths
      const current = pathnameRef.current || '/'
      if (url === current || (url === '/' && current === '/')) return

      targetUrl = url

      // Prefetch target route bundle during exit animation for instant render
      try {
        routerRef.current.prefetch(url)
      } catch {}

      setIsActive(true)
      mode = 'exit'
      animStart = performance.now()
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(drawFrame)
    }

    // ── Initial State on mount ──
    if (!isWebsiteLoaded() && pathnameRef.current === '/') {
      // First visit to home: solid black overlay behind WebsiteLoader
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.fillStyle = '#000000'
      ctx.fillRect(0, 0, width, height)
    } else {
      if (pathnameRef.current !== '/' && !isWebsiteLoaded()) {
        // Direct land on a subpage without loader: reveal immediately
        setWebsiteLoaded()
        setTimeout(triggerReveal, 50)
      } else {
        // Already loaded: idle and clear
        setIsActive(false)
        ctx.clearRect(0, 0, width, height)
      }
    }

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

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (mode === 'reveal') {
        // Redraw black background then punch transparent circle apertures
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
        ctx.clearRect(0, 0, width, height)
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
          ctx.globalCompositeOperation = 'source-over'
          ctx.fillStyle = '#000000'
          ctx.fillRect(0, 0, width, height)

          // Perform client-side SPA navigation
          const dest = targetUrl
          if (dest) {
            routerRef.current.push(dest)
          }
          resetLenisScroll()

          // Seamless transition into reveal: wait 60ms for React DOM swap, then reveal
          setTimeout(() => {
            mode = 'reveal'
            animStart = performance.now()
            rafId = requestAnimationFrame(drawFrame)
          }, 60)
        }
      }
    }

    // ── 1. Listen for website loader completion (initial load) ──
    let revealTriggered = false
    const unsubLoader = subscribeWebsiteLoaded((loaded) => {
      if (loaded && mode !== 'exit') {
        revealTriggered = true
        setTimeout(triggerReveal, 100)
      }
    })

    // Fallback: If loader is already done or absent
    const fallbackTimer = setTimeout(() => {
      if (!revealTriggered && mode === 'idle' && !isWebsiteLoaded() && pathnameRef.current === '/') {
        setWebsiteLoaded()
        triggerReveal()
      }
    }, 1800)

    // ── 2. Listen for page transitions (e.g. Register click) ──
    const unsubTransition = subscribePageTransition((url: string) => {
      startExitTransition(url)
    })

    // ── 3. Global link interceptor for route links ──
    const onGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (!href) return

      // Ignore in-page hash anchors (e.g. #about, #sponsors, #hero)
      if (href.startsWith('#')) return
      if (href.startsWith('javascript:')) return
      if (target.getAttribute('target') === '_blank') return
      if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) return

      e.preventDefault()
      startExitTransition(href)
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
        isActive ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      aria-hidden="true"
    />
  )
}
