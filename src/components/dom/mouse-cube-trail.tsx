'use client'

import React, { useEffect, useRef } from 'react'
import { subscribeLenisScroll, getLenisScrollSnapshot } from '@/lib/scroll-bus'

interface CubeTrailItem {
  gx: number
  gy: number
  life: number
  color: string
}

// Solid LNMHACKS brand colors (100% solid, zero opacity)
const SOLID_LOGO_COLORS = [
  '#1e60ff', // LNMHACKS Electric Blue
  '#ff3344', // LNMHACKS Neon Red
  '#0066ff', // Vibrant Royal Blue
  '#ff1a53', // Vivid Crimson
]

const SQUARE_SIZE = 20 // 50% reduced cube size (was 40px)
const CELL_LIFETIME = 18 // Frames to stay visible as a solid square (~300ms)

export function MouseCubeTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trailRef = useRef<CubeTrailItem[]>([])
  const lastPosRef = useRef<{ gx: number; gy: number } | null>(null)
  const colorIndexRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const isPastHeroRef = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Setup HiDPI Canvas
    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    // Check if scrolled past hero section
    const updateScroll = () => {
      const hero = document.getElementById('hero')
      if (hero) {
        const rect = hero.getBoundingClientRect()
        isPastHeroRef.current = rect.bottom <= window.innerHeight * 0.7
      } else {
        const snap = getLenisScrollSnapshot()
        isPastHeroRef.current = snap.scrollTop > window.innerHeight * 0.5
      }
    }

    updateScroll()
    const unsubscribeScroll = subscribeLenisScroll(updateScroll)
    window.addEventListener('scroll', updateScroll, { passive: true })

    // Bresenham step to ensure no gaps during rapid mouse moves
    const getLineCells = (x0: number, y0: number, x1: number, y1: number) => {
      const dx = Math.abs(x1 - x0)
      const dy = Math.abs(y1 - y0)
      const sx = x0 < x1 ? 1 : -1
      const sy = y0 < y1 ? 1 : -1
      let err = dx - dy

      let cx = x0
      let cy = y0
      const cells: { gx: number; gy: number }[] = []

      while (true) {
        cells.push({ gx: cx, gy: cy })
        if (cx === x1 && cy === y1) break
        const e2 = 2 * err
        if (e2 > -dy) {
          err -= dy
          cx += sx
        }
        if (e2 < dx) {
          err += dx
          cy += sy
        }
      }
      return cells
    }

    // Mouse Move handler
    const onMouseMove = (e: MouseEvent) => {
      // Only active in sections after the hero section
      const hero = document.getElementById('hero')
      if (hero) {
        const heroRect = hero.getBoundingClientRect()
        if (e.clientY < heroRect.bottom - 40) return
      } else if (!isPastHeroRef.current) {
        return
      }

      const gx = Math.floor(e.clientX / SQUARE_SIZE)
      const gy = Math.floor(e.clientY / SQUARE_SIZE)

      const start = lastPosRef.current ? lastPosRef.current : { gx, gy }
      lastPosRef.current = { gx, gy }

      const cells = getLineCells(start.gx, start.gy, gx, gy)

      for (const cell of cells) {
        const existing = trailRef.current.find((t) => t.gx === cell.gx && t.gy === cell.gy)
        if (existing) {
          existing.life = CELL_LIFETIME
        } else {
          const color = SOLID_LOGO_COLORS[colorIndexRef.current % SOLID_LOGO_COLORS.length]
          colorIndexRef.current++
          trailRef.current.push({
            gx: cell.gx,
            gy: cell.gy,
            life: CELL_LIFETIME,
            color,
          })
        }
      }
    }

    const onMouseLeave = () => {
      lastPosRef.current = null
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    document.addEventListener('mouseleave', onMouseLeave)

    // Render loop
    const draw = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)

      // Solid rendering: ensure globalAlpha is always 1 (no opacity)
      ctx.globalAlpha = 1.0

      // Filter expired trail cells
      trailRef.current = trailRef.current.filter((t) => t.life > 0)

      for (let i = 0; i < trailRef.current.length; i++) {
        const t = trailRef.current[i]
        t.life -= 1

        if (t.life <= 0) continue

        const x = t.gx * SQUARE_SIZE
        const y = t.gy * SQUARE_SIZE

        // Render completely solid color square
        ctx.fillStyle = t.color
        ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('scroll', updateScroll)
      unsubscribeScroll()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 3 }}
    />
  )
}

