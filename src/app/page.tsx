'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useRef } from 'react'
import { ProjectMeshes } from '@/components/canvas/grid/project-meshes'
import { ProjectGrid } from '@/components/dom/project-grid'
import { CursorArrow } from '@/components/canvas/glass/cursor-arrow'
import { VaporCountdown } from '@/components/ui/countdown-vapor-digits'
import { RadialSpeedLines } from '@/components/canvas/radial-speed-lines'
import { EventTimeline } from '@/components/dom/event-timeline'
import { Navbar } from '@/components/dom/navbar'
import { WebsiteLoader } from '@/components/dom/website-loader'
import { CloudSky } from '@/components/canvas/cloud-sky'
import { FixedFooter } from '@/components/dom/fixed-footer'
import ScanGridButton from '@/components/ui/scan-grid-button'
import { MouseCubeTrail } from '@/components/dom/mouse-cube-trail'
import { ScrollCircleTransition } from '@/components/canvas/scroll-circle-transition'
import { HeroHeadline } from '@/components/ui/hero-headline'
import { FallingStickers } from '@/components/canvas/glass/stickers'
import { HawaMahalFooter } from '@/components/dom/hawa-mahal-footer'
import { PageCircleReveal } from '@/components/canvas/page-circle-reveal'
import { triggerPageTransition } from '@/lib/page-transition-bus'

/**
 * ParallaxSky — wraps CloudSky with gentle scroll parallax.
 */
function ParallaxSky() {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    let ticking = false
    const update = () => {
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
    <div
      ref={wrapRef}
      className="absolute inset-0 z-0 pointer-events-none"
      style={{
        transformOrigin: 'top center',
        willChange: 'transform',
      }}
    >
      <CloudSky
        background="#4A90D9"
        baseColor="#9BCBF0"
        accentColor="#FFFFFF"
        density={68}
        speed={55}
        pointer={{ wind: 0, parallax: 0, damping: 1 }}
      />
    </div>
  )
}

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <WebsiteLoader />
      <PageCircleReveal />
      <Navbar />
      <FixedFooter />

      {/* R3F Canvas — cursor + project meshes */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ alpha: true, powerPreference: 'high-performance' }}
          dpr={typeof window !== 'undefined' && window.innerWidth < 768 ? [1, 1] : [1, 1.5]}
          style={{ background: 'transparent' }}
        >
          <Suspense fallback={null}>
            <RadialSpeedLines />
            <CursorArrow />
            <ProjectMeshes />
          </Suspense>
        </Canvas>
      </div>

      {/* Global grid overlay — above all backgrounds including CloudSky */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320'%3E%3Cline x1='0' y1='0' x2='320' y2='0' stroke='rgba(0%2C0%2C0%2C0.09)' stroke-width='1'/%3E%3Cline x1='0' y1='0' x2='0' y2='320' stroke='rgba(0%2C0%2C0%2C0.09)' stroke-width='1'/%3E%3Cline x1='-7' y1='0' x2='7' y2='0' stroke='rgba(0%2C0%2C0%2C0.25)' stroke-width='1.5'/%3E%3Cline x1='0' y1='-7' x2='0' y2='7' stroke='rgba(0%2C0%2C0%2C0.25)' stroke-width='1.5'/%3E%3C/svg%3E")`,
          backgroundSize: '320px 320px',
        }}
      />

      {/* Mouse pointer cube trail in sections after hero */}
      <MouseCubeTrail />

      {/* Animated scroll-driven vector art event timeline in the radial speed lines section */}
      <EventTimeline />

      {/* ── Hero section — CloudSky + headline + countdown + scroll circle dissolve ── */}
      <div id="hero" className="relative min-h-[100dvh] w-full flex items-center justify-center overflow-hidden py-16 sm:py-0">
        <ParallaxSky />

        {/* Falling stickers — on top of CloudSky, fades out cleanly as user scrolls */}
        <div className="absolute inset-0 z-[1] pointer-events-none">
          <Canvas
            camera={{ position: [0, 0, 5], fov: 45 }}
            gl={{ alpha: true, powerPreference: 'high-performance' }}
            dpr={typeof window !== 'undefined' && window.innerWidth < 768 ? [1, 1] : [1, 1.5]}
            style={{ background: 'transparent' }}
          >
            <Suspense fallback={null}>
              <FallingStickers />
            </Suspense>
          </Canvas>
        </div>

        {/* Scroll-based circle dissolve transition to About section */}
        <ScrollCircleTransition />

        {/* Hero headline with TikTok font, left alignment, and scramble animation */}
        <HeroHeadline />

        {/* Centered countdown + register button */}
        <div className="relative z-10 pointer-events-auto flex flex-col items-center justify-center w-full px-2 sm:px-6">
          <VaporCountdown />
          <div className="mt-6 sm:mt-8">
            <ScanGridButton
              label="REGISTER"
              onClick={() => triggerPageTransition('/register')}
              font={{
                fontFamily: '"tiktok", sans-serif',
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: '2px',
              }}
              padding="14px 44px"
              rounded={14}
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
                size: 16,
                type: 'symbol',
                symbol: '→',
                color: '#ffffff',
                hoverColor: '#ffffff',
              }}
            />
          </div>
        </div>
      </div>

      <ProjectGrid />

      <div id="arrow-section" className="w-full" style={{ height: '950vh' }} />

      <HawaMahalFooter />
    </main>
  )
}
