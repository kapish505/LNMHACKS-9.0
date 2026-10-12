'use client'

import { useEffect, useRef } from 'react'
import { domRegistry } from '@/lib/dom-registry'

const PROJECTS = [
  { id: 'proj-1', title: 'Cosmic Sequence', img1: '/projects/p1.svg', img2: '/projects/p2.svg' },
  { id: 'proj-2', title: 'Neon Horizon', img1: '/projects/p3.svg', img2: '/projects/p4.svg' },
  { id: 'proj-3', title: 'Void Synthesis', img1: '/projects/p5.svg', img2: '/projects/p6.svg' },
  { id: 'proj-4', title: 'Lunar Matrix', img1: '/projects/p7.svg', img2: '/projects/p8.svg' },
  { id: 'proj-5', title: 'Solar Flare', img1: '/projects/p9.svg', img2: '/projects/p10.svg' },
  { id: 'proj-6', title: 'Orbit Protocol', img1: '/projects/p11.svg', img2: '/projects/p12.svg' },
]

export function ProjectGrid() {
  const aboutImageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (aboutImageRef.current) domRegistry.register('about-image', aboutImageRef.current)
    return () => domRegistry.unregister('about-image')
  }, [])

  const onPointerEnter = () => domRegistry.setHover('about-image', true)
  const onPointerLeave = () => domRegistry.setHover('about-image', false)

  return (
    <div className="relative w-full">
      {/* ── Intro / About Section ── */}
      <div id="about" className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 md:py-48 pointer-events-none">
        <div className="pointer-events-auto">
          <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-12 md:gap-24 mb-16 sm:mb-24 md:mb-48">
            {/* Image Placeholder */}
            <div className="w-full max-w-xs sm:max-w-sm md:w-1/3 relative shrink-0 mx-auto">
              <div 
                ref={aboutImageRef}
                onPointerEnter={onPointerEnter}
                onPointerLeave={onPointerLeave}
                className="w-full aspect-square relative group block cursor-pointer"
              >
                <img src="/projects/p1.svg" alt="Placeholder" className="opacity-0 absolute inset-0 w-full h-full object-cover" />
                <div className="absolute bottom-6 right-6 w-3 h-3 bg-blue-600 pointer-events-none"></div>
              </div>
              <div className="absolute -top-4 left-2 sm:-left-6 md:-top-10 md:-left-8 text-blue-600 text-3xl sm:text-4xl md:text-6xl rotate-[-15deg] font-serif italic font-bold opacity-80 pointer-events-none" style={{ fontFamily: 'cursive' }}>
                Signature
              </div>
            </div>

            {/* Text Placeholder */}
            <div className="w-full md:w-2/3 text-center md:text-left mt-4 md:mt-0">
              <p className="text-xl sm:text-2xl md:text-4xl lg:text-[2.75rem] font-medium text-slate-900 leading-[1.2] md:leading-[1.15] tracking-tight">
                [Placeholder Headline: I explore how to shape AI-era workflows with craft and taste, building the next generation of digital products.]
              </p>
              <p className="text-base sm:text-lg md:text-3xl text-slate-400 mt-4 sm:mt-6 md:mt-8 leading-[1.3] font-light">
                [Placeholder Subtitle: I&apos;m building Project 1, and previously worked on Company A, Company B, and Company C.]
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Project Grid Section ── */}
      <div id="sponsors" className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 md:py-48">
        <div className="text-center pb-8 sm:pb-12">
          <span className="text-xs uppercase tracking-widest text-blue-600 font-semibold">Featured Work</span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mt-2 drop-shadow-md">Selected Projects</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-16 md:gap-32">
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
    <a 
      ref={ref}
      href={`#${project.id}`}
      className={`group block relative w-full aspect-[4/3] rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-8 focus-visible:ring-offset-slate-900 ${index % 2 === 1 ? 'md:mt-32' : ''}`}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {/* Invisible DOM placeholders for screen readers / layout */}
      <span className="sr-only">View project: {project.title}</span>
      <img src={project.img1} alt={project.title} className="opacity-0 absolute inset-0 w-full h-full object-cover" />
      
      {/* DOM-based text/titles that sit on top or below */}
      <div className="absolute -bottom-10 left-0">
        <h3 className="text-xl font-medium text-white/80 group-hover:text-white transition-colors">
          {project.title}
        </h3>
      </div>
    </a>
  )
}

export { PROJECTS }
