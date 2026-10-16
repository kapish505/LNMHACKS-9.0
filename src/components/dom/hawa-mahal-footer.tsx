'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { triggerPageTransition } from '@/lib/page-transition-bus'
import {
  FACADE_BASE_COLOUR, HAWA_MAHAL_INVENTORY, HAWA_MAHAL_ROOFLINE, HawaMahalFacade,
  type HawaMahalLights, type LightState, type WindowInfo, type WindowTimeline,
} from '@/components/dom/hawa-mahal'
import styles from './hawa-mahal-footer.module.css'

const linkClass = 'text-[#f4dcb6]/80 transition-colors hover:text-[#fff3dc]'

/** Deterministic pseudo-random so every visitor sees the same sky and show. */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ───────────────────────────────────────────── sky

/** Height of the traced roofline at x (facade units); plinth level outside the building. */
function rooflineAt(x: number): number {
  const pts = HAWA_MAHAL_ROOFLINE
  if (x <= pts[0][0] || x >= pts[pts.length - 1][0]) return 745
  for (let i = 1; i < pts.length; i++) {
    if (pts[i][0] >= x) {
      const [x0, y0] = pts[i - 1]
      const [x1, y1] = pts[i]
      return y0 + ((x - x0) / (x1 - x0 || 1)) * (y1 - y0)
    }
  }
  return 745
}

type Star = { x: number; y: number; r: number; bright: boolean; dur: string; delay: string }

/** Stars in the facade's coordinate space, only where there is sky. */
function buildStars(count = 150): Star[] {
  const rnd = seeded(1799) // the year Hawa Mahal was built
  const stars: Star[] = []
  let guard = 0
  while (stars.length < count && guard++ < count * 8) {
    const x = -80 + rnd() * 2180
    const y = -560 + rnd() * 1200
    if (y > rooflineAt(x) - 26) continue
    const bright = rnd() < 0.14
    stars.push({
      x: Math.round(x), y: Math.round(y),
      r: +(0.7 + rnd() * 1.4 + (bright ? 1.2 : 0)).toFixed(2),
      bright,
      dur: (2.4 + rnd() * 3.6).toFixed(2),
      delay: (-rnd() * 6).toFixed(2),
    })
  }
  return stars
}

const SYNODIC_DAYS = 29.530588853
const NEW_MOON_REF_UTC = Date.UTC(2000, 0, 6, 18, 14)

/**
 * 0 = new, 0.5 = full, → 1 = new again. Evaluated at today's UTC noon so the
 * server and the client agree on the first render (no hydration mismatch).
 */
function currentLunarPhase(): number {
  const d = new Date()
  const noon = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12)
  const days = (noon - NEW_MOON_REF_UTC) / 86400000
  return Math.round(((((days % SYNODIC_DAYS) + SYNODIC_DAYS) % SYNODIC_DAYS) / SYNODIC_DAYS) * 1e4) / 1e4
}

function phaseName(p: number): string {
  if (p < 0.03 || p > 0.97) return 'New moon'
  if (p < 0.22) return 'Waxing crescent'
  if (p < 0.28) return 'First quarter'
  if (p < 0.47) return 'Waxing gibbous'
  if (p < 0.53) return 'Full moon'
  if (p < 0.72) return 'Waning gibbous'
  if (p < 0.78) return 'Last quarter'
  return 'Waning crescent'
}

/** The lit part of the moon as a path: the limb on the lit side plus the terminator ellipse. */
function moonLitPath(r: number, p: number): string {
  const waxing = p < 0.5
  const k = Math.cos(2 * Math.PI * p) // 1 at new, −1 at full
  const rx = Math.max(0.01, Math.abs(k) * r)
  const limb = waxing ? `M0,${-r} A${r},${r} 0 0 1 0,${r}` : `M0,${-r} A${r},${r} 0 0 0 0,${r}`
  const sweep = waxing ? (k > 0 ? 0 : 1) : k > 0 ? 1 : 0
  return `${limb} A${rx.toFixed(2)},${r} 0 0 ${sweep} 0,${-r} Z`
}

