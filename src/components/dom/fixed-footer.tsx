'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/lib/theme-context'

/* Live IST clock */
function useISTTime() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => {
      const t = new Date().toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      setTime(t)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])
  return time
}

/* Wireframe rotating globe SVG */
function RotatingGlobe() {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <span
      style={{
        display: 'inline-block',
        animation: prefersReduced ? 'none' : 'globe-spin 6s linear infinite',
        transformOrigin: 'center center',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="10" />
        <ellipse cx="12" cy="12" rx="4" ry="10" />
        <ellipse cx="12" cy="12" rx="8" ry="10" opacity="0.4" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="12" y1="2" x2="12" y2="22" opacity="0.4" />
      </svg>
    </span>
  )
}

export function FixedFooter() {
  const time = useISTTime()
  const coordsRef = useRef<HTMLSpanElement>(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    let raf = 0
    let pendingX = 0
    let pendingY = 0
    let lastText = ''

    // This used to call setPos() once per animation frame, re-rendering the
    // footer (and re-reading theme context) 60 times a second for the whole
    // time the pointer was moving. The readout is a single text node, so write
    // it directly and keep React out of the pointer path. The JSX children of
    // this span are a constant, so re-renders from the clock never clobber it.
    const flush = () => {
      raf = 0
      const text = `${String(pendingX).padStart(4, '0')} X ${String(pendingY).padStart(4, '0')} Y`
      if (text === lastText) return
      lastText = text
      const el = coordsRef.current
      if (el) el.textContent = text
    }

    const onMove = (e: MouseEvent) => {
      pendingX = e.clientX
      pendingY = e.clientY
      if (raf) return
      raf = requestAnimationFrame(flush)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 pointer-events-none pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      style={{ zIndex: 60 }}
    >
      <div
        className="w-full grid grid-cols-3 items-center px-5 sm:px-8 lg:px-14 py-2 sm:py-3 text-[11px] sm:text-[13px] transition-colors duration-200"
        style={{
          fontFamily: '"tronica-mono", "Courier New", monospace',
          letterSpacing: '0.1em',
          color: isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Left Column: IST time (aligned LEFT of Grid 1) */}
        <div className="flex items-center justify-start pl-3 sm:pl-5 lg:pl-6">
          <span>IST IN {time}</span>
        </div>

        {/* Center Column: Cursor coordinates (aligned CENTRE of Grid 2) */}
        <div className="flex items-center justify-center text-center">
          <span ref={coordsRef} className="hidden sm:inline">0000 X 0000 Y</span>
        </div>

        {/* Right Column: Rotating globe (aligned RIGHT of Grid 3) */}
        <div className="flex items-center justify-end pr-3 sm:pr-5 lg:pr-6">
          <RotatingGlobe />
        </div>
      </div>
    </footer>
  )
}
