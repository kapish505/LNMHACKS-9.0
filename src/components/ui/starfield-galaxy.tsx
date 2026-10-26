'use client'

import { useEffect, useRef } from 'react'

export interface StarfieldGalaxyProps {
  stars?: number
  speed?: number
  spread?: number
  focal?: number
  twinkle?: number
  trail?: number
  size?: number
  fadeInRange?: number
  reverseFly?: boolean
  followCursor?: boolean
  background?: string
  starColor?: string
  active?: boolean
  opacity?: number
  className?: string
  style?: React.CSSProperties
}

interface Star {
  x: number
  y: number
  z: number
  tw: number
}

/**
 * StarfieldGalaxy:
 * Faithful reproduction of Framer's Stars-Galaxy component (StarsArea.js):
 * https://framer.com/m/Stars-Galaxy-mcPCjY.js@Mj2pxzqB0usafl3jU9iO
 * 
 * Features:
 * - 3D depth-projected starfield with customizable star count, speed, spread, and focal length
 * - Twinkle shimmer and smooth cursor parallax
 * - Pauses rendering loop when inactive for zero overhead
 */
export function StarfieldGalaxy({
  stars = 2000,
  speed = 1.8,
  spread = 5,
  focal = 1.2,
  twinkle = 0.3,
  trail = 1,
  size = 1.2,
  fadeInRange = 3.5,
  reverseFly = false,
  followCursor = true,
  background = '#03060d',
  starColor = '#ffffff',
  active = true,
  opacity = 1,
  className,
  style,
}: StarfieldGalaxyProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mouseRef = useRef({ x: 0.5, y: 0.5 })
  const targetMouseRef = useRef({ x: 0.5, y: 0.5 })
  const starsRef = useRef<Star[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const DPR = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

    const createStar = (): Star => ({
      x: (Math.random() - 0.5) * spread,
      y: (Math.random() - 0.5) * spread,
      z: Math.random(),
      tw: Math.random() * Math.PI * 2,
    })

    const resize = () => {
      const parent = canvas.parentElement
      const rect = parent ? parent.getBoundingClientRect() : canvas.getBoundingClientRect()
      const w = Math.max(1, rect.width)
      const h = Math.max(1, rect.height)
      canvas.width = w * DPR
      canvas.height = h * DPR
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)

      ctx.globalAlpha = 1
      ctx.fillStyle = background
      ctx.fillRect(0, 0, w, h)
    }

    resize()
    window.addEventListener('resize', resize, { passive: true })

    if (starsRef.current.length !== stars) {
      starsRef.current = Array.from({ length: stars }, createStar)
    }

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        targetMouseRef.current.x = clamp((e.clientX - rect.left) / rect.width, 0, 1)
        targetMouseRef.current.y = clamp((e.clientY - rect.top) / rect.height, 0, 1)
      }
    }

    if (followCursor) {
      window.addEventListener('mousemove', onMouseMove, { passive: true })
    }

    let isMounted = true

    const animate = () => {
      if (!isMounted) return

      const w = canvas.width / DPR
      const h = canvas.height / DPR

      // Background clearing (crisp when trail === 1, subtle motion streak when trail < 1)
      if (trail < 1) {
        ctx.globalAlpha = Math.max(0.12, 1 - trail)
        ctx.fillStyle = background
        ctx.fillRect(0, 0, w, h)
      } else {
        ctx.globalAlpha = 1
        ctx.fillStyle = background
        ctx.fillRect(0, 0, w, h)
      }

      // Smooth cursor parallax interpolation
      if (followCursor) {
        mouseRef.current.x += (targetMouseRef.current.x - mouseRef.current.x) * 0.06
        mouseRef.current.y += (targetMouseRef.current.y - mouseRef.current.y) * 0.06
      }

      const cx = followCursor ? mouseRef.current.x * w : w / 2
      const cy = followCursor ? mouseRef.current.y * h : h / 2

      ctx.fillStyle = starColor
      const starsArr = starsRef.current
      const clampedFocal = clamp(focal, 0.01, 10)
      const clampedSpeed = clamp(speed, 0, 10) * 0.002
      const clampedTwinkle = clamp(twinkle, 0, 1)
      const clampedFade = clamp(fadeInRange, 0.1, 10)
      const clampedSize = clamp(size, 0.1, 5)

      for (let i = 0; i < starsArr.length; i++) {
        const s = starsArr[i]
        const depth = s.z * clampedFocal + 0.001
        const px = cx + (s.x / depth) * w
        const py = cy + (s.y / depth) * h

        s.z += reverseFly ? clampedSpeed : -clampedSpeed
        if (s.z <= 0 || s.z > 1) {
          starsArr[i] = createStar()
          continue
        }

        s.tw += clampedTwinkle * 0.05
        const alpha = Math.max(0, 1 - s.z / clampedFade)
        const radius = clampedSize * (1 - s.z) * (1 + Math.sin(s.tw) * clampedTwinkle)

        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(px, py, Math.max(0.2, radius), 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      isMounted = false
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
      if (followCursor) {
        window.removeEventListener('mousemove', onMouseMove)
      }
    }
  }, [
    active,
    stars,
    speed,
    spread,
    focal,
    twinkle,
    trail,
    size,
    fadeInRange,
    reverseFly,
    followCursor,
    background,
    starColor,
  ])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        backgroundColor: background,
        opacity: opacity !== undefined ? opacity : 1,
        ...style,
      }}
    />
  )
}
