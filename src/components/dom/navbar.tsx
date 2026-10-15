'use client'

import { useLenis } from 'lenis/react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { subscribeWebsiteLoaded, isWebsiteLoaded } from '@/lib/loader-bus'
import { triggerPageTransition } from '@/lib/page-transition-bus'
import { useTheme } from '@/lib/theme-context'

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
]

function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted ? theme === 'dark' : false

  return (
    <button
      type="button"
      onClick={toggleTheme}
      suppressHydrationWarning
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={`relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border transition-all duration-300 cursor-pointer select-none pointer-events-auto ${
        isDark
          ? 'bg-white/10 hover:bg-white/20 border-white/25 text-yellow-300 shadow-[0_0_12px_rgba(253,224,71,0.25)]'
          : 'bg-black/5 hover:bg-black/10 border-black/15 text-slate-800'
      } ${className}`}
    >
      {isDark ? (
        <svg
          viewBox="0 0 24 24"
          width="17"
          height="17"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-300 hover:rotate-45"
        >
          <circle cx="12" cy="12" r="5" fill="currentColor" fillOpacity="0.25" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-300 -rotate-12 hover:rotate-0"
        >
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            fill="currentColor"
            fillOpacity="0.2"
          />
        </svg>
      )}
    </button>
  )
}

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

/** Renders a scramble-revealed word as individual <span>s with optional per-char colors */
function ScrambleWord({
  text,
  trigger,
  className,
  charColors,
}: {
  text: string
  trigger: boolean
  className?: string
  charColors?: (string | undefined)[]
}) {
  const chars = useScrambleReveal(text, trigger)

  return (
    <>
      {chars.map((c, i) => {
        const isLocked = c === text[i]
        const finalColor = charColors?.[i]
        return (
          <span
            key={i}
            className={`inline-block ${className ?? ''}`}
            style={{
              color:
                !isLocked && c !== '\u00A0'
                  ? `hsl(${Math.random() * 360}, 100%, 70%)`
                  : finalColor || undefined,
              transition: 'color 0.05s',
              minWidth: '0.55em',
            }}
          >
            {c}
          </span>
        )
      })}
    </>
  )
}

