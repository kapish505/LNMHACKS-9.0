'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { domRegistry } from '@/lib/dom-registry'
import { AboutRingLogo } from '@/components/dom/about-ring-logo'

const LiquidGlassCarousel = dynamic(
  () => import('@/components/dom/liquid-glass-carousel'),
  { ssr: false }
)

const DEFAULT_ITEMS = [
  '/item1.png',
  '/item2.png',
  '/item3.png',
  '/item4.png',
  '/item5.png',
  '/item6.png',
  '/item7.png',
  '/item8.png',
  '/item9.png',
  '/item10.png',
  '/item11.png',
  '/item12.png',
  '/item13.png',
  '/item14.png',
]

const PROJECTS = [
  { id: 'proj-1', title: 'NodeOps', img1: '/projects/project1.png', img2: '/projects/project1.png' },
  { id: 'proj-2', title: 'Monad Foundation', img1: '/projects/project2.png', img2: '/projects/project2.png' },
  { id: 'proj-3', title: 'Cyrene AI', img1: '/projects/project3.png', img2: '/projects/project3.png' },
  { id: 'proj-4', title: 'Sponsor 4', img1: '/projects/project1.png', img2: '/projects/project1.png' },
  { id: 'proj-5', title: 'Sponsor 5', img1: '/projects/project2.png', img2: '/projects/project2.png' },
  { id: 'proj-6', title: 'Sponsor 6', img1: '/projects/project3.png', img2: '/projects/project3.png' },
]

