// Abacus Drift — Originkit
'use client'

import * as React from 'react'
import { useEffect, useRef, type CSSProperties } from 'react'

const RenderTarget = {
  current: () => 'preview',
  hasRestrictions: () => false,
  canvas: 'canvas',
  export: 'export',
  preview: 'preview',
  thumbnail: 'thumbnail',
}

const ADVANCED_DEFAULTS = {
  cycleMs: 5800,
  rampMs: 2750, // a ≈ 0.474, h ≈ 0.026 (continuous fluid turnaround without dead pause)
  rowLagMs: 75,
  startOffsetMs: 0,
  columnLeft: 0,
  columnRight: 100,
  centerY: 50,
  rowPitch: 130,
  easeIn: 45,
  easeOut: 35,
  textOpacity: 100,
  lineWeight: 1,
  lineOpacity: 75,
  linePad: 22,
  lineMinGap: 8,
  lineCenter: 50,
  grain: 0,
  vignette: 0,
}

const HOVER_DEFAULTS = {
  hover: 0,
  hoverReach: 0,
  hoverPull: 0,
  hoverEaseMs: 50,
  pressBoost: 100,
}

const STAGE_W = 1200
const STAGE_H = 800

interface FontValue {
  fontFamily?: string
  fontWeight?: number | string
  fontStyle?: string
  fontSize?: number | string
  letterSpacing?: number | string
  lineHeight?: number | string
  variant?: string
  textAlign?: string
}

export interface AbacusWireProps {
  text?: string
  font?: FontValue
  textColor?: string | string[]
  lineColor?: string | string[]
  background?: string
  rows?: number
  speed?: number
  stagger?: number
  scale?: number
  columnWidth?: number
  pointer?: Partial<typeof HOVER_DEFAULTS>
  advanced?: Partial<typeof ADVANCED_DEFAULTS>
  style?: CSSProperties
  className?: string
}

function num(v: unknown, d: number) {
  return typeof v === 'number' && isFinite(v) ? v : d
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v
}

function parsePx(v: unknown, d: number) {
  if (typeof v === 'number' && isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    if (isFinite(n)) return n
  }
  return d
}

