'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { triggerPageTransition } from '@/lib/page-transition-bus'
import { useTheme } from '@/lib/theme-context'

interface ComingSoonTemplateProps {
  label: string
  title?: string
  description: string
}

export function ComingSoonTemplate({
  label,
  title = 'COMING SOON',
  description,
}: ComingSoonTemplateProps) {
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      router.prefetch('/')
    } catch {}
  }, [router])

  const isDark = mounted ? theme === 'dark' : false

  return (
    <main className="relative min-h-screen w-full flex flex-col justify-between items-center px-4 sm:px-6 py-6 sm:py-8 bg-[#F0EDE8] dark:bg-[#090d16] text-black dark:text-white transition-colors duration-300 select-none overflow-hidden">
      {/* Top Header: Brand + Theme Toggle */}
      <header className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-between">
        <button
          type="button"
          onClick={() => triggerPageTransition('/')}
          className="flex items-center gap-3 group cursor-pointer text-left focus:outline-none"
        >
          <img
            src="/logo.png"
            alt="LNMHACKS"
            className="h-8 w-8 sm:h-9 sm:w-9 object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span
            className="text-xs sm:text-sm font-bold tracking-wider uppercase text-neutral-900 dark:text-white group-hover:text-[#1e60ff] transition-colors"
            style={{ fontFamily: '"tronica-mono", monospace' }}
          >
            LNMHACKS 9.0
          </span>
        </button>

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          suppressHydrationWarning
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          className={`relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full border transition-all duration-300 cursor-pointer ${
            isDark
              ? 'bg-white/10 hover:bg-white/20 border-white/25 text-yellow-300 shadow-[0_0_12px_rgba(253,224,71,0.25)]'
              : 'bg-black/5 hover:bg-black/10 border-black/15 text-slate-800'
          }`}
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
      </header>

      {/* Centered Main Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 text-center max-w-lg mx-auto my-auto py-12">
        <span
          className="text-[11px] tracking-[0.3em] uppercase text-[rgba(54,54,48,0.55)] dark:text-white/60 font-mono transition-colors duration-300"
          style={{ fontFamily: '"tronica-mono", monospace' }}
        >
          [ {label} ]
        </span>

        <h1
          className="text-3xl xs:text-5xl sm:text-7xl md:text-8xl font-black uppercase tracking-tight text-black dark:text-white transition-colors duration-300"
          style={{
            fontFamily: '"tiktok", sans-serif',
            fontVariationSettings: '"wght" 850, "wdth" 110',
            letterSpacing: '-0.03em',
          }}
        >
          {title}
        </h1>

        <p
          className="text-sm sm:text-base text-[rgba(54,54,48,0.7)] dark:text-white/70 leading-relaxed max-w-md transition-colors duration-300"
          style={{ fontFamily: '"tiktok", sans-serif' }}
        >
          {description}
        </p>

        <button
          type="button"
          onClick={() => triggerPageTransition('/')}
          className="mt-4 px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-sm hover:shadow-lg bg-black text-white hover:bg-[#1e60ff] dark:bg-white dark:text-black dark:hover:bg-[#1e60ff] dark:hover:text-white"
          style={{ fontFamily: '"tiktok", sans-serif' }}
        >
          ← Back to Home
        </button>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto flex items-center justify-center">
        <span
          className="text-[10px] text-[rgba(54,54,48,0.4)] dark:text-white/40 tracking-[0.25em] uppercase font-mono transition-colors duration-300"
          style={{ fontFamily: '"tronica-mono", monospace' }}
        >
          &copy; {new Date().getFullYear()} LNMHACKS 9.0 &middot; THE PREMIER HACKATHON
        </span>
      </footer>
    </main>
  )
}