/** Moon that starts at tonight's real phase and slowly cycles through all of them. */
function Moon({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const [phase, setPhase] = useState(() => currentLunarPhase())
  const tonight = useMemo(() => currentLunarPhase(), [])
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const start = performance.now()
    const cycleMs = 48000
    const id = window.setInterval(() => {
      setPhase((tonight + (performance.now() - start) / cycleMs) % 1)
    }, 250)
    return () => window.clearInterval(id)
  }, [tonight])
  const lit = Math.round(((1 - Math.cos(2 * Math.PI * phase)) / 2) * 1000) / 1000
  return (
    <g className={styles.moon} transform={`translate(${cx} ${cy})`} role="img" aria-label={`Moon, tonight ${phaseName(tonight).toLowerCase()}`}>
      <circle r={r * 2.6} fill="url(#hmf-moon-halo)" opacity={(0.35 + lit * 0.65).toFixed(3)} />
      <circle r={r} fill="#1b2050" />
      <circle r={r} fill="none" stroke="#5a5f8a" strokeWidth="0.8" />
      <path d={moonLitPath(r, phase)} fill="url(#hmf-moon-face)" />
      <g fill="#c9c3a8" opacity={(0.28 * lit + 0.06).toFixed(3)}>
        <circle cx={-r * 0.32} cy={-r * 0.18} r={r * 0.17} />
        <circle cx={r * 0.22} cy={r * 0.3} r={r * 0.12} />
        <circle cx={r * 0.12} cy={-r * 0.42} r={r * 0.08} />
        <circle cx={-r * 0.08} cy={r * 0.5} r={r * 0.07} />
      </g>
    </g>
  )
}

// ───────────────────────────────────────────── the light show

/**
 * 3-row × 7-column glyphs. Rows are floors 4, 3, 2 (top → bottom); columns are
 * bay columns 4–10 of the facade, with the apex window standing in for the
 * missing top-row column 7. 1 = lit.
 */
const GLYPHS: Record<string, [number[], number[], number[]]> = {
  L: [[1, 0, 0, 0, 0, 0, 0], [1, 0, 0, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1, 1]],
  N: [[1, 1, 0, 0, 0, 0, 1], [1, 0, 1, 1, 1, 0, 1], [1, 0, 0, 0, 0, 1, 1]],
  M: [[1, 1, 0, 1, 0, 1, 1], [1, 0, 1, 0, 1, 0, 1], [1, 0, 0, 0, 0, 0, 1]],
  H: [[1, 0, 0, 0, 0, 0, 1], [1, 1, 1, 1, 1, 1, 1], [1, 0, 0, 0, 0, 0, 1]],
  A: [[0, 0, 1, 1, 1, 0, 0], [0, 1, 1, 1, 1, 1, 0], [1, 1, 0, 0, 0, 1, 1]],
  C: [[0, 1, 1, 1, 1, 1, 1], [1, 0, 0, 0, 0, 0, 0], [0, 1, 1, 1, 1, 1, 1]],
  K: [[1, 0, 0, 0, 1, 1, 0], [1, 1, 1, 1, 0, 0, 0], [1, 0, 0, 0, 1, 1, 0]],
  S: [[0, 1, 1, 1, 1, 1, 1], [0, 0, 1, 1, 1, 0, 0], [1, 1, 1, 1, 1, 1, 0]],
  '9': [[1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0, 1]],
}
const WORD = 'LNMHACKS'

/** The resting look: size hierarchy — large bays bright, small bays soft. */
const restingState = (w: WindowInfo): LightState => (w.kind === 'large' ? 'active' : 'soft')

/**
 * Builds one loop of the show as a per-window timeline (ms):
 *   0–3.0 s   pillars: the large bays light, floor by floor, centre outwards
 *   3.2–6.2 s lattice: the small bays fill in between
 *   6.4–18 s  letters: the whole facade lights up and L N M H A C K S are cut
 *             out of the light one at a time — the letter's windows go dark
 *             while everything else stays lit
 *   18.6 s    wave: a bright crest sweeps left → right, column by column
 *   23 s      crown: the apex and stepped storey pulse, then a centre-out ripple
 *   28 s      loop
 *
 * `ambientIds` are the openings outside the jharokhas (ground niches, tower
 * and turret arches) that glow softly the rest of the time.
 */
