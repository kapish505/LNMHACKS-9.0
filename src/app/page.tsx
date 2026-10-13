'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useRef } from 'react'
import { ProjectMeshes } from '@/components/canvas/grid/project-meshes'
import { ProjectGrid } from '@/components/dom/project-grid'
import { CursorArrow } from '@/components/canvas/glass/cursor-arrow'
import { VaporCountdown } from '@/components/ui/countdown-vapor-digits'
import { RadialSpeedLines } from '@/components/canvas/radial-speed-lines'
import { InnovateSection } from '@/components/dom/innovate-section'
import { Navbar } from '@/components/dom/navbar'
import { WebsiteLoader } from '@/components/dom/website-loader'
import { CloudSky } from '@/components/canvas/cloud-sky'
import { FixedFooter } from '@/components/dom/fixed-footer'
import ScanGridButton from '@/components/ui/scan-grid-button'
import { MouseCubeTrail } from '@/components/dom/mouse-cube-trail'
import { FallingStickers } from '@/components/canvas/glass/stickers'

/**
 * Circle-dissolve transition overlay at the bottom of the hero section.
 * Uses a canvas to draw small circles that progressively reveal the
 * cream (#F0EDE8) About section background as the user scrolls.
 */
function CircleDissolveTransition() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const CIRCLE_SIZE = 12     // diameter of each dissolve circle
    const SPACING = 14         // grid spacing
    const BAND_HEIGHT = 280    // px height of the transition band

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.floor(window.innerWidth * dpr)
      canvas.height = Math.floor(BAND_HEIGHT * dpr)
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${BAND_HEIGHT}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    let ticking = false
    const draw = () => {
      const w = window.innerWidth
      const h = BAND_HEIGHT
      ctx.clearRect(0, 0, w, h)

      // Each circle's radius depends on its vertical position in the band
      // Top of band = small/invisible circles, bottom = fully filled
      const cols = Math.ceil(w / SPACING) + 1
      const rows = Math.ceil(h / SPACING) + 1

      ctx.fillStyle = '#F0EDE8'

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx = col * SPACING + (row % 2 === 0 ? 0 : SPACING * 0.5)
          const cy = row * SPACING

          // Progress: 0 at top, 1 at bottom of band
          const t = cy / h
          // Stagger: add a slight noise offset based on position
          const noise = Math.sin(cx * 0.07 + cy * 0.11) * 0.08
          const prog = Math.max(0, Math.min(1, t + noise))

          // Radius grows from 0 to full coverage
          const r = prog * (CIRCLE_SIZE * 0.55)
          if (r < 0.5) continue

          ctx.beginPath()
          ctx.arc(cx, cy, r, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ticking = false
    }

    // Draw once, redraw on resize
    draw()
    const onResize = () => {
      resize()
      draw()
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute bottom-0 left-0 w-full pointer-events-none"
      style={{ zIndex: 5 }}
    />
  )
}

/**
 * ParallaxSky — wraps CloudSky with gentle scroll parallax and
 * dot-matrix dissolve transition at the bottom edge.
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
      <Navbar />
      <FixedFooter />

      {/* R3F Canvas — cursor + project meshes + falling stickers */}
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
            <FallingStickers />
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

      <InnovateSection />

      {/* ── Hero section — CloudSky + headline + countdown ── */}
      <div id="hero" className="relative min-h-[100dvh] w-full flex items-center justify-center overflow-hidden py-16 sm:py-0">
        <ParallaxSky />

        {/* Bold hero headline — bottom-left, doesn't interfere with centered countdown */}
        <div
          className="absolute bottom-8 sm:bottom-12 md:bottom-16 left-4 sm:left-8 md:left-14 z-10 pointer-events-none select-none"
        >
          <h1
            className="font-black tracking-tight leading-[0.92] text-white drop-shadow-lg"
            style={{
              fontSize: 'clamp(1.8rem, 5.5vw, 5rem)',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              letterSpacing: '-0.03em',
              textShadow: '0 2px 24px rgba(0,0,0,0.25), 0 0 80px rgba(30,96,255,0.15)',
            }}
          >
            72 HOURS OF<br />
            PURE<br />
            INNOVATION
          </h1>
        </div>

        {/* Centered countdown + register button */}
        <div className="relative z-10 pointer-events-auto flex flex-col items-center justify-center w-full px-2 sm:px-6">
          <VaporCountdown />
          <div className="mt-6 sm:mt-8">
            <ScanGridButton
              label="REGISTER"
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

        {/* Circle-dissolve transition at bottom edge of hero */}
        <CircleDissolveTransition />
      </div>

      <ProjectGrid />

      <div id="arrow-section" className="w-full" style={{ height: '1900vh' }} />
    </main>
  )
}
