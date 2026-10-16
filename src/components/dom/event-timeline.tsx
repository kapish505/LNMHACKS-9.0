'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { subscribeLenisScroll } from '@/lib/scroll-bus'
import { getArrowSectionVH } from '@/lib/arrow-section-progress'
import { useLenis } from 'lenis/react'

function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ')
}



/* ── Milestone Pipeline Data Tailored to LNMHACKS 9.0 ──────────── */
interface PipelineStep {
  id: number
  stepNumber: string
  title: string
  date: string
  accent: string
  description: string
}

const BASE_STEPS: PipelineStep[] = [
  {
    id: 1,
    stepNumber: '01',
    title: 'Hacker Check-in & Squad Formation',
    date: 'OCT 24 · 10:00 AM IST',
    accent: '#63c4fd',
    description: 'Check in at the LNMIIT campus or global portal. Collect your official LNMHACKS 9.0 hacker kit, hardware tokens, and exclusive partner API keys. Finalize squad formations of 2–4 hackers.',
  },
  {
    id: 2,
    stepNumber: '02',
    title: 'Opening Ceremony & Track Briefing',
    date: 'OCT 24 · 06:00 PM IST',
    accent: '#fb3377',
    description: 'The official ignition protocol begins. Keynote addresses from industry pioneers, surprise problem statements reveal across AI, Web3, FinTech, and $9,000+ sponsor bounty drops.',
  },
  {
    id: 3,
    stepNumber: '03',
    title: '72-Hour Continuous Hack Forge',
    date: 'OCT 24–27 · 08:00 PM START',
    accent: '#c0fe04',
    description: '72 hours of uninterrupted building across LNMIIT labs. Midnight fuel drops, caffeine lounges, hardware testing benches, git commit sprints, and real-time mentor office hours.',
  },
  {
    id: 4,
    stepNumber: '04',
    title: '1-on-1 Mentorship & Architecture Clinics',
    date: 'OCT 26 · 02:00 PM – 06:00 PM',
    accent: '#63c4fd',
    description: 'Deep-dive 1-on-1 architecture reviews and blocker debugging with staff engineers from partner companies and VC judges. Validate technical scalability and product-market fit.',
  },
  {
    id: 5,
    stepNumber: '05',
    title: 'Code Freeze & Devpost Vault Lock',
    date: 'OCT 27 · 08:00 PM SHARP',
    accent: '#1e60ff',
    description: 'Repository lock across all squads. Submit your demo video, architecture documentation, open-source repositories, and live deployment links to Devpost. Zero grace period.',
  },
  {
    id: 6,
    stepNumber: '06',
    title: 'Grand Finale & $9,000+ Apex Awards',
    date: 'OCT 28 · 11:00 AM IST',
    accent: '#fb3377',
    description: 'Top 10 finalist squads take the stage for 3-minute live pitches. Grand jury scoring, category awards, venture funding invites, $9,000+ prize pool distribution, and closing celebrations.',
  },
]

const TIMELINE_START = 2.6
const TIMELINE_END = 15.2
const TIMELINE_EXIT = 15.9

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/**
 * EventTimelineDOM:
 * Ultra-clean, premium typography-focused horizontal timeline.
 * Card overlay, avatars, and profile names have been completely removed.
 * Title, date, and description are merged into one cohesive milestone presentation.
 */