export function ProjectGrid() {
  const [carouselItems, setCarouselItems] = useState<string[]>(DEFAULT_ITEMS)

  // ── Section-wide mouse tracking for ring light ──
  const aboutRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const [mouseAngle, setMouseAngle] = useState(Math.PI * 0.35)
  const [isTracking, setIsTracking] = useState(false)

  const onSectionMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!logoRef.current) return
    const logoRect = logoRef.current.getBoundingClientRect()
    const logoCenterX = logoRect.left + logoRect.width / 2
    const logoCenterY = logoRect.top + logoRect.height / 2
    // Angle from logo center to pointer (WebGL Y is inverted)
    const dx = e.clientX - logoCenterX
    const dy = -(e.clientY - logoCenterY)
    setMouseAngle(Math.atan2(dy, dx))
  }, [])

  useEffect(() => {
    fetch('/api/glimpses')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          setCarouselItems(data.items)
        }
      })
      .catch((err) => {
        console.error('Failed to load glimpses from /api/glimpses', err)
      })
  }, [])

  return (
    <div className="relative w-full">
      {/* ── Intro / About Section ── */}
      <div
        ref={aboutRef}
        id="about"
        className="relative z-10 w-full min-h-[90vh] lg:min-h-screen flex items-center justify-center px-4 sm:px-8 lg:px-14 py-16 sm:py-24 lg:py-32 pointer-events-none"
        onMouseMove={onSectionMouseMove}
        onMouseEnter={() => setIsTracking(true)}
        onMouseLeave={() => {
          setIsTracking(false)
          setMouseAngle(Math.PI * 0.35)
        }}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="w-full max-w-7xl mx-auto">
          {/* Tight 12-col grid, items top-aligned, minimal gap — matching haoqi reference */}
          <div className="grid grid-cols-12 gap-x-6 md:gap-x-10 lg:gap-x-12 gap-y-8 md:gap-y-0 w-full items-start">
            {/* Left Column: Logo — compact, ~4/12 on desktop */}
            <div
              ref={logoRef}
              className="relative col-span-12 md:col-span-4 flex items-start justify-center md:justify-start pt-1"
            >
              <div className="w-full max-w-[280px] sm:max-w-[320px] md:max-w-full">
                <AboutRingLogo
                  mouseAngle={mouseAngle}
                  isTracking={isTracking}
                />
              </div>
            </div>

            {/* Right Column: Editorial About Typography — 8/12 on desktop */}
            <div className="flex flex-col justify-start items-start gap-5 lg:gap-7 col-span-12 md:col-span-8 text-base lg:text-xl leading-none">
              <p
                className="w-full text-black md:text-[3.8vw] 2xl:text-[3.25rem] text-xl leading-[1.3] md:leading-[1.15] select-text tracking-tight"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                LNMHACKS is the largest student run hackathon all over India. It is a 72 Hour hackathon with interesting workshops and tech talks from industry biggies.
              </p>

              <p
                className="w-full text-[rgba(54,54,48,0.6)] md:text-[3.8vw] 2xl:text-[3.25rem] text-xl leading-[1.3] md:leading-[1.15] select-text tracking-tight"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                We raised over{' '}
                <a
                  href="#sponsors"
                  className="inline text-black underline underline-offset-[0.08em] decoration-solid decoration-[rgba(54,54,48,0.32)] transition-[text-decoration-color] duration-150 ease-out hover:decoration-black"
                >
                  $9,000+ prize pool
                </a>{' '}
                in our last version. It gets bigger every year, so get ready for{' '}
                <a
                  href="#hero"
                  className="inline text-black underline underline-offset-[0.08em] decoration-solid decoration-[rgba(54,54,48,0.32)] transition-[text-decoration-color] duration-150 ease-out hover:decoration-black"
                >
                  LNMHACKS 9.0™
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Liquid Glass Carousel Section ── */}
      <div id="glimpses" className="relative z-10 w-full min-h-[100dvh] flex flex-col justify-center py-12 sm:py-20">
        <div className="text-center pb-6 sm:pb-10">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-black drop-shadow-md">
            Glimpses
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-slate-400 mt-2 sm:mt-3 font-light">
            Highlights from our past editions
          </p>
        </div>
        <div className="w-full h-[360px] sm:h-[460px] md:h-[540px] lg:h-[620px] pointer-events-auto">
          <LiquidGlassCarousel
            items={carouselItems}
            background="#F0EDE8"
            sizeMode="image"
            cardWidth={520}
            cardHeight={400}
            gap={24}
            lens={{
              shape: 'rectangle',
              width: 0.68,
              height: 0.42,
              round: 0.08,
              rotation: 0,
              dispersion: 10,
              ringColor: '#1e60ff',
            }}
            motion={{
              sensitivity: 4,
              glide: 4,
              snap: true,
            }}
            entry={{
              enabled: true,
              enterFrom: 'alternate',
              transition: { duration: 1.2, ease: 'easeOut' },
            }}
            interaction={{
              wheel: true,
              drag: true,
              clickToFocus: true,
              focusTransition: { type: 'spring', bounce: 0.2, duration: 0.7 },
            }}
          />
        </div>
      </div>

      {/* ── Project Grid / Sponsors Section ── */}
      <div id="sponsors" className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
        <div className="text-center pb-12 sm:pb-20">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-black drop-shadow-md">
            Our Past Sponsors
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-slate-400 mt-2 sm:mt-3 font-light">
            Backed by visionary organizations powering the developer community
          </p>
        </div>

        {/* 6 Sponsor Cards — 3×2 grid on desktop, 2-col on tablet, 1-col on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 lg:gap-12 items-start max-w-6xl mx-auto">
          {PROJECTS.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProjectCard({ project, index }: { project: any, index: number }) {
  const ref = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (ref.current) domRegistry.register(project.id, ref.current)
    return () => domRegistry.unregister(project.id)
  }, [project.id])

  const onPointerEnter = () => domRegistry.setHover(project.id, true)
  const onPointerLeave = () => domRegistry.setHover(project.id, false)

  return (
    <div
      className="group flex flex-col items-center w-full"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <a
        ref={ref}
        href={`#${project.id}`}
        className="block relative w-full aspect-square max-w-[340px] sm:max-w-[360px] rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 transition-transform duration-300 hover:scale-[1.03]"
      >
        {/* Invisible DOM placeholders for accessibility & layout sizing */}
        <span className="sr-only">View project: {project.title}</span>
        <img
          src={project.img1}
          alt={project.title}
          className="opacity-0 absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        />
      </a>

      {/* DOM-based text/titles centered below the card */}
      <div className="mt-5 text-center pointer-events-auto">
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors drop-shadow-sm">
          {project.title}
        </h3>
      </div>
    </div>
  )
}

export { PROJECTS }
