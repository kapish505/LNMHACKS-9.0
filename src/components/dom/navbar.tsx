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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const unsub = subscribeWebsiteLoaded((loaded) => {
      if (loaded) setShowNav(true)
    })
    return unsub
  }, [])

  const scrollToSection = (targetId: string) => {
    setMobileMenuOpen(false)
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
      <div className="flex justify-between items-center px-4 sm:px-8 lg:px-14 py-3 sm:py-4 lg:py-6">
        {/* Left Brand: Logo + LNMHACKS */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            scrollToSection('top')
          }}
          className="relative flex items-center gap-2 sm:gap-3 p-1 pointer-events-auto cursor-pointer select-none"
          style={{ fontFamily: '"tiktok", sans-serif', fontVariationSettings: '"wght" 700, "wdth" 120' }}
        >
          <img
            src="/logo.png"
            alt="LNMHACKS Logo"
            className="h-10 sm:h-14 md:h-18 w-auto object-contain shrink-0 drop-shadow-md"
          />
          <span className="font-bold uppercase text-base sm:text-2xl md:text-3xl text-white tracking-tight drop-shadow-sm">
            <ScrambleWord text="LNMHACKS" trigger={showNav} />
          </span>
        </a>

        {/* Desktop Navigation Items */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-4 pointer-events-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => scrollToSection(item.target)}
              className="relative p-2 uppercase cursor-pointer text-white/85 hover:text-white transition-colors duration-200 select-none text-xs sm:text-sm font-semibold tracking-wide before:content-[''] before:absolute before:inset-0 before:border-2 before:border-dotted before:border-transparent before:pointer-events-none before:transition-colors before:duration-200 lg:hover:before:border-white"
              style={{
                fontFamily: '"tiktok", sans-serif',
                fontVariationSettings: '"wght" 600, "wdth" 110',
              }}
            >
              <ScrambleWord text={item.label} trigger={showNav} />
            </button>
          ))}
        </nav>

        {/* Mobile Menu Toggle Button */}
        <div className="md:hidden flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => scrollToSection('sponsors')}
            className="px-3 py-1.5 text-xs font-bold uppercase rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-sm active:scale-95 transition-transform"
          >
            Register
          </button>
          <button
            type="button"
            aria-label="Toggle Navigation Menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-2 rounded-xl bg-black/25 backdrop-blur-md border border-white/20 text-white flex flex-col justify-center items-center w-10 h-10 gap-1.5 active:scale-90 transition-transform"
          >
            <span
              className={`block w-5 h-0.5 bg-white transition-transform duration-300 ${
                mobileMenuOpen ? 'rotate-45 translate-y-2' : ''
              }`}
            />
            <span
              className={`block w-5 h-0.5 bg-white transition-opacity duration-200 ${
                mobileMenuOpen ? 'opacity-0' : 'opacity-100'
              }`}
            />
            <span
              className={`block w-5 h-0.5 bg-white transition-transform duration-300 ${
                mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden pointer-events-auto px-4 pb-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-2xl flex flex-col gap-2">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => scrollToSection(item.target)}
                className="w-full text-left py-3 px-4 rounded-xl text-white/90 hover:text-white hover:bg-white/10 text-sm font-semibold tracking-wider transition-colors duration-150"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}