export function Navbar() {
  const lenis = useLenis()
  const [showNav, setShowNav] = useState(() => isWebsiteLoaded())
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isPastHero, setIsPastHero] = useState(false)
  const [isRadialSection, setIsRadialSection] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const isLightNav = !isRadialSection && !isDark

  useEffect(() => {
    const unsub = subscribeWebsiteLoaded((loaded) => {
      if (loaded) setShowNav(true)
    })
    return unsub
  }, [])

  useEffect(() => {
    let ticking = false
    let arrowEl: HTMLElement | null = null

    const checkScroll = () => {
      ticking = false
      const vh = window.innerHeight || 800
      setIsPastHero(window.scrollY > vh * 0.55)

      if (!arrowEl) arrowEl = document.getElementById('arrow-section')
      if (arrowEl) {
        const aVH = -arrowEl.getBoundingClientRect().top / vh
        setIsRadialSection(aVH >= 2.0 && aVH <= 6.0)
      } else {
        setIsRadialSection(false)
      }
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(checkScroll)
      }
    }

    checkScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToSection = (targetId: string) => {
    setMobileMenuOpen(false)
    if (targetId === 'top' || targetId === 'hero') {
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.2 })
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
      return
    }

    if (targetId === 'arrow-section') {
      const el = document.getElementById('arrow-section')
      if (el) {
        const vh = window.innerHeight || 800
        const arrowTop = el.getBoundingClientRect().top + window.scrollY
        const targetScroll = arrowTop + 2.4 * vh // Lands directly at Phase 01 of Timeline
        if (lenis) {
          lenis.scrollTo(targetScroll, { duration: 1.4 })
        } else {
          window.scrollTo({ top: targetScroll, behavior: 'smooth' })
        }
        return
      }
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
        {/* Left Brand: LNMHACKS with logo colors on L (Pink), N (Cyan), M (Royal Blue) */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault()
            scrollToSection('top')
          }}
          className="relative flex items-center p-1 pointer-events-auto cursor-pointer select-none transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{
            fontFamily: '"Rogient Block", "rogient-block", sans-serif',
            filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.28)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.18))',
          }}
        >
          <span
            className={`font-normal uppercase text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] leading-none tracking-wide flex items-center transition-colors duration-200 ${
              isLightNav ? 'text-black' : 'text-white'
            }`}
            style={{
              fontFamily: '"Rogient Block", "rogient-block", sans-serif',
            }}
          >
            <ScrambleWord
              text="LNMHACKS"
              trigger={showNav}
            />
          </span>
        </a>

        {/* Desktop Navigation Items — Black on light sections, White in radial line or dark mode */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-4 pointer-events-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => scrollToSection(item.target)}
              className={`relative p-2 uppercase cursor-pointer transition-colors duration-200 select-none text-xs sm:text-sm font-bold tracking-wider before:content-[''] before:absolute before:inset-0 before:border-2 before:border-dotted before:border-transparent before:pointer-events-none before:transition-colors before:duration-200 ${
                isLightNav
                  ? 'text-black hover:text-black/70 lg:hover:before:border-black'
                  : 'text-white hover:text-white/80 lg:hover:before:border-white'
              }`}
              style={{
                fontFamily: '"tiktok", sans-serif',
                fontVariationSettings: '"wght" 700, "wdth" 110',
              }}
            >
              <ScrambleWord text={item.label} trigger={showNav} />
            </button>
          ))}

          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* Seamless Register button: invisible on hero, appears seamlessly when scrolled, scrolls back to hero */}
          <div
            className={`transition-all duration-300 ease-out flex items-center ${
              isPastHero
                ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto ml-1'
                : 'opacity-0 -translate-y-2 scale-90 pointer-events-none w-0 overflow-hidden ml-0'
            }`}
          >
            <button
              type="button"
              onClick={() => triggerPageTransition('/register')}
              className="px-4 py-1.5 text-xs font-bold uppercase rounded-full bg-[#1e60ff] hover:bg-[#164ecc] text-white border border-blue-400/40 shadow-md shadow-blue-500/25 active:scale-95 transition-all duration-200 cursor-pointer tracking-wider flex items-center gap-1.5"
              style={{
                fontFamily: '"tiktok", sans-serif',
                fontVariationSettings: '"wght" 700, "wdth" 110',
              }}
            >
              <span>REGISTER</span>
              <span className="text-[11px] leading-none">→</span>
            </button>
          </div>
        </nav>

        {/* Mobile Menu Action Buttons */}
        <div className="md:hidden flex items-center gap-2 pointer-events-auto">
          {/* Mobile Theme Toggle */}
          <ThemeToggle />

          {/* Seamless Mobile Register button */}
          <div
            className={`transition-all duration-300 ease-out ${
              isPastHero
                ? 'opacity-100 scale-100 pointer-events-auto'
                : 'opacity-0 scale-90 pointer-events-none w-0 overflow-hidden'
            }`}
          >
            <button
              type="button"
              onClick={() => triggerPageTransition('/register')}
              className="px-3 py-1.5 text-xs font-bold uppercase rounded-full bg-[#1e60ff] text-white border border-blue-400/40 shadow-sm active:scale-95 transition-transform"
            >
              Register →
            </button>
          </div>

          <button
            type="button"
            aria-label="Toggle Navigation Menu"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className={`p-2 rounded-xl backdrop-blur-md border flex flex-col justify-center items-center w-10 h-10 gap-1.5 active:scale-90 transition-transform ${
              isLightNav
                ? 'bg-black/10 border-black/15 text-black'
                : 'bg-white/10 border-white/20 text-white'
            }`}
          >
            <span
              className={`block w-5 h-0.5 transition-transform duration-300 ${
                isLightNav ? 'bg-black' : 'bg-white'
              } ${mobileMenuOpen ? 'rotate-45 translate-y-2' : ''}`}
            />
            <span
              className={`block w-5 h-0.5 transition-opacity duration-200 ${
                isLightNav ? 'bg-black' : 'bg-white'
              } ${mobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}
            />
            <span
              className={`block w-5 h-0.5 transition-transform duration-300 ${
                isLightNav ? 'bg-black' : 'bg-white'
              } ${mobileMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden pointer-events-auto px-4 pb-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-slate-900/95 dark:bg-black/95 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-2xl flex flex-col gap-2">
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
            {isPastHero && (
              <button
                type="button"
                onClick={() => triggerPageTransition('/register')}
                className="w-full text-left py-3 px-4 rounded-xl text-blue-400 font-bold hover:bg-white/10 text-sm tracking-wider transition-colors duration-150 flex items-center justify-between"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                <span>REGISTER</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

