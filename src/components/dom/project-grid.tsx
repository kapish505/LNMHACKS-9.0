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
  { id: 'proj-1', title: 'NodeOps', meta: '2025 TITLE SPONSOR ↗', img1: '/projects/project1.png', img2: '/projects/project1.png' },
  { id: 'proj-2', title: 'Monad Foundation', meta: '2025 POWERED BY ↗', img1: '/projects/project2.png', img2: '/projects/project2.png' },
  { id: 'proj-3', title: 'Cyrene AI', meta: '2024 GOLD SPONSOR ↗', img1: '/projects/project3.png', img2: '/projects/project3.png' },
  { id: 'proj-4', title: 'Devfolio', meta: '2024 PLATINUM SPONSOR ↗', img1: '/projects/project1.png', img2: '/projects/project1.png' },
  { id: 'proj-5', title: 'Polygon', meta: '2024 ECOSYSTEM ↗', img1: '/projects/project2.png', img2: '/projects/project2.png' },
  { id: 'proj-6', title: 'Solana', meta: '2024 TRACK SPONSOR ↗', img1: '/projects/project3.png', img2: '/projects/project3.png' },
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
          {/* 12-col grid with generous breathing space between logo and text */}
          <div className="grid grid-cols-12 gap-x-8 md:gap-x-14 lg:gap-x-20 xl:gap-x-24 gap-y-10 md:gap-y-0 w-full items-start">
            {/* Left Column: Logo — compact, ~4/12 on desktop */}
            <div
              ref={logoRef}
              className="relative col-span-12 md:col-span-4 flex items-start justify-center md:justify-start pt-1"
            >
              <div className="w-full max-w-[260px] sm:max-w-[300px] md:max-w-[340px]">
                <AboutRingLogo
                  mouseAngle={mouseAngle}
                  isTracking={isTracking}
                />
              </div>
            </div>

            {/* Right Column: Editorial About Typography with increased vertical gap */}
            <div className="flex flex-col justify-start items-start gap-8 sm:gap-10 md:gap-12 lg:gap-16 col-span-12 md:col-span-8 text-base lg:text-xl leading-none">
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
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-14 pb-8 sm:pb-12 text-left">
          <span
            className="text-xs font-mono tracking-widest uppercase text-neutral-500 mb-2 block"
            style={{ fontFamily: '"tronica-mono", monospace' }}
          >
            [ 01 / GLIMPSES ]
          </span>
          <h2
            className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-black uppercase"
            style={{
              fontFamily: '"tiktok", sans-serif',
              fontVariationSettings: '"wght" 850, "wdth" 110',
              letterSpacing: '-0.03em',
            }}
          >
            GLIMPSES
          </h2>
          <p
            className="mt-2 text-base sm:text-lg md:text-xl tracking-tight max-w-xl"
            style={{
              color: 'rgba(54, 54, 48, 0.6)',
              fontFamily: '"tiktok", sans-serif',
            }}
          >
            Highlights from our past editions
          </p>
        </div>
        <div className="w-full h-[360px] sm:h-[460px] md:h-[540px] lg:h-[620px] pointer-events-auto">
          <LiquidGlassCarousel
            items={carouselItems}
            background="#F0EDE8"
            sizeMode="image"
            cardWidth={620}
            cardHeight={440}
            gap={60}
            lens={{
              shape: 'rectangle',
              width: 0.82,
              height: 0.55,
              round: 0.06,
              rotation: 0,
              dispersion: 6,
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

      {/* ── Project Grid / Sponsors Section (2-Column Editorial Grid matching Haoqi) ── */}
      <div id="sponsors" className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-14 py-20 sm:py-32">
        <div className="w-full pb-10 sm:pb-16 text-left">
          <span
            className="text-xs font-mono tracking-widest uppercase text-neutral-500 mb-2 block"
            style={{ fontFamily: '"tronica-mono", monospace' }}
          >
            [ 02 / PAST SPONSORS ]
          </span>
          <h2
            className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-black uppercase"
            style={{
              fontFamily: '"tiktok", sans-serif',
              fontVariationSettings: '"wght" 850, "wdth" 110',
              letterSpacing: '-0.03em',
            }}
          >
            OUR PAST SPONSORS
          </h2>
          <p
            className="mt-2 text-base sm:text-lg md:text-xl tracking-tight max-w-xl"
            style={{
              color: 'rgba(54, 54, 48, 0.6)',
              fontFamily: '"tiktok", sans-serif',
            }}
          >
            Backed by visionary organizations powering the developer community
          </p>
        </div>

        {/* 2-Column Editorial Grid matching Haoqi reference */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 lg:gap-14 items-start max-w-6xl mx-auto">
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
      className="group flex flex-col w-full"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <a
        ref={ref}
        href={`#${project.id}`}
        className="block relative w-full aspect-[16/10] rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4 transition-transform duration-300 hover:scale-[1.015]"
      >
        {/* Invisible DOM placeholders for accessibility & layout sizing */}
        <span className="sr-only">View project: {project.title}</span>
        <img
          src={project.img1}
          alt={project.title}
          className="opacity-0 absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />
      </a>

      {/* Editorial metadata row below card — left title, right category/year tag */}
      <div className="flex justify-between items-center w-full mt-3 px-1">
        <span
          className="text-xs sm:text-sm font-bold tracking-wider uppercase text-neutral-900 group-hover:text-blue-600 transition-colors"
          style={{ fontFamily: '"tronica-mono", monospace' }}
        >
          {project.title}
        </span>
        <span className="text-xs sm:text-sm tracking-wider uppercase text-neutral-500 font-mono">
          {project.meta}
        </span>
      </div>
    </div>
  )
}

export { PROJECTS }
