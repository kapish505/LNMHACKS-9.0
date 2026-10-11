'use client'

import { useLenis } from 'lenis/react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeWebsiteLoaded } from '@/lib/loader-bus'

// Characters to cycle through while scrambling
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&!'

interface NavItem {
  label: string
  target: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'ABOUT', target: 'about' },
  { label: 'SPONSORS', target: 'sponsors' },
  { label: 'TIMELINE', target: 'arrow-section' },
  { label: 'REGISTER', target: 'sponsors' },
]

const CHAR_WINDOW_MS = 750  // each char scrambles for 750ms
const STAGGER_MS = 150      // each char starts 150ms after the previous

/**
 * Scramble-reveal a string character by character.
 * Each char gets its own CHAR_WINDOW_MS scramble window, staggered by STAGGER_MS.
 */
function useScrambleReveal(text: string, trigger: boolean) {
  const [display, setDisplay] = useState<string[]>(() => Array.from({ length: text.length }, () => '\u00A0'))
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const totalMs = (text.length - 1) * STAGGER_MS + CHAR_WINDOW_MS

  const animate = useCallback((now: number) => {
    if (startRef.current === null) startRef.current = now
    const elapsed = now - startRef.current

    const next = Array.from(text).map((final, i) => {
      const charStart = i * STAGGER_MS          // when this char starts scrambling
      const charLock  = charStart + CHAR_WINDOW_MS // when it locks to final value

      if (elapsed < charStart) return '\u00A0'   // not started yet
      if (elapsed >= charLock) return final       // locked in

      // Actively scrambling: random glyph at rAF speed (~60fps)
      return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
    })

    setDisplay(next)

    if (elapsed < totalMs + 80) {
      rafRef.current = requestAnimationFrame(animate)
    } else {
      setDisplay(Array.from(text))
    }
  }, [text, totalMs])

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

/** Renders a scramble-revealed word as individual <span>s so widths stay stable */
function ScrambleWord({
  text,
  trigger,
  className,
}: {
  text: string
  trigger: boolean
  className?: string
}) {
  const chars = useScrambleReveal(text, trigger)

  return (
    <>
      {chars.map((c, i) => (
        <span
          key={i}
          className={`inline-block ${className ?? ''}`}
          style={{
            color: c !== text[i] && c !== '\u00A0' ? `hsl(${Math.random() * 360}, 100%, 70%)` : undefined,
            transition: 'color 0.05s',
            minWidth: '0.55em',
          }}
        >
          {c}
        </span>
      ))}
    </>
  )
}

export function Navbar() {
  const lenis = useLenis()
  const [showNav, setShowNav] = useState(false)

  useEffect(() => {
    const unsub = subscribeWebsiteLoaded((loaded) => {
      if (loaded) setShowNav(true)
    })
    return unsub
  }, [])

  const scrollToSection = (targetId: string) => {
    if (targetId === 'top') {
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.2 })
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return
    }

    const el = document.getElementById(targetId)
    if (el) {
      if (lenis) {
        lenis.scrollTo(el, { offset: -60, duration: 1.4 })
      } else {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none transition-colors duration-300">
      <div className="flex justify-between items-center px-4 sm:px-8 lg:px-14 py-4 lg:py-6">
        {/* Left Brand: Logo + LNMHACKS */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            scrollToSection('top')
          }}
          className="relative flex items-center gap-2.5 sm:gap-3 p-1.5 sm:p-2 pointer-events-auto cursor-pointer before:content-[''] before:absolute before:inset-0 before:border-2 before:border-dotted before:border-transparent before:pointer-events-none before:transition-colors before:duration-200 lg:hover:before:border-white/70"
          style={{ fontFamily: '"tiktok", sans-serif', fontVariationSettings: '"wght" 700, "wdth" 120' }}
        >
          <img
            src="/logo.png"
            alt="LNMHACKS Logo"
            className="h-12 sm:h-16 md:h-20 w-auto object-contain shrink-0 drop-shadow-md"
          />
          <span className="font-bold uppercase text-lg sm:text-2xl md:text-3xl text-white tracking-tight">
            <ScrambleWord text="LNMHACKS" trigger={showNav} />
          </span>
        </a>

        {/* Right Navigation Items */}
        <nav className="flex items-center gap-1 sm:gap-2 md:gap-4 pointer-events-auto">
          {NAV_ITEMS.map((item, idx) => (
            <button
              key={item.label}
              type="button"
              onClick={() => scrollToSection(item.target)}
              className="relative p-1.5 sm:p-2 uppercase cursor-pointer text-white/80 hover:text-white transition-colors duration-200 select-none text-xs sm:text-sm font-semibold tracking-wide before:content-[''] before:absolute before:inset-0 before:border-2 before:border-dotted before:border-transparent before:pointer-events-none before:transition-colors before:duration-200 lg:hover:before:border-white"
              style={{
                fontFamily: '"tiktok", sans-serif',
                fontVariationSettings: '"wght" 600, "wdth" 110',
              }}
            >
              <ScrambleWord text={item.label} trigger={showNav} />
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
