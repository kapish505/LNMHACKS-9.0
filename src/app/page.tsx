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

/**
 * Wraps CloudSky with a scroll-driven parallax + fade.
 * As the user scrolls through the hero viewport:
 *   - opacity: 1 → 0  (fades out over 1.2× viewport height of scrolling)
 *   - translateY: 0 → +scrollY * 0.35  (drifts upward at 35% of scroll speed)
 * The cream body shows through underneath with no hard edge.
 */
function ParallaxSky() {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return

    let ticking = false
    const update = () => {
      const scrollY = window.scrollY
      const vh = window.innerHeight
      const progress = Math.min(1, scrollY / (vh * 1.2))
      el.style.opacity = String(1 - progress)
      el.style.transform = `translateY(${scrollY * 0.35}px)`
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
      className="absolute inset-0 z-0"
      style={{ transformOrigin: 'top center', willChange: 'opacity, transform' }}
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
    <main className="relative min-h-screen">
      <WebsiteLoader />
      <Navbar />
      <FixedFooter />

      {/* R3F Canvas — cursor + project meshes only, transparent bg */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }} gl={{ alpha: true }} dpr={[1, 1.5]} style={{ background: 'transparent' }}>
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

      <InnovateSection />

      {/* ── Hero section — CloudSky with scroll parallax fade ── */}
      <div className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        <ParallaxSky />

        <div className="relative z-10 pointer-events-auto flex items-center justify-center">
          <VaporCountdown />
        </div>
      </div>

      <ProjectGrid />

      <div id="arrow-section" className="w-full" style={{ height: '1900vh' }} />
    </main>
  )
}
