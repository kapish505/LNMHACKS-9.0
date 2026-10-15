'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
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
  phase: string
  title: string
  subtitle: string
  date: string
  time: string
  location: string
  desc: string
  tags: string[]
  accentColor: string
  peakVH: number
}

const MILESTONES: Milestone[] = [
  {
    id: 1,
    phase: 'PHASE 01',
    title: 'REGISTRATION & PORTAL OPEN',
    subtitle: 'ENLIST SQUADRON & INITIALIZE',
    date: 'OCTOBER 24, 2026',
    time: '10:00 AM IST',
    location: 'GLOBAL VIRTUAL PORTAL',
    desc: 'Registration officially goes live worldwide. Form squads of 2–4 builders, claim your hacker identity, and access exclusive partner bounties and Discord lounges.',
    tags: ['OPEN TO ALL', 'TEAM FORMATION', 'BOUNTY RELEASE', 'DISCORD HUB'],
    accentColor: '#63c4fd',
    peakVH: 2.4,
  },
  {
    id: 2,
    phase: 'PHASE 02',
    title: 'OPENING KEYNOTE & IGNITION',
    subtitle: 'SYSTEMS ONLINE // LAUNCH SEQUENCE',
    date: 'OCTOBER 24, 2026',
    time: '06:00 PM IST',
    location: 'MAIN AUDITORIUM & STREAM',
    desc: 'The official ignition protocol begins. Keynote talks from industry luminaries, reveal of surprise track themes, API credentials release, and live Q&A briefing.',
    tags: ['LIVESTREAM', 'TRACK REVEAL', 'SPONSOR CREDITS', 'MISSION BRIEF'],
    accentColor: '#fb3377',
    peakVH: 3.0,
  },
  {
    id: 3,
    phase: 'PHASE 03',
    title: '72-HOUR HACKING SPRINT',
    subtitle: 'UNINTERRUPTED CODE & HARDWARE FORGE',
    date: 'OCTOBER 24–27, 2026',
    time: '08:00 PM IST (START)',
    location: 'HACKATHON CAMPUS & DISCORD',
    desc: '72 hours of relentless build time. Free flow of coffee, lightning workshops, midnight arcade gaming, git commits, and real-time mentor office hours across all tracks.',
    tags: ['72 HOURS SPRINT', 'MIDNIGHT SNACKS', 'DEV SANDBOX', 'GIT COMMITS'],
    accentColor: '#1e60ff',
    peakVH: 3.6,
  },
  {
    id: 4,
    phase: 'PHASE 04',
    title: 'MENTORSHIP & ARCHITECTURE REVIEW',
    subtitle: 'SYNAPSE RADAR // EXPERT GUIDANCE',
    date: 'OCTOBER 25–26, 2026',
    time: '02:00 PM – 06:00 PM IST',
    location: '1-ON-1 MENTOR CLINICS',
    desc: 'Direct 1-on-1 code reviews with staff engineers and venture leaders. Validate your product market fit, optimize system architecture, and eliminate blocker bugs.',
    tags: ['1:1 CRITIQUE', 'TECH ARCHITECTURE', 'VC INSIGHT', 'DEBUG SUPPORT'],
    accentColor: '#63c4fd',
    peakVH: 4.2,
  },
  {
    id: 5,
    phase: 'PHASE 05',
    title: 'CODE FREEZE & VAULT SUBMISSION',
    subtitle: 'QUANTUM UPLINK // COMMITS LOCKED',
    date: 'OCTOBER 27, 2026',
    time: '08:00 PM IST SHARP',
    location: 'DEVPOST & GITHUB VAULT',
    desc: 'Final whistle for all repositories. Submit your demo video, architecture documentation, and live deployments to Devpost. The gate closes with zero exceptions.',
    tags: ['DEVPOST UPLOAD', 'VIDEO DEMO', 'CODE REPO FREEZE', 'VERIFICATION'],
    accentColor: '#fb3377',
    peakVH: 4.8,
  },
  {
    id: 6,
    phase: 'PHASE 06',
    title: 'GRAND FINALE & AWARDS CEREMONY',
    subtitle: 'APEX CORONATION // $9,000+ PRIZE POOL',
    date: 'OCTOBER 28, 2026',
    time: '11:00 AM IST',
    location: 'CENTRAL AUDITORIUM',
    desc: 'Top 10 finalist teams take the main stage for 3-minute live pitches. Winner announcements, trophy distribution, venture funding invites, and closing celebrations.',
    tags: ['LIVE DEMO PITCH', 'CASH PRIZES', 'TROPHIES & SWAG', 'AFTER-PARTY'],
    accentColor: '#c0fe04',
    peakVH: 5.4,
  },
]