function buildShow(ambientIds: string[]): WindowTimeline {
  const windows = HAWA_MAHAL_INVENTORY.windows as readonly WindowInfo[]
  const floor2 = windows.filter((w) => w.floor === 2).slice().sort((a, b) => a.cx - b.cx)
  const colOf = (w: WindowInfo) => {
    if (w.floor === 5) return 7
    let best = 1
    let dist = Infinity
    floor2.forEach((f, i) => {
      const d = Math.abs(f.cx - w.cx)
      if (d < dist) {
        dist = d
        best = i + 1
      }
    })
    return best
  }
  const cols = new Map(windows.map((w) => [w.id, colOf(w)]))
  const tl: WindowTimeline = {}
  const at = (id: string, t: number, state: LightState, transitionMs?: number) =>
    (tl[id] ??= []).push(transitionMs === undefined ? { at: Math.round(t), state } : { at: Math.round(t), state, transitionMs })
  const byDist = (list: WindowInfo[]) => list.slice().sort((a, b) => Math.abs(a.cx - 1004) - Math.abs(b.cx - 1004))

  // pillars
  let t = 0
  for (const floor of [2, 3, 4, 5]) {
    const larges = byDist(windows.filter((w) => w.floor === floor && w.kind === 'large'))
    larges.forEach((w, i) => {
      const delay = t + Math.floor(i / 2) * 260
      at(w.id, delay, 'accent')
      at(w.id, delay + 850, 'active')
    })
    t += 900
  }
  // lattice
  t = 3200
  for (const floor of [2, 3, 4]) {
    const smalls = byDist(windows.filter((w) => w.floor === floor && w.kind === 'small'))
    smalls.forEach((w, i) => {
      const delay = t + Math.floor(i / 2) * 220
      at(w.id, delay, 'active')
      at(w.id, delay + 700, 'soft')
    })
    t += 1000
  }
  // letters on the 3 × 7 field (cols 4–10; floor 5 is the top-row centre)
  const field = windows.filter((w) => {
    const c = cols.get(w.id)!
    return c >= 4 && c <= 10 && (w.floor !== 4 || c !== 7)
  })
  const rowOf = (w: WindowInfo) => (w.floor === 2 ? 2 : w.floor === 3 ? 1 : 0)
  const lettersStart = 6400
  const LETTER_ON = 1000 // a letter is shown this long …
  const LETTER_GAP = 320 // … then the whole facade is lit again before the next one
  // inverted letters: the whole facade blazes and each letter is cut out of
  // the light as dark windows. Panes switch fast so every frame is crisp.
  windows.forEach((w, i) => at(w.id, lettersStart, 'accent', i === 0 ? 160 : undefined))
  for (const id of ambientIds) at(id, lettersStart, 'active')
  WORD.split('').forEach((ch, i) => {
    const glyph = GLYPHS[ch]
    const t0 = lettersStart + 700 + i * (LETTER_ON + LETTER_GAP)
    for (const w of field) {
      if (glyph[rowOf(w)][cols.get(w.id)! - 4] !== 1) continue
      at(w.id, t0, 'off')
      at(w.id, t0 + LETTER_ON, 'accent')
    }
  })
  const lettersEnd = lettersStart + 700 + WORD.length * (LETTER_ON + LETTER_GAP) + 300
  // back to the resting look with the normal, soft fade
  windows.forEach((w, i) => at(w.id, lettersEnd, restingState(w), i === 0 ? 650 : undefined))
  for (const id of ambientIds) at(id, lettersEnd, 'soft')
  // wave left → right
  const waveStart = lettersEnd + 600
  for (const w of windows) {
    const c = cols.get(w.id)!
    at(w.id, waveStart + (c - 1) * 300, 'accent')
    at(w.id, waveStart + (c - 1) * 300 + 480, restingState(w))
  }
  // crown pulses and a centre-out ripple
  const crownStart = waveStart + 13 * 300 + 900
  for (const pulse of [0, 1300]) {
    for (const w of windows.filter((w) => w.floor >= 4)) {
      at(w.id, crownStart + pulse, 'accent')
      at(w.id, crownStart + pulse + 700, restingState(w))
    }
  }
  const rippleStart = crownStart + 2800
  for (const w of windows) {
    const d = Math.abs(w.cx - 1004)
    at(w.id, rippleStart + d * 0.9, 'accent')
    at(w.id, rippleStart + d * 0.9 + 420, restingState(w))
  }
  // hold the resting look until the loop restarts
  const end = rippleStart + 850 * 0.9 + 1800
  for (const w of windows) at(w.id, end, restingState(w))
  return tl
}

