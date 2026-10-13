'use client'

import { useEffect, useState } from 'react'
import { setWebsiteLoaded, isWebsiteLoaded } from '@/lib/loader-bus'

export function WebsiteLoader() {
  const [alreadyLoaded] = useState(() => isWebsiteLoaded())
  const [progress, setProgress] = useState(0)
  const [isDone, setIsDone] = useState(false)
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    if (alreadyLoaded) return

    const startTime = performance.now()
    const duration = 1400 // 1.4s smooth load

    let rafId = 0
    const update = (now: number) => {
      const elapsed = now - startTime
      const p = Math.min(1, elapsed / duration)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - p, 3)
      const currentPercent = Math.round(eased * 100)
      setProgress(currentPercent)

      if (p < 1) {
        rafId = requestAnimationFrame(update)
      } else {
        // Complete
        setIsDone(true)
        setWebsiteLoaded()
        setTimeout(() => {
          setIsHidden(true)
        }, 500)
      }
    }

    rafId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafId)
  }, [])

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
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-blue-400 via-sky-300 to-pink-400 rounded-full transition-all duration-75 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Technical Percentage */}
        <div className="mt-3 font-mono text-[11px] text-white/50 tracking-[0.25em] tabular-nums">
          {progress.toString().padStart(2, '0')}%
        </div>
      </div>
    </div>
  )
}
