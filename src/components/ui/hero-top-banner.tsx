'use client'

import React, { useEffect, useState } from 'react'
import { subscribeWebsiteLoaded, isWebsiteLoaded } from '@/lib/loader-bus'

const LEFT_LINES = [
  'Game Over?',
  'Not Yet.',
]

const MIDDLE_LINES = [
  'Getting bigger every year',
]

const RIGHT_LINES = [
  "LNMHACKS is India's student-run Web3",
  'hackathon & CTF, bringing together',
  'ambitious developers, cybersecurity',
  'enthusiasts, and emerging founders for 72',
  'hours of building and competition.',
]

interface FadeLineProps {
  text: string
  loaded: boolean
  delayMs: number
  className?: string
}

function FadeLine({ text, loaded, delayMs, className = '' }: FadeLineProps) {
  return (
    <span
      className={`block will-change-[opacity,transform] ${className}`}
      style={{
        opacity: loaded ? 1 : 0,
        transform: loaded ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 750ms cubic-bezier(0.16, 1, 0.3, 1), transform 750ms cubic-bezier(0.16, 1, 0.3, 1)',
        transitionDelay: `${delayMs}ms`,
      }}
    >
      {text}
    </span>
  )
}

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
        <div className="flex flex-col items-start text-left pl-3 sm:pl-5 lg:pl-6 pr-4">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.65rem] font-bold text-black dark:text-white leading-[1.08] tracking-tight transition-colors duration-200"
            style={{
              fontFamily: '"tiktok", sans-serif',
              fontVariationSettings: '"wght" 850, "wdth" 110',
              letterSpacing: '-0.025em',
            }}
          >
            {LEFT_LINES.map((line, idx) => (
              <FadeLine
                key={idx}
                text={line}
                loaded={loaded}
                delayMs={150 + idx * 150}
              />
            ))}
          </h2>
        </div>

        {/* Middle Column: Monospace Ethos (aligned CENTRE of Grid 2) */}
        <div className="hidden md:flex flex-col items-center text-center justify-start pt-6 lg:pt-8 px-4">
          <p
            className="text-xs sm:text-[13px] text-black dark:text-white/90 font-mono leading-relaxed tracking-tight transition-colors duration-200"
            style={{ fontFamily: '"tronica-mono", monospace' }}
          >
            {MIDDLE_LINES.map((line, idx) => (
              <FadeLine
                key={idx}
                text={line}
                loaded={loaded}
                delayMs={250 + idx * 100}
              />
            ))}
          </p>
        </div>

        {/* Right Column: Editorial Paragraph (aligned RIGHT of Grid 3) */}
        <div className="hidden md:flex flex-col items-end text-right justify-start pt-6 lg:pt-8 pr-3 sm:pr-5 lg:pr-6 pl-4 ml-auto max-w-sm">
          <p
            className="text-xs sm:text-[13px] text-black/90 dark:text-white/80 font-mono leading-relaxed transition-colors duration-200"
            style={{ fontFamily: '"tronica-mono", monospace' }}
          >
            {RIGHT_LINES.map((line, idx) => (
              <FadeLine
                key={idx}
                text={line}
                loaded={loaded}
                delayMs={200 + idx * 95}
              />
            ))}
          </p>
        </div>
      </div>
    </div>
  )
}
