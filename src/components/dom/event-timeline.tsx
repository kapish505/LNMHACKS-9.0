'use client'

import React, { useRef, useEffect, useCallback } from 'react'
import { subscribeLenisScroll } from '@/lib/scroll-bus'
import { getArrowSectionVH } from '@/lib/arrow-section-progress'
import { useLenis } from 'lenis/react'

/* ─── Smoothstep Helper ─── */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/* ─── Timeline Milestones Configuration ─── */
interface Milestone {
  id: number
  stepNumber: string
  title: string
  date: string
  time: string
  location: string
  desc: string
  accentColor: string
  /** Same colour as `accentColor`, as an "r, g, b" triple so the scroll loop
   *  can build rgba() strings without parsing hex on the hot path. */
  accentRgb: string
}

const MILESTONES: Milestone[] = [
  {
    id: 1,
    stepNumber: '01',
    title: 'Registration & Squad Assembly',
    date: 'OCTOBER 24, 2026',
    time: '10:00 AM IST',
    location: 'GLOBAL VIRTUAL PORTAL',
    desc: 'Registration officially opens worldwide. Assemble your squad of 2–4 hackers, claim your hacker identity, and unlock exclusive partner bounties and Discord lounges.',
    accentColor: '#63c4fd',
    accentRgb: '99, 196, 253',
  },
  {
    id: 2,
    stepNumber: '02',
    title: 'Opening Keynote & Ignition',
    date: 'OCTOBER 24, 2026',
    time: '06:00 PM IST',
    location: 'MAIN AUDITORIUM & LIVESTREAM',
    desc: 'The official ignition protocol begins. Keynote talks from industry leaders, surprise track themes reveal, API credentials release, and live Q&A briefing.',
    accentColor: '#fb3377',
    accentRgb: '251, 51, 119',
  },
  {
    id: 3,
    stepNumber: '03',
    title: '72-Hour Continuous Forge',
    date: 'OCTOBER 24–27, 2026',
    time: '08:00 PM IST START',
    location: 'HACKER LABS & DISCORD ARENA',
    desc: '72 hours of uninterrupted building. Free-flowing caffeine, midnight snacks, hardware lab benches, git commits, and real-time mentor office hours across all tracks.',
    accentColor: '#c0fe04',
    accentRgb: '192, 254, 4',
  },
  {
    id: 4,
    stepNumber: '04',
    title: 'Mentorship & Code Clinics',
    date: 'OCTOBER 26, 2026',
    time: '02:00 PM – 06:00 PM IST',
    location: '1-ON-1 TECH CLINICS',
    desc: 'Direct 1-on-1 architecture reviews and blocker debugging with staff engineers and VC mentors. Validate your product market fit before final submission.',
    // Was #f59e0b (amber) — off the site's palette entirely.
    accentColor: '#63c4fd',
    accentRgb: '99, 196, 253',
  },
  {
    id: 5,
    stepNumber: '05',
    title: 'Code Freeze & Vault Submission',
    date: 'OCTOBER 27, 2026',
    time: '08:00 PM IST SHARP',
    location: 'DEVPOST & GIT GATEWAY',
    desc: 'Repository lock for all teams. Submit your live demo video, architecture documentation, and final commits to Devpost. The gate closes with zero exceptions.',
    accentColor: '#1e60ff',
    accentRgb: '30, 96, 255',
  },
  {
    id: 6,
    stepNumber: '06',
    title: 'Grand Finale & Apex Awards',
    date: 'OCTOBER 28, 2026',
    time: '11:00 AM IST',
    location: 'CENTRAL AUDITORIUM',
    desc: 'Top 10 finalist squads take the stage for 3-minute live pitches. Grand jury evaluation, trophy distribution, venture funding invites, and closing celebrations.',
    // Was #a855f7 (purple) — off-palette. Lime is the site's peak accent, which
    // suits the finale.
    accentColor: '#c0fe04',
    accentRgb: '192, 254, 4',
  },
]

