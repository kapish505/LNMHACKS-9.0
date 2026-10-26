'use client'

import React, { useEffect, useState } from 'react'
import { subscribeWebsiteLoaded, isWebsiteLoaded } from '@/lib/loader-bus'

export function HeroTopBanner() {
  const [loaded, setLoaded] = useState(() => isWebsiteLoaded())

  useEffect(() => {
    const unsub = subscribeWebsiteLoaded((isLoaded) => {
      if (isLoaded) setLoaded(true)
    })
    return unsub
  }, [])

  return (
    <div className="absolute top-20 sm:top-24 md:top-28 left-0 right-0 z-10 w-full px-4 sm:px-8 lg:px-14 pointer-events-none select-none">
      <div className="w-full grid grid-cols-1 md:grid-cols-3 items-start">
        {/* Left Column: Brand tag & Title (aligned LEFT of Grid 1) */}
        <div
          className={`flex flex-col items-start text-left pl-3 sm:pl-5 lg:pl-6 pr-4 transition-all duration-1000 ease-out ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <span
            className="text-[10px] sm:text-[11px] font-bold tracking-widest text-black uppercase mb-1.5 block"
            style={{ fontFamily: '"tronica-mono", monospace' }}
          />
          <h2
            className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-bold text-black dark:text-white leading-[1.08] tracking-tight transition-colors duration-200"
            style={{
              fontFamily: '"tiktok", sans-serif',
              fontVariationSettings: '"wght" 850, "wdth" 110',
              letterSpacing: '-0.025em',
            }}
          >
            Game Over?
            <br />
            Not Yet.
          </h2>
        </div>

        {/* Middle Column: Monospace Ethos (aligned CENTRE of Grid 2) */}
        <div
          className={`hidden md:flex flex-col items-center text-center justify-start pt-6 lg:pt-8 px-4 transition-all duration-1000 delay-200 ease-out ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <p
            className="text-xs sm:text-[13px] text-black dark:text-white/90 font-mono leading-relaxed tracking-tight transition-colors duration-200"
            style={{ fontFamily: '"tronica-mono", monospace' }}
          >
            Getting bigger every year
            <br />
          </p>
        </div>

        {/* Right Column: Editorial Paragraph (aligned RIGHT of Grid 3) */}
        <div
          className={`hidden md:flex flex-col items-end text-right justify-start pt-6 lg:pt-8 pr-3 sm:pr-5 lg:pr-6 pl-4 ml-auto max-w-sm transition-all duration-1000 delay-400 ease-out ${
            loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <p
            className="text-xs sm:text-[13px] text-black/90 dark:text-white/80 font-mono leading-relaxed transition-colors duration-200"
            style={{ fontFamily: '"tronica-mono", monospace' }}
          >
            LNMHACKS is India's student-run Web3 hackathon & CTF, bringing together ambitious developers, cybersecurity enthusiasts, and emerging founders for 72 hours of building and competition.
          </p>
        </div>
      </div>
    </div>
  )
}
