'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useRef, useState } from 'react'
import { ProjectMeshes } from '@/components/canvas/grid/project-meshes'
import { ProjectGrid } from '@/components/dom/project-grid'
import { CursorArrow } from '@/components/canvas/glass/cursor-arrow'
import { VaporCountdown } from '@/components/ui/countdown-vapor-digits'
import { EventTimeline } from '@/components/canvas/event-timeline'
import { EventTimelineDOM } from '@/components/dom/event-timeline'

import { Navbar } from '@/components/dom/navbar'
import { WebsiteLoader } from '@/components/dom/website-loader'
import { CloudSky } from '@/components/canvas/cloud-sky'
import ScanGridButton from '@/components/ui/scan-grid-button'
import { MouseCubeTrail } from '@/components/dom/mouse-cube-trail'
import { ScrollCircleTransition } from '@/components/canvas/scroll-circle-transition'
import { HeroHeadline } from '@/components/ui/hero-headline'
import { HeroTopBanner } from '@/components/ui/hero-top-banner'
import { FallingStickers } from '@/components/canvas/glass/stickers'
import { HawaMahalFooter } from '@/components/dom/hawa-mahal-footer'
import { GlimpsesSection } from '@/components/dom/glimpses-section'
import { SponsorSection } from '@/components/dom/sponsor-section'
import { GlobalGridOverlay } from '@/components/ui/global-grid-overlay'
import { triggerPageTransition } from '@/lib/page-transition-bus'
import { useTheme } from '@/lib/theme-context'
import { NightCloudSky } from '@/components/canvas/night-cloud-sky'
import { getArrowSectionVH } from '@/lib/arrow-section-progress'
import { subscribeLenisScroll } from '@/lib/scroll-bus'
import { Mascot } from 'page-mascot'

/**
 * CursorArrow lives before the timeline and after its exit, the 3D timeline
 * occupies [2.4, 15.9], and ProjectMeshes runs while the sponsors grid is
 * near the viewport.
 * Everywhere else — notably the entire hero — the transparent full-screen
 * buffer and its animation callbacks stay paused.
 *
 * The window is padded past each child's fade-out so at least one frame always
 * renders with everything already invisible; the frozen buffer is therefore
 * fully transparent and stopping is not observable.
 */
function useMainCanvasActive(): boolean {
  const [active, setActive] = useState(false)
  const activeRef = useRef(false)

  useEffect(() => {
    let sponsorsNear = false
    let ticking = false

    const evaluate = () => {
      ticking = false
      const aVH = getArrowSectionVH()
      // Keep the shared canvas alive through the deliberately longer six-card
      // timeline and the reverse arrow transition that follows it.
      const next = sponsorsNear || (aVH > -1.3 && aVH < 17.2)
      if (next !== activeRef.current) {
        activeRef.current = next
        setActive(next)
      }
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(evaluate)
      }
    }

    const el = document.getElementById('sponsors')
    const io = el
      ? new IntersectionObserver(
          ([entry]) => {
            sponsorsNear = entry.isIntersecting
            evaluate()
          },
          { rootMargin: '600px 0px' },
        )
      : null
    io?.observe(el!)

    evaluate()

    const unsub = subscribeLenisScroll(onScroll)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })

    return () => {
      io?.disconnect()
      unsub()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return active
}

/**
 * HeroFallingStickers — pauses WebGL rendering loop when hero is scrolled out of view
 */
function HeroFallingStickers() {
  const [inView, setInView] = useState(true)

  useEffect(() => {
    const hero = document.getElementById('hero')
    if (!hero) return
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
      },
      { threshold: 0.01 }
    )
    io.observe(hero)
    return () => io.disconnect()
  }, [])

  return (
    <div className="absolute inset-0 z-[1] pointer-events-none">
      <Canvas
        frameloop={inView ? 'always' : 'never'}
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ alpha: true, powerPreference: 'high-performance' }}
        dpr={typeof window !== 'undefined' && window.innerWidth < 768 ? [1, 1] : [1, 1.25]}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <FallingStickers />
        </Suspense>
      </Canvas>
    </div>
  )
}

/**
 * ParallaxSky — smoothly switches between daytime CloudSky (with scroll parallax)
 * and nighttime NightCloudSky (stationary, no parallax, moonlit clouds & twinkling stars).
 */
