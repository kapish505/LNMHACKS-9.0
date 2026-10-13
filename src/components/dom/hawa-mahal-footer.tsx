'use client'

import React, { useEffect, useRef, useState } from 'react'
import { triggerPageTransition } from '@/lib/page-transition-bus'

// LNMHACKS brand palette for the Tetris blocks — strictly matching logo facets
const BLOCK_COLORS = [
  '#fb3377', // Logo Pink (L)
  '#63c4fd', // Logo Cyan (N)
  '#1e60ff', // Logo Royal Blue (M)
  '#ff4d8d', // Vivid Logo Pink facet
  '#38bdf8', // Bright Cyan facet
  '#2563eb', // Electric Royal Blue
  '#f472b6', // Soft Logo Pink highlight
]

const BASE_SHAPES: [number, number][][] = [
  [[0, 0], [1, 0], [2, 0], [3, 0]],         // I
  [[0, 0], [1, 0], [0, 1], [1, 1]],         // O
  [[1, 0], [0, 1], [1, 1], [2, 1]],         // T
  [[1, 0], [2, 0], [0, 1], [1, 1]],         // S
  [[0, 0], [1, 0], [1, 1], [2, 1]],         // Z
  [[0, 0], [0, 1], [1, 1], [2, 1]],         // J
  [[2, 0], [0, 1], [1, 1], [2, 1]],         // L
]

const norm = (c: [number, number][]): [number, number][] => {
  const mx = Math.min(...c.map((p) => p[0]))
  const my = Math.min(...c.map((p) => p[1]))
  return c.map((p) => [p[0] - mx, p[1] - my])
}

const ROTS: [number, number][][][] = BASE_SHAPES.map((b) => {
  const r: [number, number][][] = [b]
  for (let i = 1; i < 4; i++) {
    r.push(norm(r[i - 1].map(([x, y]) => [-y, x])))
  }
  return r
})

const wOf = (t: number, r: number) =>
  Math.max(...ROTS[t][r].map((p) => p[0])) + 1

// Skyline height (9 rows) — provides authentic Tetris stacking room so lines only clear when fully completed
const H = 9

