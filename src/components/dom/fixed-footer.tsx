'use client'

import { useEffect, useRef, useState } from 'react'

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
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    let raf = 0
    let pending = { x: 0, y: 0 }
    const onMove = (e: MouseEvent) => {
      pending = { x: e.clientX, y: e.clientY }
      if (raf) return
      raf = requestAnimationFrame(() => {
        setPos(pending)
        raf = 0
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  const px = String(pos.x).padStart(4, '0')
  const py = String(pos.y).padStart(4, '0')

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 pointer-events-none pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      style={{ zIndex: 60 }}
    >
      <div
        className="flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3 text-[11px] sm:text-[13px]"
        style={{
          fontFamily: '"tronica-mono", "Courier New", monospace',
          letterSpacing: '0.1em',
          color: 'rgba(0,0,0,0.6)',
        }}
      >
        {/* Left: IST time */}
        <span>IST IN {time}</span>

        {/* Center: cursor coordinates (desktop only) */}
        <span className="hidden sm:inline">{px} X {py} Y</span>

        {/* Right: rotating globe */}
        <RotatingGlobe />
      </div>
    </footer>
  )
}
