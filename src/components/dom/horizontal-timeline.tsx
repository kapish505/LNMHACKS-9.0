'use client'

import { useEffect, useRef } from 'react'
import { subscribeLenisScroll } from '@/lib/scroll-bus'
import { getArrowSectionVH } from '@/lib/arrow-section-progress'

/* ─── Milestones ─── */
interface Milestone {
  id: string
  step: string
  title: string
  date: string
  time: string
  desc: string
}

const MILESTONES: Milestone[] = [
  { id: 'register', step: '01', title: 'Registration & squad assembly', date: 'Oct 24', time: '10:00 IST', desc: 'Registration opens worldwide. Assemble a squad of two to four and claim your hacker identity.' },
  { id: 'keynote', step: '02', title: 'Opening keynote & ignition', date: 'Oct 24', time: '18:00 IST', desc: 'Keynotes from industry leaders, the track reveal, API credentials and a live briefing.' },
  { id: 'forge', step: '03', title: '72-hour continuous forge', date: 'Oct 24 – 27', time: '20:00 IST start', desc: 'Three days of uninterrupted building with hardware benches, caffeine and mentor office hours.' },
  { id: 'clinics', step: '04', title: 'Mentorship & code clinics', date: 'Oct 26', time: '14:00 – 18:00 IST', desc: 'One-on-one architecture reviews and blocker debugging with staff engineers before the final push.' },
  { id: 'freeze', step: '05', title: 'Code freeze & submission', date: 'Oct 27', time: '20:00 IST sharp', desc: 'Repositories lock. Demo video, documentation and final commits go in — the gate closes on time.' },
  { id: 'finale', step: '06', title: 'Grand finale & Apex Awards', date: 'Oct 28', time: '11:00 IST', desc: 'The top squads pitch live, the jury deliberates, trophies and funding invites are handed out.' },
]

/* ─── Geometry (vw units; the mobile variant is applied via CSS classes below) ─── */
const START = 8 // first dot, vw from the track origin
const SPACING = 34 // distance between dots, vw

const MANROPE = 'var(--font-manrope), "Manrope", sans-serif'
const MONO = '"tronica-mono", "Courier New", monospace'
const DISPLAY = '"Rogient Block", "rogient-block", sans-serif'

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const easeOut = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t)

type ItemRefs = { dot: HTMLDivElement | null; stem: HTMLDivElement | null; masks: (HTMLDivElement | null)[] }

/**
 * The event timeline as a pinned horizontal rule. While the arrow section
 * scrolls (aVH 2.0 → 7.0) the track slides left and the rule draws itself; a
 * milestone sits faintly in place until the rule reaches its dot — the stem extends, the dot
 * fills and its copy comes up to full strength. Same scroll signal as the cursor
 * arrow, so the two stay in step.
 */
