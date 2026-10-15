'use client'

import { useEffect, useRef, useState } from 'react'
import { setWebsiteLoaded, isWebsiteLoaded } from '@/lib/loader-bus'

const MIN_DURATION = 1400 // 1.4s smooth load — unchanged, now a floor not a timer
const HARD_CAP = 5000 // never hold the page hostage if a font request stalls

export function WebsiteLoader() {
  const [alreadyLoaded] = useState(() => isWebsiteLoaded())
  const [isDone, setIsDone] = useState(false)
  const [isHidden, setIsHidden] = useState(false)

  const barRef = useRef<HTMLDivElement>(null)
  const pctRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (alreadyLoaded) return

    const startTime = performance.now()

    // Fonts are the one late-arriving resource that causes a visible reflow,
    // and VaporCountdown rasterises its glyph atlas off document.fonts.ready —
    // if the loader lifts first, the user lands on a page that is still
    // relaying out. The 1.4s animation is now a minimum rather than the whole
    // story, so in the normal case (fonts resolve well inside 1.4s) the loader
    // behaves exactly as before.
    let fontsReady = false
    let settled = false

    const finish = () => {
      if (settled) return
      settled = true
      if (barRef.current) barRef.current.style.width = '100%'
      if (pctRef.current) pctRef.current.textContent = '100%'
      setIsDone(true)
      setWebsiteLoaded()
      window.setTimeout(() => setIsHidden(true), 500)
    }

    if (typeof document !== 'undefined' && document.fonts?.ready) {
      document.fonts.ready.then(() => { fontsReady = true }).catch(() => { fontsReady = true })
    } else {
      fontsReady = true
    }

    const capTimer = window.setTimeout(finish, HARD_CAP)

    let rafId = 0
    // Written straight to the DOM. setProgress() used to run once per frame,
    // so the loader alone cost ~84 React renders during the exact window when
    // the WebGL contexts are compiling and the textures are decoding.
    let lastPercent = -1

    const update = (now: number) => {
      const elapsed = now - startTime
      const p = Math.min(1, elapsed / MIN_DURATION)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - p, 3)
      const currentPercent = Math.round(eased * 100)

      if (currentPercent !== lastPercent) {
        lastPercent = currentPercent
        if (barRef.current) barRef.current.style.width = `${currentPercent}%`
        if (pctRef.current) pctRef.current.textContent = `${String(currentPercent).padStart(2, '0')}%`
      }

      if (p < 1 || !fontsReady) {
        rafId = requestAnimationFrame(update)
      } else {
        finish()
      }
    }

    rafId = requestAnimationFrame(update)
    return () => {
      cancelAnimationFrame(rafId)
      window.clearTimeout(capTimer)
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
