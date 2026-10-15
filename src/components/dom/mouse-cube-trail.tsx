'use client'

import React, { useEffect, useRef } from 'react'
import { subscribeLenisScroll, getLenisScrollSnapshot } from '@/lib/scroll-bus'

interface CubeTrailItem {
  gx: number
  gy: number
  life: number
  color: string
}

// Solid LNMHACKS logo colors matching public/logo.png: Pink (L), Cyan (N), Royal Blue (M)
const SOLID_LOGO_COLORS = [
  '#fb3377', // Logo Pink (L)
  '#63c4fd', // Logo Cyan (N)
  '#1e60ff', // Logo Royal Blue (M)
]

const SQUARE_SIZE = 15 // Reduced cube size by 25% (was 20px)
const CELL_LIFETIME = 8 // Decreased trail length by half

export function MouseCubeTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const trailRef = useRef<CubeTrailItem[]>([])
  const lastPosRef = useRef<{ gx: number; gy: number } | null>(null)
  const colorIndexRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const isPastHeroRef = useRef(false)
  const heroBottomRef = useRef(0)
  const glimpsesTopRef = useRef(Infinity)
  const footerTopRef = useRef(Infinity)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Check if scrolled past hero section and cache section boundaries
    const updateScroll = () => {
      const hero = document.getElementById('hero')
      if (hero) {
        const rect = hero.getBoundingClientRect()
        heroBottomRef.current = rect.bottom
        isPastHeroRef.current = rect.bottom <= 0
        // When user scrolls back up into hero, clear all remaining cubes immediately
        if (rect.bottom > 50 && trailRef.current.length > 0) {
          trailRef.current = []
        }
      } else {
        const snap = getLenisScrollSnapshot()
        heroBottomRef.current = -100
        isPastHeroRef.current = snap.scrollTop > window.innerHeight
      }

      const glimpses = document.getElementById('glimpses')
      glimpsesTopRef.current = glimpses ? glimpses.getBoundingClientRect().top : Infinity

      const footer = document.getElementById('hawa-mahal-footer')
      footerTopRef.current = footer ? footer.getBoundingClientRect().top : Infinity
    }

    // Setup HiDPI Canvas
    const resize = () => {
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      canvas.style.pointerEvents = 'none'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      updateScroll()
    }

    canvas.style.pointerEvents = 'none'

    resize()
    window.addEventListener('resize', resize)

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

    // Mouse Move handler — reads cached boundaries without layout thrashing
    const onMouseMove = (e: MouseEvent) => {
      const heroBottom = heroBottomRef.current

      // Strictly stop if cursor is anywhere inside or above the hero section
      if (e.clientY <= heroBottom) {
        lastPosRef.current = null
        return
      }

      // Strictly stop if cursor is inside glimpses or footer section so all clicks and interactions are unaffected
      const glimpsesTop = glimpsesTopRef.current
      const footerTop = footerTopRef.current

      if (e.clientY >= glimpsesTop || e.clientY >= footerTop) {
        lastPosRef.current = null
        return
      }

      const gx = Math.floor(e.clientX / SQUARE_SIZE)
      const gy = Math.floor(e.clientY / SQUARE_SIZE)

      const start = lastPosRef.current ? lastPosRef.current : { gx, gy }
      lastPosRef.current = { gx, gy }

      const cells = getLineCells(start.gx, start.gy, gx, gy)

      for (const cell of cells) {
        const cellY = cell.gy * SQUARE_SIZE
        // Strictly never add a cube inside hero, glimpses, or footer
        if (cellY < heroBottom || cellY >= glimpsesTop || cellY >= footerTop) continue

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

      // Wake up render loop if asleep
      if (!isLooping && trailRef.current.length > 0) {
        isLooping = true
        rafRef.current = requestAnimationFrame(draw)
      }
    }

    const onMouseLeave = () => {
      lastPosRef.current = null
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    document.addEventListener('mouseleave', onMouseLeave)

    // Render loop — sleeps when trail is empty
    let isLooping = false
    const draw = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)

      // Solid rendering: ensure globalAlpha is always 1 (no opacity)
      ctx.globalAlpha = 1.0

      // Filter expired trail cells
      trailRef.current = trailRef.current.filter((t) => t.life > 0)

      if (trailRef.current.length === 0) {
        isLooping = false
        return // Sleep! No requestAnimationFrame when idle
      }

      const hero = document.getElementById('hero')
      const heroBottom = hero ? hero.getBoundingClientRect().bottom : heroBottomRef.current

      for (let i = 0; i < trailRef.current.length; i++) {
        const t = trailRef.current[i]
        t.life -= 1

        if (t.life <= 0) continue

        const x = t.gx * SQUARE_SIZE
        const y = t.gy * SQUARE_SIZE

        // Strictly never render inside the hero section
        if (y < heroBottom) continue

        // Render completely solid color square
        ctx.fillStyle = t.color
        ctx.fillRect(x, y, SQUARE_SIZE, SQUARE_SIZE)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

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
      style={{ zIndex: 15, pointerEvents: 'none' }}
    />
  )
}

