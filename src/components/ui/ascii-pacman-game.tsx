'use client'

import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/lib/theme-context'

/**
 * ASCII Pac-Man Game Animation
 * A scroll-triggered ASCII art Pac-Man chase that runs across the viewport,
 * eating dots, encountering ghosts, and ending with "GAME OVER? NOT YET."
 * Pure CSS + JS animation — no canvas, no dependencies.
 */

// Pac-Man frames (mouth open / closed cycle)
const PAC_OPEN_RIGHT = [
  ' ████████ ',
  '████████████',
  '██████████  ',
  '████████    ',
  '██████████  ',
  '████████████',
  ' ████████ ',
]

const PAC_CLOSED = [
  ' ████████ ',
  '████████████',
  '████████████',
  '████████████',
  '████████████',
  '████████████',
  ' ████████ ',
]

// Ghost ASCII art
const GHOST_ART = [
  '  ██████  ',
  ' ████████ ',
  '██ ██ ████',
  '██ ██ ████',
  '██████████',
  '██████████',
  '██ ██ ██ █',
]

// Scared ghost
const GHOST_SCARED = [
  '  ██████  ',
  ' ████████ ',
  '██ ██ ████',
  '████████  ',
  '██ ██ ████',
  '██████████',
  '██ ██ ██ █',
]

// Power pellet
const POWER_PELLET = [
  '  ██  ',
  ' ████ ',
  '██████',
  ' ████ ',
  '  ██  ',
]

// Dot
const DOT = '●'
const BIG_DOT = '◉'

interface GameFrame {
  pacX: number
  pacFrame: 'open' | 'closed'
  ghostX: number
  ghostState: 'chase' | 'scared' | 'eaten' | 'hidden'
  dots: number[]
  bigDots: number[]
  score: number
  phase: 'playing' | 'power' | 'gameover' | 'notyet'
  message?: string
}