function ParallaxSky() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // On mount, only activate the current theme's sky (eliminating dual WebGL compilation lag).
  // Only when theme actually flips do we run both for 1.6s during cross-fade.
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark' | 'both'>(() => isDark ? 'dark' : 'light')
  const prevDarkRef = useRef(isDark)

  // The night sky is a second raw-WebGL context with its own shader program.
  // `active` stopped its draw loop but the context, program and buffers were
  // still created on mount for every visitor. Mount it only once dark mode has
  // actually been used, then keep it so toggling back and forth is free.
  const [nightMounted, setNightMounted] = useState(false)
  useEffect(() => {
    if (isDark) setNightMounted(true)
  }, [isDark])

  useEffect(() => {
    if (prevDarkRef.current !== isDark) {
      prevDarkRef.current = isDark
      setActiveTheme('both')
      const timer = setTimeout(() => {
        setActiveTheme(isDark ? 'dark' : 'light')
      }, 1600)
      return () => clearTimeout(timer)
    }
  }, [isDark])

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    let ticking = false
    const update = () => {
      // Gentle scroll parallax only applies to the light sky
      const scrollY = window.scrollY
      el.style.transform = `translateY(${scrollY * 0.2}px)`
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update)
        ticking = true
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
      {/* Daylight Cloud Sky with scroll parallax (clouds continue drifting naturally) */}
      <div
        ref={wrapRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          transformOrigin: 'top center',
          willChange: 'transform, opacity',
          opacity: isDark ? 0 : 1,
          transition: 'opacity 1.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <CloudSky
          background="#4A90D9"
          baseColor="#9BCBF0"
          accentColor="#FFFFFF"
          density={68}
          speed={55}
          pointer={{ wind: 0, parallax: 0, damping: 1 }}
          active={activeTheme === 'light' || activeTheme === 'both'}
        />
      </div>

      {/* Night Cloud Sky with moonlit clouds, twinkling stars, and NO parallax effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          willChange: 'opacity',
          opacity: isDark ? 1 : 0,
          transition: 'opacity 1.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {nightMounted && (
          <NightCloudSky
            active={activeTheme === 'dark' || activeTheme === 'both'}
          />
        )}
      </div>
    </div>
  )
}

export default function Home() {
  const mainCanvasActive = useMainCanvasActive()

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background">
      <WebsiteLoader />
      <Navbar />

      {/* R3F Canvas — cursor + project meshes */}
      <div className="fixed inset-0 z-[10] pointer-events-none bg-transparent">
        <Canvas
          frameloop={mainCanvasActive ? 'always' : 'never'}
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{
            alpha: true,
            powerPreference: 'high-performance',
            antialias: typeof window !== 'undefined' && window.innerWidth >= 768,
            logarithmicDepthBuffer: false,
          }}
          dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2) : 1}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>
            <CursorArrow />
            <EventTimeline />
            <ProjectMeshes />
          </Suspense>
        </Canvas>
      </div>

      {/* Global grid overlay — 3 rows in hero (at zero scroll) and 3 columns with extra edge margins */}
      <GlobalGridOverlay />

      {/* Mouse pointer cube trail in sections after hero */}
      <MouseCubeTrail />

      {/* Horizontal pipeline event timeline overlay in arrow section */}
      <EventTimelineDOM />


      {/* ── Hero section — CloudSky + headline + countdown + scroll circle dissolve ── */}
      <div id="hero" className="relative min-h-[100dvh] w-full flex items-center justify-center overflow-hidden py-16 sm:py-0">
        <ParallaxSky />

        {/* Falling stickers — pauses rendering when hero is out of view */}
        <HeroFallingStickers />

        {/* Scroll-based circle dissolve transition to About section */}
        <ScrollCircleTransition />

        {/* Editorial 3-column banner under navbar */}
        <HeroTopBanner />

        {/* Hero headline with TikTok font, left alignment, and scramble animation */}
        <HeroHeadline />

        {/* Centered countdown + register button locked in middle row (Row 2: 33.333vh to 66.667vh) */}
        <div className="absolute top-[33.333333vh] h-[33.333333vh] left-0 right-0 z-20 pointer-events-none flex flex-col items-center justify-center px-2 sm:px-6">
          <div className="pointer-events-auto flex flex-col items-center relative z-30">
            <VaporCountdown />
            <div className="mt-2.5 sm:mt-3.5 relative z-40 pointer-events-auto">
              <ScanGridButton
                link="/register"
                label="REGISTER"
                onClick={(e?: React.MouseEvent) => {
                  e?.preventDefault?.()
                  triggerPageTransition('/register')
                }}
                font={{
                  fontFamily: '"tiktok", sans-serif',
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: '2px',
                }}
                padding="11px 38px"
                rounded={12}
                colors={{
                  fill: 'rgba(15, 23, 42, 0.85)',
                  hoverFill: '#1e60ff',
                  textColor: '#ffffff',
                  hoverTextColor: '#ffffff',
                }}
                border={{
                  borderWidth: 1.5,
                  borderStyle: 'solid',
                  borderColor: 'rgba(255, 255, 255, 0.35)',
                }}
                scan={{
                  color: '#ff3344',
                  speed: 60,
                }}
                glitchIntensity={2.5}
                addIcon={true}
                icon={{
                  side: 'right',
                  size: 15,
                  type: 'symbol',
                  symbol: '→',
                  color: '#ffffff',
                  hoverColor: '#ffffff',
                }}
              />
            </div>
          </div>
        </div>

        <div className="pointer-events-auto absolute bottom-4 right-4 z-30 sm:bottom-8 sm:right-8 md:bottom-10 md:right-12 transition-transform duration-300">
          <Mascot
            directions="/mascots/chibi-directions.webp"
            reactions="/mascots/chibi-reactions.webp"
            size={185}
            label="Chibi Mascot"
          />
        </div>
      </div>

      <ProjectGrid />

      <div id="arrow-section" className="w-full" style={{ height: '1900vh' }} />

      <GlimpsesSection />

      <SponsorSection />

      <HawaMahalFooter />
    </main>
  )
}
