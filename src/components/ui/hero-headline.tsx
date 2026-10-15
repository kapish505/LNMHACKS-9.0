'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeWebsiteLoaded, isWebsiteLoaded } from '@/lib/loader-bus'

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&!'
const CHAR_WINDOW_MS = 650
const STAGGER_MS = 90

function useScrambleLine(text: string, trigger: boolean, delayMs = 0) {
  const [display, setDisplay] = useState<string[]>(() =>
    Array.from(text).map((c) => (c === ' ' ? ' ' : '\u00A0'))
  )
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const totalMs = (text.length - 1) * STAGGER_MS + CHAR_WINDOW_MS + delayMs

  const animate = useCallback((now: number) => {
    if (startRef.current === null) startRef.current = now
    const elapsed = now - startRef.current

    if (elapsed < delayMs) {
      rafRef.current = requestAnimationFrame(animate)
      return
    }

    const effectiveElapsed = elapsed - delayMs

    const next = Array.from(text).map((final, i) => {
      if (final === ' ') return ' '

      const charStart = i * STAGGER_MS
      const charLock = charStart + CHAR_WINDOW_MS

      if (effectiveElapsed < charStart) return '\u00A0'
      if (effectiveElapsed >= charLock) return final

      return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
    })

    setDisplay(next)

    if (elapsed < totalMs + 50) {
      rafRef.current = requestAnimationFrame(animate)
    } else {
      setDisplay(Array.from(text))
    }
  }, [text, delayMs, totalMs])

  useEffect(() => {
    if (!trigger) return
    startRef.current = null
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [trigger, animate])

  return display
}

function ScrambleRow({
  text,
  trigger,
  delayMs = 0,
}: {
  text: string
  trigger: boolean
  delayMs?: number
}) {
  const chars = useScrambleLine(text, trigger, delayMs)

  return (
    <span className="block whitespace-nowrap">
      {chars.map((c, i) => (
        <span
          key={i}
          className="inline-block"
          style={{
            minWidth: c === ' ' ? '0.35em' : undefined,
          }}
        >
          {c === ' ' ? '\u00A0' : c}
        </span>
      ))}
    </span>
  )
}

export function HeroHeadline() {
  const [loaded, setLoaded] = useState(() => isWebsiteLoaded())

  useEffect(() => {
    const unsub = subscribeWebsiteLoaded((isLoaded) => {
      if (isLoaded) setLoaded(true)
    })
    return unsub
  }, [])

  return (
    <div
      className="absolute top-[calc(66.666667vh+1rem)] sm:top-[calc(66.666667vh+1.5rem)] left-4 sm:left-8 lg:left-14 pl-3 sm:pl-5 lg:pl-6 z-10 pointer-events-none select-none"
    >
      <h1
        className="font-extrabold tracking-tight uppercase text-black dark:text-white transition-colors duration-200"
        style={{
          fontFamily: '"tiktok", sans-serif',
          fontVariationSettings: '"wght" 800, "wdth" 105',
          fontSize: 'clamp(2.2rem, 5.2vw, 4.6rem)',
          lineHeight: 1.02,
          letterSpacing: '-0.025em',
        }}
      >
        <ScrambleRow text="72 HOURS OF" trigger={loaded} delayMs={150} />
        <ScrambleRow text="PURE" trigger={loaded} delayMs={500} />
        <ScrambleRow text="INNOVATION" trigger={loaded} delayMs={800} />
      </h1>
    </div>
  )
}