export function EventTimelineDOM() {
  const [activeStepId, setActiveStepId] = useState(1)
  const [opacity, setOpacity] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const lenis = useLenis()
  const trackRef = useRef<HTMLDivElement>(null)

  const handleScrollToStep = useCallback((stepId: number) => {
    if (!lenis) return
    const el = document.getElementById('arrow-section')
    if (!el) return
    const isMob = window.innerWidth < 768
    const start = isMob ? 0.45 : TIMELINE_START
    const end = isMob ? 2.3 : TIMELINE_END
    const rect = el.getBoundingClientRect()
    const sectionTop = window.scrollY + rect.top
    const stepFraction = (stepId - 0.5) / BASE_STEPS.length
    const targetVH = start + stepFraction * (end - start)
    const targetY = sectionTop + targetVH * window.innerHeight
    lenis.scrollTo(targetY, { duration: 1.0 })
  }, [lenis])

  useEffect(() => {
    const handleScroll = () => {
      const aVH = getArrowSectionVH()
      const isMob = window.innerWidth < 768
      const start = isMob ? 0.45 : TIMELINE_START
      const end = isMob ? 2.3 : TIMELINE_END
      const exit = isMob ? 2.55 : TIMELINE_EXIT

      const fadeIn = smoothstep(start - 0.15, start + 0.15, aVH)
      const fadeOut = 1 - smoothstep(end + 0.1, exit, aVH)
      const curOpacity = fadeIn * fadeOut

      setOpacity(curOpacity)

      if (curOpacity > 0.01) {
        const norm = clamp01((aVH - start) / (end - start))
        setScrollProgress(norm)

        const stepIdx = Math.min(BASE_STEPS.length - 1, Math.floor(norm * BASE_STEPS.length))
        const currentId = stepIdx + 1
        setActiveStepId(currentId)
      }
    }

    handleScroll()
    const unsubscribe = subscribeLenisScroll(handleScroll)
    return () => {
      unsubscribe()
    }
  }, [])

  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200))

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize, { passive: true })
    window.addEventListener('orientationchange', handleResize, { passive: true })
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  // Calculate dynamic responsive layout for any phone, tablet, or desktop
  const isMobile = windowWidth < 640
  const isTablet = windowWidth >= 640 && windowWidth < 1024
  const cardWidth = isMobile
    ? Math.max(260, Math.min(380, windowWidth - 48))
    : isTablet
      ? 380
      : 420
  const cardGap = isMobile ? 24 : isTablet ? 36 : 56
  const itemPitch = cardWidth + cardGap
  const totalTrackWidth = (BASE_STEPS.length - 1) * itemPitch
  const screenCenterOffset = (windowWidth - cardWidth) * 0.5
  const horizontalTranslateX = screenCenterOffset - scrollProgress * totalTrackWidth

  if (opacity <= 0.005) return null

  // ─── Mobile Layout (< 768px): Exact Vertical Replica of PC Timeline ───
  if (windowWidth < 768) {
    const mobileStepPitch = 155
    const totalMobileTrackHeight = (BASE_STEPS.length - 1) * mobileStepPitch
    const verticalTranslateY = -scrollProgress * totalMobileTrackHeight

    return (
      <>
        {/* Deep black backdrop */}
        <div
          className="fixed inset-0 z-[8] pointer-events-none transition-opacity duration-300"
          style={{
            backgroundColor: '#03060d',
            opacity,
            visibility: opacity > 0.005 ? 'visible' : 'hidden',
          }}
        />

        <div
          className="fixed inset-0 z-[15] pointer-events-none flex flex-col justify-start items-center transition-opacity duration-200 px-4 pt-20 pb-4 overflow-hidden touch-pan-y"
          style={{
            opacity,
            visibility: opacity > 0.005 ? 'visible' : 'hidden',
            fontFamily: '"tiktok", sans-serif',
          }}
        >
          {/* Vertical Pipeline Track Container */}
          <div className="w-full max-w-md h-full overflow-hidden pointer-events-none relative pt-4">
            <div
              className="flex flex-col transition-transform duration-200 ease-out will-change-transform"
              style={{
                transform: `translate3d(0, ${verticalTranslateY}px, 0)`,
                paddingTop: '20px',
              }}
            >
              {BASE_STEPS.map((step, idx) => {
                const isCompleted = step.id < activeStepId
                const isActive = step.id === activeStepId
                const isLast = idx === BASE_STEPS.length - 1

                return (
                  <div
                    key={step.id}
                    onClick={() => handleScrollToStep(step.id)}
                    className="relative flex items-start cursor-pointer select-none group/step transition-all duration-300 pointer-events-auto"
                    style={{
                      minHeight: `${mobileStepPitch}px`,
                    }}
                  >
                    {/* Left Column: Vertical Timeline Axis & Precision Node */}
                    <div className="relative flex flex-col items-center w-7 shrink-0 mr-3.5 self-stretch">
                      {/* Precision Node (exact replica of PC) */}
                      <div className="relative flex items-center justify-center shrink-0 h-6">
                        {isActive ? (
                          <div className="relative flex items-center justify-center">
                            <span className="absolute size-4 rounded-full bg-white/15 animate-ping" />
                            <span className="size-2.5 rounded-full bg-white ring-4 ring-white/20 shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
                          </div>
                        ) : isCompleted ? (
                          <span className="size-2 rounded-full bg-[#63c4fd] shadow-[0_0_6px_rgba(99,196,253,0.5)]" />
                        ) : (
                          <span className="size-1.5 rounded-full bg-white/20 group-hover/step:bg-white/50 transition-colors" />
                        )}
                      </div>

                      {/* Connecting vertical hairline bar */}
                      {!isLast && (
                        <div className="grow w-px bg-white/10 overflow-hidden my-1">
                          <div
                            className={cn(
                              'w-full h-full transition-all duration-500',
                              isCompleted
                                ? 'bg-gradient-to-b from-[#63c4fd] to-white/60'
                                : 'bg-transparent'
                            )}
                          />
                        </div>
                      )}
                    </div>

                    {/* Right Column: Milestone Content (exact replica of PC typography & styling) */}
                    <div className="flex flex-col gap-1 pb-7 grow">
                      {/* Technical Metadata Row */}
                      <div className="flex items-center gap-2 text-xs tracking-wider uppercase font-mono">
                        <span
                          className={cn(
                            'font-bold transition-colors',
                            isActive ? 'text-[#fb3377]' : isCompleted ? 'text-[#63c4fd]' : 'text-white/30'
                          )}
                          style={{ fontFamily: '"tronica-mono", monospace' }}
                        >
                          {step.stepNumber}
                        </span>
                        <span className="text-white/20 select-none">/</span>
                        <span
                          className={cn(
                            'font-medium transition-colors tracking-tight',
                            isActive ? 'text-white/80' : isCompleted ? 'text-white/50' : 'text-white/30'
                          )}
                          style={{ fontFamily: '"tronica-mono", monospace' }}
                        >
                          {step.date}
                        </span>
                      </div>

                      {/* Milestone Title with TikTok Font */}
                      <h3
                        className={cn(
                          'text-lg sm:text-xl font-bold tracking-tight leading-snug transition-colors duration-200 mt-0.5',
                          isActive ? 'text-white' : isCompleted ? 'text-white/80' : 'text-white/40 group-hover/step:text-white/70'
                        )}
                        style={{
                          fontFamily: '"tiktok", sans-serif',
                          fontVariationSettings: '"wght" 850',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {step.title}
                      </h3>

                      {/* Milestone Description with TikTok Font */}
                      <p
                        className={cn(
                          'text-xs sm:text-sm leading-relaxed transition-colors duration-200 text-neutral-400 max-w-sm',
                          isActive ? 'text-neutral-300' : isCompleted ? 'text-neutral-400/80' : 'text-neutral-500/60'
                        )}
                        style={{ fontFamily: '"tiktok", sans-serif' }}
                      >
                        {step.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </>
    )
  }

  // ─── Desktop & Tablet View (>= 768px): Horizontal Pipeline Layout ─────────
  return (
    <>
      {/* Black backdrop specifically for the timeline section (guarantees deep black background even in light mode) */}
      <div
        className="fixed inset-0 z-[8] pointer-events-none transition-opacity duration-300"
        style={{
          backgroundColor: '#03060d',
          opacity,
          visibility: opacity > 0.005 ? 'visible' : 'hidden',
        }}
      />

      <div
        className="fixed inset-x-0 top-20 sm:top-24 md:top-28 z-[15] pointer-events-none flex flex-col justify-start items-center transition-opacity duration-200"
        style={{
          opacity,
          visibility: opacity > 0.005 ? 'visible' : 'hidden',
          fontFamily: '"tiktok", sans-serif',
        }}
      >
        {/* Horizontal Pipeline Track Container */}
        <div className="w-full overflow-hidden pointer-events-auto py-2">
        <div
          ref={trackRef}
          className="flex items-start transition-transform duration-200 ease-out will-change-transform"
          style={{
            transform: `translate3d(${horizontalTranslateX}px, 0, 0)`,
          }}
        >
          {BASE_STEPS.map((step, idx) => {
            const isCompleted = step.id < activeStepId
            const isActive = step.id === activeStepId
            const status: 'completed' | 'active' | 'pending' = isCompleted
              ? 'completed'
              : isActive
                ? 'active'
                : 'pending'
            const isLast = idx === BASE_STEPS.length - 1

            return (
              <div
                key={step.id}
                onClick={() => handleScrollToStep(step.id)}
                className="shrink-0 flex flex-col cursor-pointer select-none group/step transition-all duration-300"
                style={{
                  width: `${cardWidth}px`,
                  marginRight: `${cardGap}px`,
                }}
              >
                {/* Minimalist Timeline Axis & Precision Node */}
                <div className="relative flex items-center h-6 mb-4">
                  {/* Continuous hairline axis spanning to next milestone */}
                  <div className="relative flex items-center w-full">
                    {/* Precision Node */}
                    <div className="relative flex items-center justify-center shrink-0">
                      {isActive ? (
                        <div className="relative flex items-center justify-center">
                          <span className="absolute size-4 rounded-full bg-white/15 animate-ping" />
                          <span className="size-2.5 rounded-full bg-white ring-4 ring-white/20 shadow-[0_0_10px_rgba(255,255,255,0.6)]" />
                        </div>
                      ) : isCompleted ? (
                        <span className="size-2 rounded-full bg-[#63c4fd] shadow-[0_0_6px_rgba(99,196,253,0.5)]" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-white/20 group-hover/step:bg-white/50 transition-colors" />
                      )}
                    </div>

                    {/* Connecting hairline bar */}
                    {!isLast && (
                      <div
                        className="grow h-px ml-3 bg-white/10 overflow-hidden"
                        style={{ marginRight: `-${cardGap}px` }}
                      >
                        <div
                          className={cn(
                            'h-full w-full transition-all duration-500',
                            isCompleted
                              ? 'bg-gradient-to-r from-[#63c4fd] to-white/60'
                              : 'bg-transparent'
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Milestone Content */}
                <div className="flex flex-col gap-1.5">
                  {/* Clean Technical Metadata Row — No Tacky Neon Pills */}
                  <div className="flex items-center gap-2 text-xs tracking-wider uppercase font-mono">
                    <span
                      className={cn(
                        'font-bold transition-colors',
                        isActive ? 'text-[#fb3377]' : isCompleted ? 'text-[#63c4fd]' : 'text-white/30'
                      )}
                      style={{ fontFamily: '"tronica-mono", monospace' }}
                    >
                      {step.stepNumber}
                    </span>
                    <span className="text-white/20 select-none">/</span>
                    <span
                      className={cn(
                        'font-medium transition-colors tracking-tight',
                        isActive ? 'text-white/80' : isCompleted ? 'text-white/50' : 'text-white/30'
                      )}
                      style={{ fontFamily: '"tronica-mono", monospace' }}
                    >
                      {step.date}
                    </span>
                  </div>

                  {/* Milestone Title with TikTok Font */}
                  <h3
                    className={cn(
                      'text-xl sm:text-2xl font-bold tracking-tight leading-snug transition-colors duration-200 mt-0.5',
                      isActive ? 'text-white' : isCompleted ? 'text-white/80' : 'text-white/40 group-hover/step:text-white/70'
                    )}
                    style={{
                      fontFamily: '"tiktok", sans-serif',
                      fontVariationSettings: '"wght" 850',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {step.title}
                  </h3>

                  {/* Milestone Description with TikTok Font */}
                  <p
                    className={cn(
                      'text-sm leading-relaxed transition-colors duration-200 text-neutral-400 max-w-sm sm:max-w-md',
                      isActive ? 'text-neutral-300' : isCompleted ? 'text-neutral-400/80' : 'text-neutral-500/60'
                    )}
                    style={{ fontFamily: '"tiktok", sans-serif' }}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
    </>
  )
}