export function HorizontalTimeline() {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLSpanElement>(null)
  const itemRefs = useRef<Record<string, ItemRefs>>({})
  // ref callbacks run at commit time, so the ref map is only touched there
  const bindPart = (id: string, part: 'dot' | 'stem') => (el: HTMLDivElement | null) => {
    const entry = (itemRefs.current[id] ??= { dot: null, stem: null, masks: [] })
    entry[part] = el
  }
  const bindMask = (id: string, k: number) => (el: HTMLDivElement | null) => {
    const entry = (itemRefs.current[id] ??= { dot: null, stem: null, masks: [] })
    entry.masks[k] = el
  }

  useEffect(() => {
    let ticking = false
    let hidden: boolean | null = null
    let lastStep = -1
    const el = containerRef.current

    const hide = () => {
      if (hidden === true) return
      hidden = true
      if (el) {
        el.style.opacity = '0'
        el.style.display = 'none'
      }
    }

    const update = () => {
      ticking = false
      const aVH = getArrowSectionVH()
      if (aVH < 2.0 || aVH > 7.0) return hide()
      const op = smoothstep(2.0, 2.4, aVH) * (1 - smoothstep(6.6, 7.0, aVH))
      if (op <= 0.01) return hide()
      hidden = false
      if (el) {
        el.style.display = 'block'
        el.style.opacity = op.toFixed(3)
      }

      const p = clamp01((aVH - 2.2) / (6.5 - 2.2))
      const mobile = window.innerWidth < 768
      const start = mobile ? 10 : START
      const spacing = mobile ? 74 : SPACING
      // the rule's tip travels from the origin to the last dot; the track only
      // starts sliding once the tip passes the reading position, so the first
      // milestone is read in place and the active one then holds that spot
      const tip = start + spacing * (MILESTONES.length - 1) * p
      const slide = Math.max(0, tip - (mobile ? 18 : 40))
      if (trackRef.current) trackRef.current.style.transform = `translate3d(${(-slide).toFixed(3)}vw, 0, 0)`
      if (fillRef.current) fillRef.current.style.width = `${tip.toFixed(3)}vw`

      let current = 0
      MILESTONES.forEach((m, i) => {
        const refs = itemRefs.current[m.id]
        if (!refs) return
        const x = start + spacing * i
        // a milestone activates as the rule's tip crosses its dot
        const local = clamp01((tip - x + spacing * 0.12) / (spacing * 0.42))
        if (local > 0.5) current = i
        const draw = easeOut(clamp01(local / 0.5))
        // upcoming milestones sit faintly in place (hollow dot, dim copy) and
        // come up to full strength as the rule reaches them
        if (refs.dot) refs.dot.style.transform = `translate(-50%, -50%) scale(${(0.6 + 0.4 * draw).toFixed(3)})`
        if (refs.dot) refs.dot.style.opacity = (0.35 + 0.65 * draw).toFixed(3)
        if (refs.stem) refs.stem.style.transform = `scaleY(${draw.toFixed(3)})`
        refs.masks.forEach((mask, k) => {
          if (!mask) return
          const reveal = easeOut(clamp01((local - 0.3 - k * 0.1) / 0.5))
          mask.style.transform = `translate3d(0, ${((1 - reveal) * 16).toFixed(2)}%, 0)`
          mask.style.opacity = (0.28 + 0.72 * reveal).toFixed(3)
        })
      })
      if (current !== lastStep) {
        lastStep = current
        if (readoutRef.current) readoutRef.current.textContent = MILESTONES[current].step
      }
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }
    update()
    const unsub = subscribeLenisScroll(onScroll)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      unsub()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const accentBg = 'bg-[#1e60ff] dark:bg-[#c0fe04]'
  const accentText = 'text-[#1e60ff] dark:text-[#c0fe04]'
  const ink = 'text-black dark:text-white'
  const muted = 'text-black/55 dark:text-white/55'

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-30 select-none overflow-hidden"
      style={{ opacity: 0, display: 'none' }}
      aria-hidden="true"
    >
      {/* fixed header */}
      <div className="absolute inset-x-0 top-[clamp(4.75rem,11vh,6.5rem)] flex items-end justify-between px-4 sm:px-8 lg:px-14">
        <div>
          <p className={`mb-2 text-[11px] uppercase tracking-[0.3em] ${muted}`} style={{ fontFamily: MONO }}>
            [ Timeline ]
          </p>
          <h2 className={`text-[clamp(2.2rem,5vw,4.5rem)] uppercase leading-[0.95] ${ink}`} style={{ fontFamily: DISPLAY }}>
            Schedule
          </h2>
        </div>
        <div className="hidden text-right sm:block">
          <p className={`text-sm ${muted}`} style={{ fontFamily: MANROPE }}>
            October 24 — 28, 2026 · LNMIIT, Jaipur
          </p>
          <p className={`mt-1 text-[11px] uppercase tracking-[0.3em] ${muted}`} style={{ fontFamily: MONO }}>
            <span ref={readoutRef} className={accentText}>01</span> / {MILESTONES[MILESTONES.length - 1].step}
          </p>
        </div>
      </div>

      {/* the rule and the milestones, sliding together */}
      <div ref={trackRef} className="absolute left-0 top-[58vh] h-0 w-[300vw] will-change-transform max-md:top-[54vh]">
        <div className="absolute left-0 top-0 h-px w-full bg-black/10 dark:bg-white/10" />
        <div ref={fillRef} className={`absolute left-0 top-0 h-px w-0 ${accentBg}`} />

        {MILESTONES.map((m, i) => {
          const above = i % 2 === 0
          return (
            <div
              key={m.id}
              className="absolute top-0 w-[26vw] left-[var(--x)] max-md:w-[64vw] max-md:left-[var(--xm)]"
              style={{ ['--x' as string]: `${START + SPACING * i}vw`, ['--xm' as string]: `${10 + 74 * i}vw` } as React.CSSProperties}
            >
              {/* dot on the rule, ringed in the page colour */}
              <div
                ref={bindPart(m.id, 'dot')}
                className={`absolute left-0 top-0 h-[10px] w-[10px] rounded-full ring-4 ring-[var(--background)] ${accentBg}`}
                style={{ transform: 'translate(-50%, -50%) scale(0)' }}
              />
              {/* stem */}
              <div
                ref={bindPart(m.id, 'stem')}
                className={`absolute left-0 w-px ${accentBg} ${above ? 'bottom-0 origin-bottom' : 'top-0 origin-top'} h-[5.5vw] max-md:h-[12vw]`}
                style={{ transform: 'scaleY(0)', opacity: 0.7 }}
              />
              {/* copy, anchored to the far end of the stem */}
              <div className={`absolute left-0 w-full ${above ? 'bottom-[6.6vw] max-md:bottom-[14vw]' : 'top-[6.6vw] max-md:top-[14vw]'}`}>
                <div className={`flex flex-col ${above ? 'justify-end' : ''} gap-[0.7vw] max-md:gap-[2vw]`}>
                  <div className="overflow-hidden">
                    <div ref={bindMask(m.id, 0)} className="will-change-transform" style={{ opacity: 0 }}>
                      <p className={`flex items-baseline gap-3 text-[0.8vw] uppercase tracking-[0.25em] max-md:text-[3vw] ${muted}`} style={{ fontFamily: MONO }}>
                        <span className={accentText}>{m.step}</span>
                        <span>{m.date} · {m.time}</span>
                      </p>
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <div ref={bindMask(m.id, 1)} className="will-change-transform" style={{ opacity: 0 }}>
                      <h3 className={`pb-[0.12em] text-[1.75vw] font-semibold leading-[1.12] tracking-[-0.01em] max-md:text-[5.6vw] ${ink}`} style={{ fontFamily: MANROPE }}>
                        {m.title}
                      </h3>
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <div ref={bindMask(m.id, 2)} className="will-change-transform" style={{ opacity: 0 }}>
                      <p className={`max-w-[24vw] text-[0.95vw] leading-[1.55] max-md:max-w-none max-md:text-[3.9vw] ${muted}`} style={{ fontFamily: MANROPE }}>
                        {m.desc}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