// ───────────────────────────────────────────── footer

export function HawaMahalFooter() {
  const stageRef = useRef<HTMLDivElement>(null)
  const lightsRef = useRef<HawaMahalLights | null>(null)
  const showRef = useRef<{ stop(): void } | null>(null)
  const stars = useMemo(() => buildStars(), [])

  const startShow = useCallback((lights: HawaMahalLights) => {
    const resting = () => {
      for (const w of lights.windows()) lights.setWindowLight(w.id, restingState(w))
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      resting()
      return
    }
    const ambient = [
      ...lights.nicheIds(),
      ...lights.openingIds().filter((id) => id.startsWith('tower-') || id.startsWith('turret-')),
    ]
    showRef.current = lights.playTimeline(buildShow(ambient), { loop: true })
  }, [])

  const onReady = useCallback((lights: HawaMahalLights) => {
    lightsRef.current = lights
    // the ground niches and tower/turret arches glow faintly from the floodlighting
    for (const id of lights.nicheIds()) lights.setWindowLight(id, 'soft')
    for (const id of lights.openingIds()) {
      if (id.startsWith('tower-') || id.startsWith('turret-')) lights.setWindowLight(id, 'soft')
    }
  }, [])

  // Scroll-linked reveal: --reveal goes 0 → 1 as the stage rises into the
  // viewport from below and then stays at 1. IntersectionObserver thresholds
  // keep this off the scroll path entirely.
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.setProperty('--reveal', '1')
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        const box = entry.boundingClientRect
        const viewportBottom = entry.rootBounds?.bottom ?? window.innerHeight
        const r = Math.max(0, Math.min(1, (viewportBottom - box.top) / (box.height * 0.8)))
        el.style.setProperty('--reveal', r.toFixed(3))
      },
      { threshold: Array.from({ length: 41 }, (_, i) => i / 40) },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => () => showRef.current?.stop(), [])

  return (
    <footer id="hawa-mahal-footer" className="relative z-40 mt-auto w-full" style={{ '--footer-base': FACADE_BASE_COLOUR.night } as React.CSSProperties}>
      <div ref={stageRef} className={styles.stage}>
        {/* dusk: the page colour blends into the night sky */}
        <div className={styles.sky} aria-hidden="true" />
        <div className={styles.horizon} aria-hidden="true" />

        {/* the moon hangs on the left, above the left tower */}
        <svg className={styles.moonBox} viewBox="-112 -112 224 224">
          <defs>
            <radialGradient id="hmf-moon-halo">
              <stop offset="0%" stopColor="#fff3c4" stopOpacity="0.55" />
              <stop offset="40%" stopColor="#ffe9a8" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="hmf-moon-face" cx="38%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#fffbe9" />
              <stop offset="70%" stopColor="#f3e6b8" />
              <stop offset="100%" stopColor="#d9c99a" />
            </radialGradient>
          </defs>
          <Moon cx={0} cy={0} r={42} />
        </svg>

        <div className={styles.building}>
          {/* stars and moon share the facade's coordinate space so they sit in real sky */}
          <svg className={styles.skyLayer} viewBox="0 0 2022 778" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
            {stars.map((s, i) => (
              <g key={i} className={styles.star} style={{ animationDuration: `${s.dur}s`, animationDelay: `${s.delay}s` }}>
                <circle cx={s.x} cy={s.y} r={s.r} fill="#fff" />
                {s.bright && (
                  <path
                    d={`M${s.x - s.r * 3.2},${s.y} H${s.x + s.r * 3.2} M${s.x},${s.y - s.r * 3.2} V${s.y + s.r * 3.2}`}
                    stroke="#fff" strokeWidth="0.6" opacity="0.55" vectorEffect="non-scaling-stroke"
                  />
                )}
              </g>
            ))}
          </svg>

          <HawaMahalFacade
            ref={lightsRef}
            palette="night"
            preserveAspectRatio="xMidYMax meet"
            className={styles.facade}
            onReady={onReady}
            autoSequence={{
              order: 'up',
              state: 'accent',
              settleTo: 'active',
              // every window on its own time: floor by floor, spreading out from the axis
              timing: (w) => ({ delay: (w.floor - 2) * 520 + Math.abs(w.cx - 1004) * 0.55, hold: 650 }),
              onDone: () => lightsRef.current && startShow(lightsRef.current),
            }}
            aria-label="Vector illustration of Hawa Mahal, Jaipur, lit at night"
          />
        </div>
      </div>

      {/* The information band continues the facade's plinth: same colour, no seam. */}
      <div className={`${styles.footerContent} relative z-10 w-full px-4 pb-10 pt-8 sm:px-8 sm:pb-12 sm:pt-10 lg:px-14`}>
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col items-start pr-0 lg:col-span-5 lg:pr-6">
            {/* same face as the navbar logo */}
            <h2
              className="mb-3 select-none text-2xl uppercase leading-none tracking-wide text-[#f4dcb6] sm:text-3xl"
              style={{
                fontFamily: '"Rogient Block", "rogient-block", sans-serif',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.28))',
              }}
            >
              LNMHACKS 9.0
            </h2>
            <p className="mb-4 max-w-md text-xs leading-relaxed text-[#f4dcb6]/80 sm:text-sm" style={{ fontFamily: '"tiktok", sans-serif' }}>
              The largest student-run hackathon in India. 72 hours of pure innovation, workshops, and developer culture.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-1 sm:gap-8 lg:col-span-7">
            <nav aria-label="Navigation">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#ffd27a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ffd27a]" /> Navigation
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#hero" className={linkClass}>Home</a></li>
                <li><a href="#about" className={linkClass}>About</a></li>
                <li><a href="#glimpses" className={linkClass}>Glimpses</a></li>
                <li><a href="#sponsors" className={linkClass}>Sponsors</a></li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('arrow-section')
                      if (!el) return
                      const top = el.getBoundingClientRect().top + window.scrollY
                      window.scrollTo({ top: top + 2.4 * window.innerHeight, behavior: 'smooth' })
                    }}
                    className={`${linkClass} cursor-pointer text-left`}
                  >Timeline</button>
                </li>
              </ul>
            </nav>

            <nav aria-label="Community">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#ffd27a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ffd27a]" /> Community
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="https://discord.gg/wsFFY3Yc85" target="_blank" rel="noreferrer" className={linkClass}>Discord ↗</a></li>
                <li><a href="https://x.com/LNMHacks" target="_blank" rel="noreferrer" className={linkClass}>Twitter / X ↗</a></li>
                <li><a href="https://www.instagram.com/lnmhacks/" target="_blank" rel="noreferrer" className={linkClass}>Instagram ↗</a></li>
              </ul>
            </nav>

            <nav aria-label="Resources">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#ffd27a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ffd27a]" /> Resources
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><button type="button" onClick={() => triggerPageTransition('/hack-guide')} className={`${linkClass} text-left`}>Hack Guide</button></li>
                <li><button type="button" onClick={() => triggerPageTransition('/rules-tracks')} className={`${linkClass} text-left`}>Rules &amp; Tracks</button></li>
                <li><button type="button" onClick={() => triggerPageTransition('/code-of-conduct')} className={`${linkClass} text-left`}>Code of Conduct</button></li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="mx-auto mt-8 flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-[#f4dcb6]/25 pt-4 text-xs text-[#f4dcb6]/75">
          <span>&copy; {new Date().getFullYear()} LNMHACKS 9.0™</span>
          <span className="text-[10px] text-[#f4dcb6]/65 sm:text-[11px]">Jaipur, Rajasthan, India · Reach out via Discord, X &amp; Instagram</span>
        </div>
      </div>
    </footer>
  )
}