export function EventTimeline() {
  const lenis = useLenis()

  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])
  const activeStatesRef = useRef<(boolean | undefined)[]>([])

  useEffect(() => {
    let ticking = false
    // Tracks whether the container is already in the hidden state, so the
    // hide path does not rewrite display/opacity/pointerEvents on every scroll
    // frame for the ~744vh of this page where the timeline is not on screen.
    let hidden: boolean | null = null

    const updateTimeline = () => {
      ticking = false
      const aVH = getArrowSectionVH()

      const FADE_IN_START = 2.0
      const FADE_IN_END = 2.4
      // Fade-out pushed out by 1.0vh so this section occupies 25% more scroll
      // (window 2.0→7.0 instead of 2.0→6.0). The backward CursorArrow
      // cross-fades in over exactly this range, so its REV_FADE_* constants
      // moved with it.
      const FADE_OUT_START = 6.6
      const FADE_OUT_END = 7.0

      const el = containerRef.current

      const hide = () => {
        if (hidden === true) return
        hidden = true
        if (el) {
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
          el.style.display = 'none'
        }
      }

      if (aVH < FADE_IN_START || aVH > FADE_OUT_END) {
        hide()
        return
      }

      const fadeIn = smoothstep(FADE_IN_START, FADE_IN_END, aVH)
      const fadeOut = 1 - smoothstep(FADE_OUT_START, FADE_OUT_END, aVH)
      const op = fadeIn * fadeOut

      if (op <= 0.01) {
        hide()
        return
      }

      hidden = false
      if (el) {
        el.style.display = 'flex'
        el.style.opacity = op.toFixed(3)
        el.style.pointerEvents = op > 0.1 ? 'auto' : 'none'
      }

      // Card progression now spans 2.2 → 6.5 (4.3 VH instead of 3.5), so each
      // step holds the centre ~25% longer before the next one rotates in.
      const scrollProgress = Math.max(0, Math.min(1, (aVH - 2.2) / (6.5 - 2.2)))
      const currentStep = scrollProgress * (MILESTONES.length - 1)

      // ─── Update 3D Sticky Spiral Transforms for each card ───
      const isMobile = window.innerWidth < 768
      const radiusX = isMobile ? 200 : 380
      const radiusZ = isMobile ? 450 : 700
      // Vertical pitch per step. Raised so the helix climbs over a much taller
      // Y span — the cards now sweep up past the viewport instead of stacking
      // in a shallow band near the centre.
      const pitchY = isMobile ? 100 : 170
      const stepAngle = 0.75

      cardRefs.current.forEach((cardEl, i) => {
        if (!cardEl) return

        const offset = i - currentStep
        const theta = offset * stepAngle

        const x = Math.sin(theta) * radiusX
        const z = (Math.cos(theta) - 1) * radiusZ
        const y = offset * pitchY

        const rotateY = -theta * (180 / Math.PI) * 0.85
        const rotateX = offset * 3.5

        const distFromCenter = Math.abs(offset)
        const scale = Math.max(0.45, 1 - distFromCenter * 0.14)
        const opacity = Math.max(0.08, Math.min(1, 1 - distFromCenter * 0.30))
        const zIndex = Math.round(1000 + z)

        const isActiveCard = distFromCenter < 0.45

        cardEl.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${rotateY.toFixed(2)}deg) rotateX(${rotateX.toFixed(2)}deg) scale(${scale.toFixed(3)})`
        cardEl.style.opacity = opacity.toFixed(3)
        cardEl.style.zIndex = String(zIndex)

        // borderColor and boxShadow were reassigned every frame regardless of
        // whether the value changed. Each card carries backdrop-blur-xl inside
        // a preserve-3d stage, so touching a paint property invalidated the
        // backdrop and forced all six cards to re-blur on every frame. Only
        // write when the active state actually flips.
        if (activeStatesRef.current[i] !== isActiveCard) {
          activeStatesRef.current[i] = isActiveCard
          // Glow now uses the card's own accent instead of a flat purple that
          // appeared nowhere else on the site. The inset hairline is the lit
          // top edge that reads as a polished panel rather than a flat fill.
          const rgb = MILESTONES[i].accentRgb
          if (isActiveCard) {
            cardEl.style.borderColor = `rgba(${rgb}, 0.5)`
            cardEl.style.boxShadow =
              `0 0 50px rgba(${rgb}, 0.18),` +
              ` 0 0 110px rgba(${rgb}, 0.07),` +
              ` 0 30px 80px rgba(0, 0, 0, 0.90),` +
              ` inset 0 1px 0 rgba(255, 255, 255, 0.08)`
          } else {
            cardEl.style.borderColor = 'rgba(255, 255, 255, 0.075)'
            cardEl.style.boxShadow =
              `0 20px 60px rgba(0, 0, 0, 0.80),` +
              ` inset 0 1px 0 rgba(255, 255, 255, 0.04)`
          }
        }
      })
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(updateTimeline)
      }
    }

    updateTimeline()

    const unsubLenis = subscribeLenisScroll(onScroll)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      unsubLenis()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const scrollToMilestone = useCallback(
    (index: number) => {
      const arrowSection = document.getElementById('arrow-section')
      if (!arrowSection) return

      const vh = window.innerHeight || 800
      // Map milestone index back to VH position within the 2.2–6.5 range
      const targetVH = 2.2 + (index / (MILESTONES.length - 1)) * (6.5 - 2.2)
      const arrowTop = arrowSection.getBoundingClientRect().top + window.scrollY
      const targetScroll = arrowTop + targetVH * vh

      if (lenis) {
        lenis.scrollTo(targetScroll, { duration: 1.2 })
      } else {
        window.scrollTo({ top: targetScroll, behavior: 'smooth' })
      }
    },
    [lenis]
  )

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-30 pointer-events-none flex items-center justify-center px-4 sm:px-8 lg:px-14 transition-opacity duration-150 select-none overflow-hidden"
      style={{ opacity: 0, pointerEvents: 'none', display: 'none' }}
    >
      {/* ─── 3D Sticky Spiral Stage ─── */}
      <div
        className="relative w-full max-w-5xl flex items-center justify-center pointer-events-none"
        style={{
          perspective: '1200px',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="relative w-full flex items-center justify-center pointer-events-auto"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {MILESTONES.map((m, idx) => (
            <div
              key={m.id}
              ref={(el) => {
                cardRefs.current[idx] = el
              }}
              onClick={() => scrollToMilestone(idx)}
              className="absolute w-[88vw] sm:w-[480px] md:w-[540px] rounded-2xl cursor-pointer select-none border border-white/[0.07] backdrop-blur-xl overflow-hidden"
              style={{
                transformStyle: 'preserve-3d',
                backfaceVisibility: 'visible',
                willChange: 'transform, opacity',
                /*
                 * Replaces the flat `bg-[#0a0e14]` fill. Four stacked layers,
                 * all pure colour — no geometry changes:
                 *   1. top sheen, the lit edge of a polished panel
                 *   2. fine vertical hairlines, echoing the speed lines behind
                 *      the stage so the card belongs to this section
                 *   3. a corner bloom in the card's own accent
                 *   4. deep navy body, from the site's #090d16 family, left
                 *      ~2% translucent so the existing backdrop-blur actually
                 *      catches a whisper of the lines without hurting legibility
                 */
                background: [
                  'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0) 22%)',
                  'repeating-linear-gradient(90deg, rgba(255,255,255,0.016) 0px, rgba(255,255,255,0.016) 1px, rgba(255,255,255,0) 1px, rgba(255,255,255,0) 7px)',
                  `radial-gradient(125% 95% at 0% 0%, rgba(${m.accentRgb},0.11) 0%, rgba(${m.accentRgb},0) 58%)`,
                  'linear-gradient(165deg, rgba(18,26,40,0.97) 0%, rgba(11,16,24,0.975) 48%, rgba(7,10,17,0.98) 100%)',
                ].join(', '),
              }}
            >
              {/* Accent top edge */}
              <div
                className="h-[3px] w-full"
                style={{
                  // White specular at the leading edge, then the accent, then a
                  // long soft tail — reads as a lit chrome rule instead of a
                  // single hard colour stop.
                  background: `linear-gradient(90deg, rgba(255,255,255,0.9) 0%, ${m.accentColor} 13%, ${m.accentColor} 40%, rgba(${m.accentRgb},0.28) 72%, rgba(${m.accentRgb},0) 93%)`,
                }}
              />

              <div className="relative px-7 sm:px-9 py-6 sm:py-8">
                {/* Large watermark step number */}
                <span
                  className="absolute top-3 right-5 text-[5rem] sm:text-[6.5rem] font-black leading-none select-none pointer-events-none"
                  style={{
                    fontFamily: '"tiktok", sans-serif',
                    // Was a flat white/3%. Tinting it with the accent makes the
                    // watermark read as deliberate branding rather than grime.
                    color: `rgba(${m.accentRgb}, 0.07)`,
                  }}
                >
                  {m.stepNumber}
                </span>

                {/* Step label */}
                <span
                  className="inline-block text-[11px] sm:text-xs tracking-[0.15em] uppercase mb-3"
                  style={{
                    fontFamily: '"tiktok", sans-serif',
                    fontWeight: 600,
                    color: m.accentColor,
                    textShadow: `0 0 18px rgba(${m.accentRgb}, 0.45)`,
                  }}
                >
                  Step {m.stepNumber}
                </span>

                {/* Title */}
                <h3
                  className="text-[1.5rem] sm:text-[1.75rem] md:text-[2rem] leading-[1.15] tracking-[-0.02em]"
                  style={{
                    fontFamily: '"tiktok", sans-serif',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.97)',
                  }}
                >
                  {m.title}
                </h3>

                {/* Description */}
                <p
                  className="mt-4 text-[13px] sm:text-[15px] leading-[1.7]"
                  style={{ fontFamily: '"tiktok", sans-serif', color: 'rgba(255,255,255,0.56)' }}
                >
                  {m.desc}
                </p>

                {/* Date & Time */}
                <p
                  className="mt-5 text-[10px] sm:text-[11px] tracking-[0.08em] uppercase"
                  style={{ fontFamily: '"tiktok", sans-serif', color: 'rgba(255,255,255,0.32)' }}
                >
                  {m.date} · {m.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