export function HawaMahalFooter() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const [lines, setLines] = useState(0)
  const [pieces, setPieces] = useState(0)
  const [isManual, setIsManual] = useState(false)
  const [hint, setHint] = useState('')

  const isManualRef = useRef(false)
  isManualRef.current = isManual

  useEffect(() => {
    const cv = canvasRef.current
    const wrap = wrapRef.current
    if (!cv || !wrap) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    let W = 0
    let C = 20
    let board: number[][] = []
    let cur: { t: number; r: number; x: number; y: number } | null = null
    let tgt: { x: number; r: number } = { x: 0, r: 0 }
    let clearing: number[] | null = null
    let linesCount = 0
    let piecesCount = 0
    let mrot = 0
    let pcol = 0
    let visible = true
    let dpr = 1

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const empty = () => new Array(W).fill(0)

    const hit = (cells: [number, number][], x: number, y: number) => {
      for (const [a, b] of cells) {
        const X = x + a
        const Y = y + b
        if (X < 0 || X >= W || Y >= H) return true
        if (Y >= 0 && board[Y] && board[Y][X]) return true
      }
      return false
    }

    const landY = (cells: [number, number][], x: number, y: number) => {
      while (!hit(cells, x, y + 1)) y++
      return y
    }

    const score = (cells: [number, number][], x: number, y: number) => {
      const set: [number, number][] = []
      for (const [a, b] of cells) {
        const X = x + a
        const Y = y + b
        if (Y >= 0) {
          board[Y][X] = 1
          set.push([X, Y])
        }
      }
      let ln = 0
      for (let j = 0; j < H; j++) {
        if (board[j].every((v) => v)) ln++
      }
      let holes = 0
      let bump = 0
      let agg = 0
      let prev: number | null = null
      for (let i = 0; i < W; i++) {
        let j = 0
        while (j < H && !board[j][i]) j++
        const h = H - j
        agg += h
        if (prev !== null) bump += Math.abs(h - prev)
        prev = h
        for (let k = j; k < H; k++) {
          if (!board[k][i]) holes++
        }
      }
      set.forEach(([X, Y]) => {
        board[Y][X] = 0
      })
      return ln * 9 - holes * 8 - bump * 0.45 - agg * 0.4 + Math.random() * 1.6
    }

    const plan = (t: number) => {
      let best = { x: 0, r: 0 }
      let bs = -1e9
      for (let r = 0; r < 4; r++) {
        const cells = ROTS[t][r]
        const w = wOf(t, r)
        for (let x = 0; x + w <= W; x++) {
          if (hit(cells, x, -3)) continue
          const s = score(cells, x, landY(cells, x, -3))
          if (s > bs) {
            bs = s
            best = { x, r }
          }
        }
      }
      return best
    }

    const crumble = () => {
      // Safety net: only clears rows if stacked all the way into spawn zone
      while (board.slice(0, 2).some((r) => r.some((v) => v))) {
        board.pop()
        board.unshift(empty())
      }
    }

    const spawn = () => {
      crumble()
      const t = Math.floor(Math.random() * 7)
      tgt = plan(t)
      const x = isManualRef.current
        ? Math.floor(W / 2)
        : Math.max(0, Math.min(W - 4, tgt.x + Math.floor(Math.random() * 9) - 4))
      cur = { t, r: 0, x, y: -3 }
      if (isManualRef.current) mrot = 0
    }

    const place = () => {
      const piece = cur
      if (!piece) return []
      ROTS[piece.t][piece.r].forEach(([a, b]) => {
        const Y = piece.y + b
        if (Y >= 0 && board[Y]) {
          board[Y][piece.x + a] = piece.t + 1
        }
      })
      piecesCount++
      setPieces(piecesCount)
      return board
        .map((r, j) => (r.every((v) => v) ? j : -1))
        .filter((j) => j >= 0)
    }

    const applyClear = (rows: number[]) => {
      rows.forEach((j) => {
        board.splice(j, 1)
        board.unshift(empty())
      })
      linesCount += rows.length
      setLines(linesCount)
    }

    const tick = () => {
      if (!cur) return
      if (clearing) {
        applyClear(clearing)
        clearing = null
        spawn()
        return
      }
      let tr = cur.r
      let tx = cur.x
      if (isManualRef.current) {
        tr = mrot % 4
        tx = Math.max(0, Math.min(W - wOf(cur.t, tr), pcol))
      } else {
        tr = tgt.r
        tx = tgt.x
      }
      if (cur.r !== tr) {
        const nr = (cur.r + 1) % 4
        if (!hit(ROTS[cur.t][nr], cur.x, cur.y)) cur.r = nr
      }
      for (let k = 0; k < 2 && cur.x !== tx; k++) {
        const nx = cur.x + Math.sign(tx - cur.x)
        if (!hit(ROTS[cur.t][cur.r], nx, cur.y)) cur.x = nx
      }
      if (!hit(ROTS[cur.t][cur.r], cur.x, cur.y + 1)) {
        cur.y++
      } else {
        const rows = place()
        if (rows.length) clearing = rows
        else spawn()
      }
    }

    const instant = (n: number) => {
      for (let i = 0; i < n; i++) {
        spawn()
        if (!cur) continue
        cur.r = tgt.r
        cur.x = tgt.x
        cur.y = landY(ROTS[cur.t][cur.r], cur.x, -3)
        const rows = place()
        if (rows.length) applyClear(rows)
      }
      spawn()
      setLines(linesCount)
      setPieces(piecesCount)
    }

    const block = (x: number, y: number, c: number, col: string, a = 1) => {
      ctx.globalAlpha = a
      ctx.fillStyle = col
      ctx.fillRect(x * c + 1, y * c + 1, c - 2, c - 2)

      // 3D bevel highlights matching logo facet aesthetic
      ctx.fillStyle = 'rgba(255, 255, 255, 0.38)'
      ctx.fillRect(x * c + 1, y * c + 1, c - 2, Math.max(3, c * 0.16))
      ctx.fillRect(x * c + 1, y * c + 1, Math.max(3, c * 0.16), c - 2)

      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'
      ctx.fillRect(
        x * c + 1,
        y * c + c - 1 - Math.max(3, c * 0.16),
        c - 2,
        Math.max(3, c * 0.16)
      )
      ctx.globalAlpha = 1
    }

    const draw = () => {
      const w = wrap.clientWidth
      ctx.clearRect(0, 0, cv.width, cv.height)
      ctx.save()
      ctx.scale(dpr, dpr)

      // Dot matrix pattern on the cream background
      ctx.fillStyle = 'rgba(54, 54, 48, 0.12)'
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          ctx.fillRect(i * C + C / 2 - 1, j * C + C / 2 - 1, 2, 2)
        }
      }

      // Settled board blocks forming the Hawa Mahal skyline
      for (let j = 0; j < H; j++) {
        for (let i = 0; i < W; i++) {
          const v = board[j][i]
          if (v) {
            block(
              i,
              j,
              C,
              clearing && clearing.includes(j) ? '#ffffff' : BLOCK_COLORS[(v - 1) % BLOCK_COLORS.length]
            )
          }
        }
      }

      // Active falling piece
      if (cur) {
        const cells = ROTS[cur.t][cur.r]
        if (isManualRef.current) {
          const gy = landY(cells, cur.x, cur.y)
          ctx.strokeStyle = BLOCK_COLORS[cur.t % BLOCK_COLORS.length]
          ctx.lineWidth = 2
          cells.forEach(([a, b]) => {
            ctx.strokeRect((cur!.x + a) * C + 2, (gy + b) * C + 2, C - 4, C - 4)
          })
        }
        cells.forEach(([a, b]) => {
          if (cur!.y + b >= 0) {
            block(cur!.x + a, cur!.y + b, C, BLOCK_COLORS[cur!.t % BLOCK_COLORS.length])
          }
        })
      }

      ctx.restore()
    }

    const resize = () => {
      const w = wrap.clientWidth
      const cols = window.innerWidth < 640 ? 18 : 34
      const nw = cols
      C = w / cols
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = Math.round(w * dpr)
      cv.height = Math.round(C * H * dpr)
      cv.style.height = `${C * H}px`
      if (nw !== W) {
        W = nw
        board = Array.from({ length: H }, empty)
        linesCount = 0
        piecesCount = 0
        clearing = null
        instant(35) // Pre-seed 35 pieces to create the iconic Hawa Mahal skyline!
      }
      draw()
    }

    resize()
    window.addEventListener('resize', resize)

    let last = 0
    let acc = 0
    let rafId: number | null = null

    const loop = (t: number) => {
      if (!visible || reduce) {
        rafId = null
        return
      }
      rafId = requestAnimationFrame(loop)
      if (last === 0) last = t
      acc += t - last
      last = t
      if (acc > 500) acc = 0
      while (acc >= 160) {
        acc -= 160
        tick()
      }
      draw()
    }

    const obs = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible && !reduce) {
        last = performance.now()
        if (!rafId) {
          rafId = requestAnimationFrame(loop)
        }
      } else if (!visible && rafId) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    })
    obs.observe(wrap)

    const onPointerMove = (e: PointerEvent) => {
      const r = wrap.getBoundingClientRect()
      pcol = Math.floor((e.clientX - r.left) / C) - 1
    }

    const onPointerDown = (e: PointerEvent) => {
      if (isManualRef.current) {
        const r = wrap.getBoundingClientRect()
        pcol = Math.floor((e.clientX - r.left) / C) - 1
        mrot++
      }
    }

    wrap.addEventListener('pointermove', onPointerMove)
    wrap.addEventListener('pointerdown', onPointerDown)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      obs.disconnect()
      window.removeEventListener('resize', resize)
      wrap.removeEventListener('pointermove', onPointerMove)
      wrap.removeEventListener('pointerdown', onPointerDown)
    }
  }, [])

  const toggleManual = () => {
    const next = !isManual
    setIsManual(next)
    if (next) {
      setHint('Move your pointer to steer. Click or tap to rotate.')
    } else {
      setHint('')
    }
  }

  return (
    <footer id="hawa-mahal-footer" className="relative w-full z-20 mt-auto bg-[#F0EDE8]">
      {/* ── Tetris Hawa Mahal Skyline Well ── */}
      <div
        ref={wrapRef}
        id="wellwrap"
        className={`relative block w-full touch-pan-y ${isManual ? 'cursor-crosshair' : ''}`}
      >
        <canvas ref={canvasRef} id="well" className="block w-full" aria-hidden="true" />
      </div>

      {/* ── Main Footer Panel — Compact, Perfectly Aligned, and Unified Typography ── */}
      <div
        className="w-full bg-[#0a0e1a] text-[#EDEBFF] border-t-4 border-[#1e60ff] px-4 sm:px-8 lg:px-14 pt-6 sm:pt-8 pb-8 sm:pb-10"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Brand & Tetris Game Controls */}
          <div className="lg:col-span-5 flex flex-col items-start pr-0 lg:pr-6">
            <h2
              className="text-2xl sm:text-3xl font-black tracking-tight uppercase flex items-center gap-1.5 mb-2 select-none"
              style={{
                fontFamily: '"tiktok", sans-serif',
                fontVariationSettings: '"wght" 850, "wdth" 110',
                letterSpacing: '-0.02em',
              }}
            >
              <span style={{ color: '#fb3377' }}>L</span>
              <span style={{ color: '#63c4fd' }}>N</span>
              <span style={{ color: '#1e60ff' }}>M</span>
              <span style={{ color: '#fb3377' }}>HACKS 9.0</span>
            </h2>

            <p
              className="text-xs sm:text-sm text-neutral-400 max-w-md leading-relaxed mb-4"
              style={{ fontFamily: '"tiktok", sans-serif' }}
            >
              The largest student-run hackathon in India. 72 hours of pure innovation, workshops,
              and developer culture. Every line cleared makes room for the next one.
            </p>

            {/* Interactive Tetris Live Stats */}
            <div
              className="flex gap-8 mb-4 text-sm"
              style={{ fontFamily: '"tronica-mono", monospace' }}
            >
              <div>
                <b className="block text-2xl font-bold text-white tracking-tight">{lines}</b>
                <span className="text-[10px] tracking-widest uppercase text-neutral-400">Lines Cleared</span>
              </div>
              <div>
                <b className="block text-2xl font-bold text-white tracking-tight">{pieces}</b>
                <span className="text-[10px] tracking-widest uppercase text-neutral-400">Pieces Dropped</span>
              </div>
            </div>

            {/* Interactive Mode Toggle */}
            <button
              type="button"
              onClick={toggleManual}
              aria-pressed={isManual}
              className={`px-5 py-2 text-xs font-bold uppercase tracking-[0.08em] rounded-full border transition-all duration-200 cursor-pointer ${
                isManual
                  ? 'bg-[#1e60ff] text-white border-[#1e60ff] shadow-lg shadow-blue-500/30'
                  : 'bg-transparent text-[#63c4fd] border-[#63c4fd]/60 hover:bg-[#63c4fd]/10 hover:border-[#63c4fd]'
              }`}
              style={{ fontFamily: '"tiktok", sans-serif' }}
            >
              {isManual ? 'Give it back to the bot' : 'Take the controller'}
            </button>

            {hint && (
              <p
                className="mt-2 text-xs text-[#63c4fd] font-mono animate-in fade-in duration-200"
                style={{ fontFamily: '"tronica-mono", monospace' }}
                role="status"
              >
                {hint}
              </p>
            )}
          </div>

          {/* Navigation Links — 3 columns aligned with matching kicker labels and TikTok Sans links */}
          <div className="lg:col-span-7 grid grid-cols-3 gap-6 sm:gap-8 pt-1">
            {/* Quick Links */}
            <div>
              <h3
                className="text-xs uppercase tracking-[0.14em] font-bold text-[#63c4fd] mb-3 flex items-center gap-1.5"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#63c4fd] inline-block" />
                <span>Navigation</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ fontFamily: '"tiktok", sans-serif' }}>
                <li>
                  <a href="#hero" className="text-neutral-300 hover:text-white transition-colors">
                    Home
                  </a>
                </li>
                <li>
                  <a href="#about" className="text-neutral-300 hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#glimpses" className="text-neutral-300 hover:text-white transition-colors">
                    Glimpses
                  </a>
                </li>
                <li>
                  <a href="#sponsors" className="text-neutral-300 hover:text-white transition-colors">
                    Sponsors
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('arrow-section')
                      if (el) {
                        const vh = window.innerHeight || 800
                        const arrowTop = el.getBoundingClientRect().top + window.scrollY
                        const targetScroll = arrowTop + 2.4 * vh
                        window.scrollTo({ top: targetScroll, behavior: 'smooth' })
                      }
                    }}
                    className="text-neutral-300 hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Timeline
                  </button>
                </li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h3
                className="text-xs uppercase tracking-[0.14em] font-bold text-[#fb3377] mb-3 flex items-center gap-1.5"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#fb3377] inline-block" />
                <span>Community</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ fontFamily: '"tiktok", sans-serif' }}>
                <li>
                  <a
                    href="https://discord.gg/wsFFY3Yc85"
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-300 hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    <span>Discord</span>
                    <span className="text-neutral-500 group-hover:text-[#63c4fd] transition-colors">↗</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://x.com/LNMHacks"
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-300 hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    <span>Twitter / X</span>
                    <span className="text-neutral-500 group-hover:text-[#63c4fd] transition-colors">↗</span>
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.instagram.com/lnmhacks/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-neutral-300 hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    <span>Instagram</span>
                    <span className="text-neutral-500 group-hover:text-[#fb3377] transition-colors">↗</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3
                className="text-xs uppercase tracking-[0.14em] font-bold text-[#1e60ff] mb-3 flex items-center gap-1.5"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#1e60ff] inline-block" />
                <span>Resources</span>
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm" style={{ fontFamily: '"tiktok", sans-serif' }}>
                <li>
                  <button
                    type="button"
                    onClick={() => triggerPageTransition('/hack-guide')}
                    className="text-neutral-300 hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Hack Guide
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => triggerPageTransition('/rules-tracks')}
                    className="text-neutral-300 hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Rules & Tracks
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => triggerPageTransition('/code-of-conduct')}
                    className="text-neutral-300 hover:text-white transition-colors text-left cursor-pointer"
                  >
                    Code of Conduct
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Legal & Signature Bar — tightly spaced without excessive padding */}
        <div
          className="max-w-7xl mx-auto mt-6 pt-4 border-t border-neutral-800 flex flex-wrap gap-4 justify-between items-center text-xs text-neutral-400"
          style={{ fontFamily: '"tronica-mono", monospace' }}
        >
          <span>
            &copy; {new Date().getFullYear()} LNMHACKS 9.0™ ▪ Game over? Not yet.
          </span>
          <span className="text-neutral-500 text-[11px]">
            Jaipur, Rajasthan, India ▪ Reach out via Discord, X & Instagram
          </span>
        </div>
      </div>
    </footer>
  )
}