export function AsciiPacmanGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [frame, setFrame] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted
    ? theme === 'dark' || document.documentElement.classList.contains('dark')
    : false

  // IntersectionObserver to trigger animation when scrolled into view
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasPlayed) {
          setIsVisible(true)
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [hasPlayed])

  // Animation loop
  useEffect(() => {
    if (!isVisible || hasPlayed) return

    const TOTAL_FRAMES = 95
    let currentFrame = 0

    animRef.current = setInterval(() => {
      currentFrame++
      setFrame(currentFrame)

      if (currentFrame >= TOTAL_FRAMES) {
        if (animRef.current) clearInterval(animRef.current)
        setHasPlayed(true)
      }
    }, 80)

    return () => {
      if (animRef.current) clearInterval(animRef.current)
    }
  }, [isVisible, hasPlayed])

  // Compute game state from frame number
  const computeGameState = (f: number): GameFrame => {
    const TRACK_WIDTH = 60

    // Dot positions (every 3 characters)
    const allDots = Array.from({ length: 16 }, (_, i) => 4 + i * 3)
    const allBigDots = [16, 37]

    // Phase transitions
    const isPower = f > 35 && f < 55
    const isGameOver = f >= 75 && f < 85
    const isNotYet = f >= 85

    // Pac-Man position (moves right across the track)
    const pacX = Math.min(f * 0.7, TRACK_WIDTH - 5)

    // Ghost position (follows pac-man, or runs away when scared)
    let ghostX: number
    let ghostState: 'chase' | 'scared' | 'eaten' | 'hidden'

    if (f < 35) {
      // Ghost chasing from behind
      ghostX = Math.max(0, pacX - 12 + Math.sin(f * 0.3) * 2)
      ghostState = 'chase'
    } else if (isPower) {
      // Ghost runs away scared
      ghostX = Math.max(0, pacX - 8 - (f - 35) * 0.8)
      ghostState = 'scared'
    } else if (f < 60) {
      // Ghost eaten
      ghostX = pacX - 3
      ghostState = 'eaten'
    } else if (f < 75) {
      // Ghost respawns and chases again
      ghostX = Math.min(TRACK_WIDTH - 3, pacX + 8 + (f - 60) * 0.3)
      ghostState = 'chase'
    } else {
      ghostX = pacX + 4
      ghostState = isGameOver ? 'chase' : 'hidden'
    }

    // Remove dots that pac-man has eaten
    const remainingDots = allDots.filter((d) => d > pacX + 1)
    const remainingBigDots = allBigDots.filter((d) => d > pacX + 1)

    // Score calculation
    const eatenDots = allDots.length - remainingDots.length
    const eatenBigDots = allBigDots.length - remainingBigDots.length
    const ghostPoints = f > 55 ? 200 : 0
    const score = eatenDots * 10 + eatenBigDots * 50 + ghostPoints

    return {
      pacX,
      pacFrame: f % 6 < 3 ? 'open' : 'closed',
      ghostX,
      ghostState,
      dots: remainingDots,
      bigDots: remainingBigDots,
      score,
      phase: isNotYet ? 'notyet' : isGameOver ? 'gameover' : isPower ? 'power' : 'playing',
      message: isNotYet
        ? 'GAME OVER? NOT YET.'
        : isGameOver
          ? 'GAME OVER'
          : isPower
            ? 'POWER UP!'
            : undefined,
    }
  }

  const state = computeGameState(frame)

  // Build the dot track line
  const buildTrackLine = (): string => {
    const TRACK_WIDTH = 60
    const chars = Array(TRACK_WIDTH).fill(' ')

    // Place dots
    for (const d of state.dots) {
      if (d < TRACK_WIDTH) chars[d] = DOT
    }
    for (const d of state.bigDots) {
      if (d < TRACK_WIDTH) chars[d] = BIG_DOT
    }

    return chars.join('')
  }

  const textColor = isDark ? '#63c4fd' : '#1e60ff'
  const dimColor = isDark ? 'rgba(99, 196, 253, 0.3)' : 'rgba(30, 96, 255, 0.25)'
  const pacColor = isDark ? '#ffeb3b' : '#f59e0b'
  const ghostColor = state.ghostState === 'scared' ? '#3b82f6' : isDark ? '#fb3377' : '#ef4444'
  const dotColor = isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.35)'
  const bigDotColor = isDark ? '#63c4fd' : '#1e60ff'

  // Render the game
  const renderGame = () => {
    if (state.phase === 'notyet') {
      return (
        <div className="flex flex-col items-center justify-center gap-4 sm:gap-6">
          {/* Blinking GAME OVER with strikethrough */}
          <div
            className="relative text-center"
            style={{
              fontFamily: '"tronica-mono", "Courier New", monospace',
            }}
          >
            <span
              className="text-lg sm:text-2xl md:text-3xl font-bold tracking-[0.3em] uppercase"
              style={{
                color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.15)',
                textDecoration: 'line-through',
                textDecorationThickness: '2px',
                textDecorationColor: isDark ? 'rgba(251, 51, 119, 0.6)' : 'rgba(239, 68, 68, 0.5)',
              }}
            >
              GAME OVER
            </span>
          </div>

          {/* NOT YET. */}
          <div
            className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-center animate-pulse"
            style={{
              fontFamily: '"tiktok", sans-serif',
              color: textColor,
              textShadow: isDark
                ? '0 0 30px rgba(99, 196, 253, 0.4), 0 0 60px rgba(99, 196, 253, 0.2)'
                : '0 0 20px rgba(30, 96, 255, 0.2)',
              fontVariationSettings: '"wght" 900',
              letterSpacing: '-0.02em',
            }}
          >
            NOT YET.
          </div>

          {/* Score */}
          <div
            className="text-xs sm:text-sm tracking-[0.4em] uppercase mt-2"
            style={{
              fontFamily: '"tronica-mono", monospace',
              color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.25)',
            }}
          >
            FINAL SCORE: {state.score}
          </div>
        </div>
      )
    }

    if (state.phase === 'gameover') {
      return (
        <div className="flex flex-col items-center justify-center gap-4">
          <div
            className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-center"
            style={{
              fontFamily: '"tiktok", sans-serif',
              color: isDark ? '#fb3377' : '#ef4444',
              animation: 'pulse 0.5s ease-in-out infinite',
              fontVariationSettings: '"wght" 900',
            }}
          >
            GAME OVER
          </div>
          <div
            className="text-xs sm:text-sm tracking-[0.4em] uppercase"
            style={{
              fontFamily: '"tronica-mono", monospace',
              color: dimColor,
            }}
          >
            SCORE: {state.score}
          </div>
        </div>
      )
    }

    // Playing / Power-up phase — render the game field
    return (
      <div className="flex flex-col items-center w-full gap-3 sm:gap-4">
        {/* Score bar */}
        <div className="w-full flex items-center justify-between px-2 sm:px-4 max-w-2xl">
          <div
            className="text-[10px] sm:text-xs tracking-[0.3em] uppercase"
            style={{
              fontFamily: '"tronica-mono", monospace',
              color: dimColor,
            }}
          >
            SCORE: {state.score.toString().padStart(4, '0')}
          </div>
          {state.phase === 'power' && (
            <div
              className="text-[10px] sm:text-xs tracking-[0.3em] uppercase animate-pulse"
              style={{
                fontFamily: '"tronica-mono", monospace',
                color: isDark ? '#63c4fd' : '#1e60ff',
              }}
            >
              ⚡ POWER UP ⚡
            </div>
          )}
          <div
            className="text-[10px] sm:text-xs tracking-[0.3em] uppercase"
            style={{
              fontFamily: '"tronica-mono", monospace',
              color: dimColor,
            }}
          >
            LNMHACKS 9.0
          </div>
        </div>

        {/* Game field */}
        <div
          className="relative w-full max-w-2xl overflow-hidden"
          style={{ height: '80px' }}
        >
          {/* Dot track */}
          <div
            className="absolute inset-x-0 flex items-center justify-center"
            style={{
              top: '35px',
              fontFamily: '"tronica-mono", monospace',
              fontSize: '14px',
              letterSpacing: '0.1em',
              whiteSpace: 'pre',
              color: dotColor,
            }}
          >
            {buildTrackLine().split('').map((ch, i) => (
              <span
                key={i}
                style={{
                  color:
                    ch === BIG_DOT
                      ? bigDotColor
                      : ch === DOT
                        ? dotColor
                        : 'transparent',
                  textShadow:
                    ch === BIG_DOT
                      ? isDark
                        ? '0 0 8px rgba(99, 196, 253, 0.5)'
                        : '0 0 6px rgba(30, 96, 255, 0.3)'
                      : 'none',
                  display: 'inline-block',
                  width: '0.65em',
                  textAlign: 'center',
                }}
              >
                {ch}
              </span>
            ))}
          </div>

          {/* Pac-Man character */}
          <div
            className="absolute transition-all duration-75"
            style={{
              left: `${Math.min(95, (state.pacX / 60) * 100)}%`,
              top: '12px',
              transform: 'translateX(-50%)',
              fontSize: '3.5px',
              lineHeight: '3.5px',
              fontFamily: 'monospace',
              color: pacColor,
              whiteSpace: 'pre',
              textShadow: isDark
                ? '0 0 6px rgba(255, 235, 59, 0.4)'
                : '0 0 4px rgba(245, 158, 11, 0.3)',
              filter: isDark ? 'drop-shadow(0 0 4px rgba(255, 235, 59, 0.3))' : 'none',
            }}
          >
            {(state.pacFrame === 'open' ? PAC_OPEN_RIGHT : PAC_CLOSED).map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>

          {/* Ghost character */}
          {state.ghostState !== 'eaten' && state.ghostState !== 'hidden' && (
            <div
              className="absolute transition-all duration-75"
              style={{
                left: `${Math.min(95, Math.max(0, (state.ghostX / 60) * 100))}%`,
                top: '12px',
                transform: 'translateX(-50%)',
                fontSize: '3.5px',
                lineHeight: '3.5px',
                fontFamily: 'monospace',
                color: ghostColor,
                whiteSpace: 'pre',
                opacity: state.ghostState === 'scared' ? 0.7 : 1,
                textShadow: isDark
                  ? `0 0 6px ${state.ghostState === 'scared' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(251, 51, 119, 0.4)'}`
                  : 'none',
              }}
            >
              {(state.ghostState === 'scared' ? GHOST_SCARED : GHOST_ART).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </div>

        {/* Track border */}
        <div
          className="w-full max-w-2xl h-px"
          style={{
            background: isDark
              ? 'linear-gradient(90deg, transparent, rgba(99, 196, 253, 0.2), rgba(251, 51, 119, 0.2), transparent)'
              : 'linear-gradient(90deg, transparent, rgba(30, 96, 255, 0.15), rgba(239, 68, 68, 0.15), transparent)',
          }}
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full flex items-center justify-center overflow-hidden select-none pointer-events-none py-12 sm:py-16 md:py-20"
      style={{
        minHeight: '180px',
      }}
    >
      {/* Subtle border decorations */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: isDark
            ? 'linear-gradient(90deg, transparent 10%, rgba(99, 196, 253, 0.08) 50%, transparent 90%)'
            : 'linear-gradient(90deg, transparent 10%, rgba(30, 96, 255, 0.06) 50%, transparent 90%)',
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: isDark
            ? 'linear-gradient(90deg, transparent 10%, rgba(99, 196, 253, 0.08) 50%, transparent 90%)'
            : 'linear-gradient(90deg, transparent 10%, rgba(30, 96, 255, 0.06) 50%, transparent 90%)',
        }}
      />

      {/* Game content */}
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-8">
        {isVisible || hasPlayed ? (
          renderGame()
        ) : (
          // Pre-animation placeholder — just dots
          <div className="flex items-center justify-center gap-2 opacity-30">
            {Array.from({ length: 20 }).map((_, i) => (
              <span
                key={i}
                style={{
                  color: dotColor,
                  fontSize: '10px',
                  fontFamily: '"tronica-mono", monospace',
                }}
              >
                {DOT}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
