'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { setWebsiteLoaded, isWebsiteLoaded, subscribeWebsiteLoaded } from '@/lib/loader-bus'

// All mission-critical image assets that must be preloaded & cached before opening the site
const CRITICAL_IMAGES: string[] = [
  // Core branding & mascot
  '/logo.png',
  '/mascots/chibi-directions.webp',
  '/mascots/chibi-reactions.webp',

  // Glimpses (past editions highlights)
  '/glimpses/glimpse-1.jpg',
  '/glimpses/glimpse-2.jpg',
  '/glimpses/glimpse-3.jpg',
  '/glimpses/glimpse-4.jpg',

  // Sponsors & partners (base + hover graphics)
  '/projects/proj-1-base.png',
  '/projects/proj-1-hover.png',
  '/projects/proj-2-base.png',
  '/projects/proj-2-hover.png',
  '/projects/proj-3-base.png',
  '/projects/proj-3-hover.svg',
  '/projects/proj-4-base.png',
  '/projects/proj-4-hover.svg',
  '/projects/proj-5-base.png',
  '/projects/proj-5-hover.svg',
]

const MIN_ANIMATION_MS = 1400 // Smooth aesthetic minimum duration
const HARD_CAP_MS = 8000 // Failsafe timeout to prevent blocking on severed connections

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve()
      return
    }
    const img = new Image()
    const done = () => {
      if ('decode' in img) {
        img.decode().then(resolve).catch(resolve)
      } else {
        resolve()
      }
    }
    img.onload = done
    img.onerror = () => resolve() // Don't block loading if an individual asset fails
    img.src = src
  })
}

export function WebsiteLoader() {
  const alreadyLoaded = useSyncExternalStore(subscribeWebsiteLoaded, isWebsiteLoaded, () => false)
  const [isDone, setIsDone] = useState(false)
  const [isHidden, setIsHidden] = useState(false)

  const barRef = useRef<HTMLDivElement>(null)
  const pctRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (alreadyLoaded) return

    const startTime = performance.now()
    const totalAssets = CRITICAL_IMAGES.length + 1 // +1 for fonts
    let loadedCount = 0
    let fontsDone = false
    let allAssetsLoaded = false
    let settled = false

    const checkComplete = () => {
      if (loadedCount >= totalAssets) {
        allAssetsLoaded = true
      }
    }

    // Preload all critical images in parallel
    CRITICAL_IMAGES.forEach((url) => {
      preloadImage(url).then(() => {
        loadedCount += 1
        checkComplete()
      })
    })

    // Preload web fonts
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready
        .then(() => {
          fontsDone = true
          loadedCount += 1
          checkComplete()
        })
        .catch(() => {
          fontsDone = true
          loadedCount += 1
          checkComplete()
        })
    } else {
      fontsDone = true
      loadedCount += 1
      checkComplete()
    }

    const finish = () => {
      if (settled) return
      settled = true
      if (barRef.current) barRef.current.style.width = '100%'
      if (pctRef.current) pctRef.current.textContent = '100%'
      setIsDone(true)
      setWebsiteLoaded()
      window.setTimeout(() => setIsHidden(true), 500)
    }

    const failsafeTimer = window.setTimeout(finish, HARD_CAP_MS)

    let rafId = 0
    let currentDisplayPercent = 0

    const update = (now: number) => {
      const elapsed = now - startTime
      const timeProgress = Math.min(1, elapsed / MIN_ANIMATION_MS)
      const assetProgress = loadedCount / totalAssets

      // Real percentage cannot hit 100% until all critical images & fonts have actually finished loading
      let targetPercent: number
      if (allAssetsLoaded) {
        targetPercent = 100
      } else {
        // Smoothly approach up to 92% based on actual downloaded assets and time
        targetPercent = Math.min(92, Math.floor(assetProgress * 80 + timeProgress * 15))
      }

      // Smooth step toward target percentage
      if (currentDisplayPercent < targetPercent) {
        const step = Math.max(1, Math.ceil((targetPercent - currentDisplayPercent) * 0.14))
        currentDisplayPercent = Math.min(targetPercent, currentDisplayPercent + step)

        if (barRef.current) barRef.current.style.width = `${currentDisplayPercent}%`
        if (pctRef.current) pctRef.current.textContent = `${String(currentDisplayPercent).padStart(2, '0')}%`
      }

      // Complete only after 100% reached AND all assets have loaded AND minimum duration elapsed
      if (allAssetsLoaded && currentDisplayPercent >= 100 && elapsed >= MIN_ANIMATION_MS) {
        finish()
      } else {
        rafId = requestAnimationFrame(update)
      }
    }

    rafId = requestAnimationFrame(update)

    return () => {
      cancelAnimationFrame(rafId)
      window.clearTimeout(failsafeTimer)
    }
  }, [alreadyLoaded])

  if (alreadyLoaded || isHidden) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md transition-opacity duration-500 ease-out ${
        isDone ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="flex flex-col items-center select-none">
        {/* Glowing Logo */}
        <div className="relative mb-6">
          <img
            src="/logo.png"
            alt="LNMHACKS"
            className="h-16 w-16 object-contain drop-shadow-[0_0_24px_rgba(33,114,255,0.6)] animate-pulse"
          />
        </div>

        {/* Brand Text */}
        <div
          className="text-white font-bold uppercase tracking-tight text-xl mb-6"
          style={{ fontFamily: '"tiktok", sans-serif', fontVariationSettings: '"wght" 700, "wdth" 120' }}
        >
          LNMHACKS
        </div>

        {/* Minimal Progress Line */}
        <div className="w-48 sm:w-60 h-[2px] bg-white/10 rounded-full overflow-hidden relative">
          <div
            ref={barRef}
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-400 via-sky-300 to-pink-400 rounded-full transition-all duration-75 ease-out"
            style={{ width: '0%' }}
          />
        </div>

        {/* Technical Percentage */}
        <div
          ref={pctRef}
          className="mt-3 font-mono text-[11px] text-white/50 tracking-[0.25em] tabular-nums"
        >
          00%
        </div>
      </div>
    </div>
  )
}
