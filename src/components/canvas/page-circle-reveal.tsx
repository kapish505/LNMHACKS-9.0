'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { subscribeWebsiteLoaded, isWebsiteLoaded, setWebsiteLoaded } from '@/lib/loader-bus'
import { subscribePageTransition } from '@/lib/page-transition-bus'
import { resetLenisScroll } from '@/lib/scroll-bus'

/**
 * PageCircleReveal — Signature radial dot-matrix screen transition.
 *
 * Ultra-high-performance batched dot-matrix screen transition:
 * - Pre-computes circle grid coordinates and distances once on resize (zero sqrt per frame).
 * - Batches all circle apertures into a single path with 1 single GPU draw call per frame.
 * - Caps DPR to 1.25 for lightning-fast fill rates on high-DPI screens.
 * - Seamless SPA navigation via Next.js router.push without browser reload or black freeze.
 * - Clean 150ms buffer during route swap allows React & Three.js to finish mounting
 *   the Home page in the background before the reveal animation begins, ensuring 120fps smoothness.
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
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const SPACING = 30 // Balanced spacing for punchy dot matrix & optimal circle count
    const MAX_RADIUS = SPACING * 0.85 // Guarantees 100% solid overlap across all diagonals

    let width = window.innerWidth
    let height = window.innerHeight
    let dpr = 1
    let midX = width / 2
    let midY = height / 2
    let maxDist = Math.hypot(midX, midY)

    // Flat pre-computed circle cache: [x, y, dist] packed into Float32Array
    let circleCount = 0
    let circleData = new Float32Array(0)

    const resize = () => {
      dpr = Math.min(1.25, window.devicePixelRatio || 1)
      width = window.innerWidth
      height = window.innerHeight
      midX = width / 2
      midY = height / 2
      maxDist = Math.hypot(midX, midY)

      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Rebuild precomputed circle cache
      const cols = Math.ceil(width / SPACING) + 2
      const rows = Math.ceil(height / SPACING) + 2
      circleCount = cols * rows
      circleData = new Float32Array(circleCount * 3)

      let ptr = 0
      for (let r = 0; r < rows; r++) {
        const cy = r * SPACING
        const isOdd = r % 2 === 1
        for (let c = 0; c < cols; c++) {
          const cx = c * SPACING + (isOdd ? SPACING * 0.5 : 0)
          const dist = Math.hypot(cx - midX, cy - midY)
          circleData[ptr++] = cx
          circleData[ptr++] = cy
          circleData[ptr++] = dist
        }
      }
    }

    resize()
    window.addEventListener('resize', resize)

    let mode: 'idle' | 'reveal' | 'exit' = 'idle'
    let animStart = 0
    const REVEAL_DURATION = 700 // 0.70s smooth dot-matrix reveal
    const EXIT_DURATION = 550   // 0.55s swift dot-matrix mask
    let targetUrl = ''
    let rafId: number | null = null
    let swapTimer: ReturnType<typeof setTimeout> | null = null

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

    const TWO_PI = Math.PI * 2
    const INV_DELTA = 1 / 220

    const drawFrame = (now: number) => {
      if (mode === 'idle') return

      const duration = mode === 'reveal' ? REVEAL_DURATION : EXIT_DURATION
      const elapsed = now - animStart
      const rawProgress = Math.min(1, elapsed / duration)
      // Ease out cubic
      const progress = 1 - Math.pow(1 - rawProgress, 3)
      const waveRadius = progress * (maxDist + 350)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (mode === 'reveal') {
        // 1. Solid black background
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, width, height)

        // 2. Carve ALL circular apertures in a SINGLE batched path & SINGLE destination-out pass
        ctx.globalCompositeOperation = 'destination-out'
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()

        const len = circleCount * 3
        for (let i = 0; i < len; i += 3) {
          const dist = circleData[i + 2]
          if (waveRadius > dist) {
            const delta = waveRadius - dist
            const localT = Math.min(1, delta * INV_DELTA)
            const easeProg = localT * localT * (3 - 2 * localT)
            const radius = easeProg * MAX_RADIUS

            if (radius > 0.5) {
              const cx = circleData[i]
              const cy = circleData[i + 1]
              ctx.moveTo(cx + radius, cy)
              ctx.arc(cx, cy, radius, 0, TWO_PI)
            }
          }
        }
        ctx.fill()
      } else if (mode === 'exit') {
        // 1. Clear canvas
        ctx.clearRect(0, 0, width, height)

        // 2. Draw ALL growing black circles in a SINGLE batched path & SINGLE fill pass
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = '#000000'
        ctx.beginPath()

        const len = circleCount * 3
        for (let i = 0; i < len; i += 3) {
          const dist = circleData[i + 2]
          if (waveRadius > dist) {
            const delta = waveRadius - dist
            const localT = Math.min(1, delta * INV_DELTA)
            const easeProg = localT * localT * (3 - 2 * localT)
            const radius = easeProg * MAX_RADIUS

            if (radius > 0.5) {
              const cx = circleData[i]
              const cy = circleData[i + 1]
              ctx.moveTo(cx + radius, cy)
              ctx.arc(cx, cy, radius, 0, TWO_PI)
            }
          }
        }
        ctx.fill()
      }

      if (rawProgress < 1) {
        rafId = requestAnimationFrame(drawFrame)
      } else {
        // Phase finished
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

          // 150ms buffer: screen stays clean solid black while React & Three.js mount
          // the target page in the background, ensuring 100% smooth 120fps reveal
          if (swapTimer) clearTimeout(swapTimer)
          swapTimer = setTimeout(() => {
            mode = 'reveal'
            animStart = performance.now()
            rafId = requestAnimationFrame(drawFrame)
          }, 150)
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
      if (swapTimer) clearTimeout(swapTimer)
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