function parseLetterSpacing(v: unknown, px: number) {
  if (typeof v === 'number' && isFinite(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    if (!isFinite(n)) return 0
    if (v.trim().endsWith('em')) return n * px
    if (v.trim().endsWith('%')) return (n / 100) * px
    return n
  }
  return 0
}

function familyStack(family: string) {
  const f = family && family.trim() ? family.trim() : 'Inter'
  const head = f.includes(',') || f.includes('"') || f.includes("'") ? f : `"${f}"`
  return `${head}, "Helvetica Neue", Helvetica, Arial, sans-serif`
}

function bezier(x: number, x1: number, x2: number) {
  if (x <= 0) return 0
  if (x >= 1) return 1
  let lo = 0
  let hi = 1
  let s = x
  for (let i = 0; i < 18; i++) {
    s = (lo + hi) / 2
    const m = 1 - s
    const bx = 3 * m * m * s * x1 + 3 * m * s * s * x2 + s * s * s
    if (bx < x) lo = s
    else hi = s
  }
  const m = 1 - s
  return 3 * m * s * s + s * s * s
}

function rowProgress(u: number, _a: number, _h: number) {
  // Ultra-smooth harmonic oscillation (C-infinity continuous, zero jitter)
  return 0.5 - 0.5 * Math.cos(2 * Math.PI * u)
}

function __OriginkitBase_AbacusWire(props: AbacusWireProps) {
  const {
    text = 'Capture The Flag 4.O',
    font = {
      fontFamily: '"tiktok", "Poppins", sans-serif',
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: '0.03em',
      lineHeight: '1em',
    },
    textColor = '#FFFFFF',
    lineColor = '#63c4fd',
    background = 'transparent',
    rows = 4,
    speed = 30, // Calm, controlled glide speed
    stagger = 12, // Keeps text readable together as "Capture The Flag" while gliding
    scale = 100,
    columnWidth = 100,
    style,
    className,
  } = props

  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const live = useRef<AbacusWireProps>({})
  live.current = {
    text,
    font,
    textColor,
    lineColor,
    background,
    rows,
    speed,
    stagger,
    scale,
    columnWidth,
    pointer: props.pointer,
    advanced: props.advanced,
  }

  useEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = 0
    let H = 0
    let dpr = 1
    const resize = () => {
      W = root.offsetWidth
      H = root.offsetHeight
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.max(1, Math.round(W * dpr))
      canvas.height = Math.max(1, Math.round(H * dpr))
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(root)

    let isStatic = false
    try {
      isStatic =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch { }
    try {
      if (RenderTarget.current() === RenderTarget.thumbnail) isStatic = true
    } catch { }

    let fontEpoch = 0
    let requested = ''
    const fonts = typeof document !== 'undefined' ? (document.fonts as FontFaceSet | undefined) : undefined
    const onFonts = () => {
      fontEpoch++
    }
    fonts?.addEventListener?.('loadingdone', onFonts)

    let mKey = ''
    let glyphs: { ch: string; off: number; w: number; ink: boolean }[] = []
    let wordW = 0
    let capH = 0
    let xs = new Float64Array(0)

    let raf = 0
    let t0 = -1

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (t0 < 0) t0 = now
      const elapsed = (now - t0) / 1000
      if (!W || !H) return

      const s = live.current
      const adv = { ...ADVANCED_DEFAULTS, ...(s.advanced ?? {}) }

      // Ultra-smooth continuous time (immune to frame-delta microstutters)
      const spd = Math.max(0, num(s.speed, 30)) / 50
      const t = isStatic ? 0 : elapsed * spd

      const f = s.font || {}
      const sc = Math.max(0.1, num(s.scale, 100) / 100)
      const pitchK = Math.max(0.01, num(adv.rowPitch, 130) / 100)
      const n = Math.max(1, Math.round(num(s.rows, 4)))

      // Clean, bold, easily readable font sizing
      const baseFont = parsePx(f.fontSize, 16)
      const fontPx = Math.max(
        12,
        Math.min(baseFont * sc, (H * 0.88) / (n * pitchK))
      )
      const fontStr = `${f.fontStyle || 'normal'} ${f.fontWeight || 700} ${fontPx.toFixed(2)}px ${familyStack(f.fontFamily || '"tiktok", "Poppins", sans-serif')}`
      const ls = parseLetterSpacing(f.letterSpacing ?? '0.03em', fontPx)
      const txt = String(s.text ?? 'Capture The Flag 4.O')

      const key = fontStr + '|' + ls + '|' + txt + '|' + fontEpoch
      if (key !== mKey) {
        mKey = key
        ctx.font = fontStr
        const chars = Array.from(txt)
        glyphs = []
        let prefix = ''
        for (let i = 0; i < chars.length; i++) {
          glyphs.push({
            ch: chars[i],
            off: ctx.measureText(prefix).width + i * ls,
            w: ctx.measureText(chars[i]).width,
            ink: chars[i].trim() !== '',
          })
          prefix += chars[i]
        }
        wordW = chars.length
          ? ctx.measureText(txt).width + (chars.length - 1) * ls
          : 0
        const m = ctx.measureText('H')
        capH = m.actualBoundingBoxAscent || fontPx * 0.72
        if (xs.length !== chars.length) xs = new Float64Array(chars.length)
        if (fontStr !== requested && fonts?.load) {
          requested = fontStr
          fonts
            .load(fontStr, txt || 'H')
            .then(() => {
              fontEpoch++
            })
            .catch(() => { })
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.globalCompositeOperation = 'source-over'
      ctx.globalAlpha = 1
      ctx.clearRect(0, 0, W, H)

      if (s.background && s.background !== 'transparent') {
        ctx.fillStyle = s.background
        ctx.fillRect(0, 0, W, H)
      }

      // Complete left to complete right bounds across the container
      const padX = Math.max(16, Math.min(32, W * 0.03))
      const colL = padX
      const colR = W - padX
      const D = Math.max(0, colR - colL - wordW)
      const pitch = fontPx * pitchK

      const cy = (H * num(adv.centerY, 50)) / 100
      const firstBase = cy - ((n - 1) * pitch) / 2 + capH / 2

      // Continuous, fluid left-to-right-to-left cycle with smooth easing
      const cycle = Math.max(100, num(adv.cycleMs, 5800)) / 1000
      const a = clamp(num(adv.rampMs, 2750) / 1000 / cycle, 0.01, 0.5)
      const h = (1 - 2 * a) / 2
      const k = num(adv.rowLagMs, 75) / 1000 / cycle
      const u0 = a + 0.002
      const tt = t + num(adv.startOffsetMs, 0) / 1000
      const w = clamp(1 - num(s.stagger, 12) / 100, 0.05, 1)
      const x1 = clamp(num(adv.easeIn, 45) / 100, 0, 1)
      const x2 = clamp(num(adv.easeOut, 35) / 100, 0, 1)
      const ng = glyphs.length

      const lw = Math.max(1, num(adv.lineWeight, 1))
      const pad = (fontPx * num(adv.linePad, 22)) / 100
      const minSeg = Math.max(1, (fontPx * num(adv.lineMinGap, 8)) / 100)
      const textAlpha = clamp(num(adv.textOpacity, 100) / 100, 0, 1)
      const lineAlpha = clamp(num(adv.lineOpacity, 75) / 100, 0, 1)
      const lineLift = (capH * num(adv.lineCenter, 50)) / 100

      ctx.font = fontStr
      ctx.textBaseline = 'alphabetic'
      ctx.textAlign = 'left'

      // The wire line extends continuously across the full container
      const lineL = 0
      const lineR = W

      for (let r = 0; r < n; r++) {
        const base = firstBase + r * pitch
        if (base < -pitch || base - capH > H + pitch) continue

        // Pure oscillation without mouse hover pull
        const p = rowProgress(tt / cycle + u0 - r * k, a, h)

        for (let i = 0; i < ng; i++) {
          const d = ng > 1 ? ((ng - 1 - i) / (ng - 1)) * (1 - w) : 0
          const e = bezier(clamp((p - d) / w, 0, 1), x1, x2)
          xs[i] = colL + glyphs[i].off + D * e
        }

        ctx.globalAlpha = textAlpha
        const rowTextColor = Array.isArray(s.textColor)
          ? s.textColor[r % s.textColor.length]
          : s.textColor || '#FFFFFF'
        ctx.fillStyle = rowTextColor
        let headX = -1
        let tailX = -1
        for (let i = 0; i < ng; i++) {
          if (!glyphs[i].ink) continue
          ctx.fillText(glyphs[i].ch, xs[i], base)
          if (headX < 0) headX = xs[i]
          tailX = xs[i] + glyphs[i].w
        }

        ctx.globalAlpha = lineAlpha
        const rowLineColor = Array.isArray(s.lineColor)
          ? s.lineColor[r % s.lineColor.length]
          : s.lineColor || '#BDBDBD'
        ctx.fillStyle = rowLineColor
        const ly = Math.round((base - lineLift - lw / 2) * dpr) / dpr
        if (headX < 0) {
          ctx.fillRect(lineL, ly, lineR - lineL, lw)
        } else {
          const headEnd = headX - pad
          if (headEnd - lineL >= minSeg) ctx.fillRect(lineL, ly, headEnd - lineL, lw)
          const tailStart = tailX + pad
          if (lineR - tailStart >= minSeg) ctx.fillRect(tailStart, ly, lineR - tailStart, lw)
        }
      }

      ctx.globalAlpha = 1
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      fonts?.removeEventListener?.('loadingdone', onFonts)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        ...style,
        overflow: 'hidden',
        background: background === 'transparent' ? undefined : background,
        pointerEvents: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}

const __originkitPresetProps = {
  text: 'Capture The Flag 4.O',
  font: {
    variant: 'Bold',
    fontSize: 16,
    textAlign: 'left',
    fontFamily: '"tiktok", "Poppins", sans-serif',
    fontWeight: 700,
    lineHeight: '1em',
    letterSpacing: '0.03em',
  },
  rows: 4,
  scale: 100,
  stagger: 12,
  speed: 30, // Smooth, gentle glide
  pointer: {
    hover: 0,
    hoverPull: 0,
    hoverReach: 0,
    pressBoost: 100,
    hoverEaseMs: 50,
  },
  advanced: {
    grain: 0,
    hover: 0,
    easeIn: 45,
    rampMs: 2750,
    centerY: 50,
    cycleMs: 5800,
    easeOut: 35,
    linePad: 22,
    rowLagMs: 75,
    rowPitch: 130,
    vignette: 0,
    hoverPull: 0,
    columnLeft: 0,
    columnRight: 100,
    hoverReach: 0,
    lineCenter: 50,
    lineMinGap: 8,
    lineWeight: 1,
    pressBoost: 100,
    hoverEaseMs: 50,
    lineOpacity: 75,
    textOpacity: 100,
    startOffsetMs: 0,
  },
}

export default function AbacusWire(props: Partial<AbacusWireProps>) {
  return <__OriginkitBase_AbacusWire {...__originkitPresetProps} {...props} />
}
export { AbacusWire }
