'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { domRegistry } from '@/lib/dom-registry'

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
]

export function ProjectGrid() {
  const [carouselItems, setCarouselItems] = useState<string[]>(DEFAULT_ITEMS)

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
      <div id="about" className="relative z-10 w-full min-h-[100dvh] flex items-center justify-center px-4 sm:px-6 pointer-events-none">
        <div className="w-full max-w-7xl mx-auto pointer-events-auto py-12">
          <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12 md:gap-24">
            {/* Logo (No Background) */}
            <div className="w-full max-w-xs sm:max-w-sm md:w-1/3 relative shrink-0 mx-auto flex items-center justify-center">
              <div className="w-full aspect-square relative flex items-center justify-center p-2 sm:p-4">
                <img
                  src="/logo.png"
                  alt="LNMHACKS Logo"
                  className="w-full h-full object-contain select-none drop-shadow-md transition-transform duration-300 hover:scale-105"
                />
              </div>
            </div>

            {/* Text Placeholder */}
            <div className="w-full md:w-2/3 text-center md:text-left mt-4 md:mt-0">
              <p className="text-xl sm:text-2xl md:text-4xl lg:text-[2.75rem] font-medium text-slate-900 leading-[1.2] md:leading-[1.15] tracking-tight">
                LNMHACKS is the largest student run hackathon all over India.It is a 72 Hour hackathon with interesting workshops and tech talks from industry biggies
              </p>
              <p className="text-base sm:text-lg md:text-3xl text-slate-400 mt-4 sm:mt-6 md:mt-8 leading-[1.3] font-light">
                We raised over 9000$+ prize pool in our last version.It gets bigger every year,So get ready for LNMHACKS 9.O
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

      {/* ── Project Grid / Sponsors Section (Sticky Stacking Card Effect) ── */}
      <div id="sponsors" className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-32">
        <div className="text-center pb-12 sm:pb-20">
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-black drop-shadow-md">
            Our Past Sponsors
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-slate-400 mt-2 sm:mt-3 font-light">
            Backed by visionary organizations powering the developer community
          </p>
        </div>

        {/* 3 Sponsor Cards Grid with 3D Sticky Note Scroll Curl Effect */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 sm:gap-12 lg:gap-14 items-start max-w-6xl mx-auto">
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