/* ─── Main Event Timeline Component ─── */
export function EventTimeline() {
  const lenis = useLenis()
  const [activeStep, setActiveStep] = useState(0)
  const activeStepRef = useRef(0)
  activeStepRef.current = activeStep
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll update handler
  useEffect(() => {
    let ticking = false
    const updateTimeline = () => {
      ticking = false
      const aVH = getArrowSectionVH()

      // Timeline strictly active only inside radial lines (2.0 to 6.0)
      const FADE_IN_START = 2.0
      const FADE_IN_END = 2.4
      const FADE_OUT_START = 5.6
      const FADE_OUT_END = 6.0

      const el = containerRef.current
      if (aVH < FADE_IN_START || aVH > FADE_OUT_END) {
        if (el) {
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
          el.style.display = 'none'
        }
        return
      }

      const fadeIn = smoothstep(FADE_IN_START, FADE_IN_END, aVH)
      const fadeOut = 1 - smoothstep(FADE_OUT_START, FADE_OUT_END, aVH)
      const op = fadeIn * fadeOut

      if (op <= 0.01) {
        if (el) {
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
          el.style.display = 'none'
        }
        return
      }

      if (el) {
        el.style.display = 'flex'
        el.style.opacity = op.toFixed(3)
        el.style.pointerEvents = op > 0.1 ? 'auto' : 'none'
      }

      // Find closest active milestone
      let bestIndex = 0
      let bestDist = Infinity
      for (let idx = 0; idx < MILESTONES.length; idx++) {
        const dist = Math.abs(aVH - MILESTONES[idx].peakVH)
        if (dist < bestDist) {
          bestDist = dist
          bestIndex = idx
        }
      }
      if (bestIndex !== activeStepRef.current) {
        activeStepRef.current = bestIndex
        setActiveStep(bestIndex)
      }
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(updateTimeline)
      }
    }

    // Run immediately on mount
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

  // Programmatic scroll to a specific milestone
  const scrollToMilestone = useCallback(
    (index: number) => {
      const arrowSection = document.getElementById('arrow-section')
      if (!arrowSection) return

      const vh = window.innerHeight || 800
      const targetVH = MILESTONES[index].peakVH
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

  const curMilestone = MILESTONES[activeStep]

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between items-center px-4 sm:px-8 lg:px-14 py-8 sm:py-12 transition-opacity duration-150"
      style={{ opacity: 0, pointerEvents: 'none', display: 'none' }}
    >
      {/* Spacer to keep top clear for the fixed navbar */}
      <div className="w-full h-12 pointer-events-none" />

      {/* ─── Centered Milestone Typography (No cards, no images, pure typography on cosmic lines) ─── */}
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center text-center pointer-events-auto my-auto py-6">
        {/* Phase Pill & Date Stamp */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-4">
          <span
            className="px-3.5 py-1 rounded-full text-xs font-black tracking-wider uppercase"
            style={{
              backgroundColor: `${curMilestone.accentColor}25`,
              color: curMilestone.accentColor,
              border: `1px solid ${curMilestone.accentColor}60`,
              fontFamily: '"tiktok", sans-serif',
            }}
          >
            {curMilestone.phase}
          </span>

          <span
            className="text-xs font-mono text-white/70 tracking-widest uppercase flex items-center gap-2"
            style={{ fontFamily: '"tronica-mono", monospace' }}
          >
            <span>●</span>
            <span>{curMilestone.date}</span>
            <span className="text-white/40">|</span>
            <span className="text-[#63c4fd]">{curMilestone.time}</span>
          </span>
        </div>

        {/* Milestone Big Title */}
        <h2
          key={curMilestone.id}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black uppercase text-white tracking-tight leading-[0.96] transition-all duration-300"
          style={{
            fontFamily: '"tiktok", sans-serif',
            fontVariationSettings: '"wght" 900, "wdth" 110',
            letterSpacing: '-0.03em',
            textShadow: '0 0 50px rgba(99,196,253,0.3)',
          }}
        >
          {curMilestone.title}
        </h2>

        {/* Subtitle */}
        <p
          className="mt-3 text-xs sm:text-sm font-mono tracking-widest uppercase text-white/50"
          style={{ fontFamily: '"tronica-mono", monospace' }}
        >
          {curMilestone.subtitle}
        </p>

        {/* Description */}
        <p
          className="mt-5 text-sm sm:text-base md:text-lg text-neutral-300 leading-relaxed max-w-2xl"
          style={{ fontFamily: '"tiktok", sans-serif' }}
        >
          {curMilestone.desc}
        </p>

        {/* Tags */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {curMilestone.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-md text-[11px] font-mono tracking-wider text-white/80 bg-white/5 border border-white/10 backdrop-blur-md"
              style={{ fontFamily: '"tronica-mono", monospace' }}
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* ─── Bottom Interactive Milestone Scrubber Rail ─── */}
      <div className="w-full max-w-4xl mx-auto pt-4 border-t border-white/10 pointer-events-auto">
        <div className="relative flex items-center justify-between">
          {/* Progress Connector Track */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-white/10 z-0">
            <div
              className="h-full bg-gradient-to-r from-[#fb3377] via-[#63c4fd] to-[#c0fe04] transition-all duration-300 shadow-[0_0_12px_#63c4fd]"
              style={{ width: `${(activeStep / (MILESTONES.length - 1)) * 100}%` }}
            />
          </div>

          {/* Milestone Step Nodes */}
          {MILESTONES.map((m, idx) => {
            const isCurrent = idx === activeStep
            const isPassed = idx < activeStep

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => scrollToMilestone(idx)}
                className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer"
              >
                {/* Node Pill */}
                <div
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-mono font-bold transition-all duration-300 ${
                    isCurrent
                      ? 'scale-125 bg-white text-black shadow-[0_0_20px_#63c4fd]'
                      : isPassed
                      ? 'bg-[#1e60ff] text-white border border-[#63c4fd]'
                      : 'bg-black/80 text-white/50 border border-white/20 group-hover:border-white/60 group-hover:text-white'
                  }`}
                  style={{ fontFamily: '"tronica-mono", monospace' }}
                >
                  0{m.id}
                </div>

                {/* Milestone Node Label */}
                <span
                  className={`hidden md:block text-[10px] tracking-wider uppercase transition-colors text-center max-w-[90px] truncate ${
                    isCurrent ? 'text-white font-bold' : 'text-white/40 group-hover:text-white/80'
                  }`}
                  style={{ fontFamily: '"tiktok", sans-serif' }}
                >
                  {m.title.split(' ')[0]}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
