'use client'

import { useRef, useCallback, useEffect } from 'react'
import { AboutRingLogo, type RingPointerState } from '@/components/dom/about-ring-logo'
import { domRegistry } from '@/lib/dom-registry'
import { CTFSection } from '@/components/dom/ctf-section'
import { AsciiPacmanGame } from '@/components/ui/ascii-pacman-game'

interface ProjectItem {
  id: string
  title: string
  meta: string
  badge?: string
  year?: string
  img1: string
  img2: string
  useWebgl?: boolean
}

const PROJECTS: ProjectItem[] = [
  { id: 'monad-foundation', title: 'MONAD FOUNDATION', meta: '', badge: 'TITLE SPONSOR', img1: '/projects/proj-1-base.png', img2: '/projects/proj-1-hover.png', useWebgl: true },
  { id: 'node-ops', title: 'NODE OPS', meta: '', badge: 'SPONSOR', img1: '/projects/proj-2-base.png', img2: '/projects/proj-2-hover.png', useWebgl: true },
  { id: 'protocol-labs', title: 'PROTOCOL LABS', meta: '', badge: ' SPONSOR', img1: '/projects/proj-3-base.png', img2: '/projects/proj-3-hover.svg', useWebgl: true },
  { id: 'cyrene-ai', title: 'CYRENE AI', meta: '', badge: 'POWERED SPONSOR', img1: '/projects/proj-4-base.png', img2: '/projects/proj-4-hover.svg', useWebgl: true },
  { id: 'noah-ai', title: 'NOAH AI', meta: ' ', badge: 'POWERED SPONSOR', img1: '/projects/proj-5-base.png', img2: '/projects/proj-5-hover.svg', useWebgl: true },
]

// ─── Reusable Card Shell ─────────────────────────────────────────────
function CardWrapper({
  title,
  meta,
  badge = 'CODING PROJECT',
  projectId,
  children,
  className = '',
}: {
  title: string
  meta: string
  badge?: string
  projectId?: string
  children: React.ReactNode
  className?: string
}) {
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!projectId || !innerRef.current) return
    domRegistry.register(projectId, innerRef.current)
    return () => { domRegistry.unregister(projectId) }
  }, [projectId])

  const onEnter = () => { if (projectId) domRegistry.setHover(projectId, true) }
  const onLeave = () => { if (projectId) domRegistry.setHover(projectId, false) }

  return (
    <div
      className={`group relative flex flex-col w-full transition-transform duration-300 hover:scale-[1.01] cursor-pointer ${className}`}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div
        ref={innerRef}
        className="relative w-full overflow-hidden transition-shadow duration-300 bg-transparent"
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
      >
        {/* Top-right neon lime tag badge */}
        <span className="absolute top-0 right-0 bg-[#c0fe04] text-black text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 tracking-wider uppercase select-none z-10 pointer-events-none">
          {badge}
        </span>
        {/* DOM placeholder: preserved for sizing & aspect-ratio tracking, hidden so only WebGL renders */}
        <div className={projectId ? 'opacity-0 pointer-events-none select-none' : ''}>
          {children}
        </div>
      </div>

      {/* Editorial metadata row underneath */}
      <div className="flex justify-between items-center w-full mt-2.5 px-0.5">
        <span
          className="text-xs sm:text-[13px] font-bold tracking-wider uppercase text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200"
          style={{ fontFamily: '"tronica-mono", monospace' }}
        >
          {title}
        </span>
        <span className="text-[11px] sm:text-xs tracking-wider uppercase text-neutral-500 dark:text-neutral-400 font-mono transition-colors duration-200">
          {meta}
        </span>
      </div>
    </div>
  )
}

// ─── 1. Card Reunimos (Wide 2-col banner) ─────────────────────────────
function CardReunimos() {
  return (
    <div className="relative w-full aspect-[16/9] sm:aspect-[16/10] bg-[#D7D2C7] flex items-center justify-center overflow-hidden">
      {/* Lime accent dot */}
      <div className="absolute left-6 sm:left-12 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[#c0fe04] shadow-[0_0_8px_#c0fe04]" />

      {/* 5-petal black asterix emblem */}
      <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center group-hover:rotate-45 transition-transform duration-700 ease-out">
        {[0, 72, 144, 216, 288].map((angle) => (
          <div
            key={angle}
            className="absolute w-5 sm:w-6 h-12 sm:h-14 bg-black rounded-full"
            style={{
              transformOrigin: '50% 100%',
              transform: `rotate(${angle}deg) translateY(-8px)`,
            }}
          />
        ))}
        <div className="absolute w-4 h-4 rounded-full bg-[#D7D2C7] z-10" />
      </div>
    </div>
  )
}

// ─── 2. Card Inspire Mono ─────────────────────────────────────────────
function CardInspireMono() {
  return (
    <div className="relative w-full aspect-[16/10] bg-[#0A0A0A] flex flex-col items-center justify-center overflow-hidden px-4">
      <div className="inline-flex items-center rounded-full bg-[#FF3E00] p-1.5 sm:p-2 pr-2.5 sm:pr-3 shadow-xl">
        <span className="px-3 sm:px-5 py-1.5 sm:py-2 text-black font-mono font-bold text-lg sm:text-2xl tracking-tight">
          Inspire
        </span>
        <div className="flex items-center justify-center rounded-full bg-[#D2D2D2] px-3.5 sm:px-5 py-1.5 sm:py-2 text-black font-mono font-bold text-lg sm:text-2xl">
          Mono
        </div>
      </div>
      <span className="mt-4 text-[9px] sm:text-[10px] font-mono text-neutral-500 tracking-widest uppercase">
        © 2025 HAOQI
      </span>
    </div>
  )
}

// ─── 3. Card WASM Design Utils ────────────────────────────────────────
function CardWasmUtils() {
  return (
    <div className="relative w-full aspect-[16/10] bg-[#FF3E00] flex items-center justify-center p-6 overflow-hidden">
      <div className="font-mono text-white text-xs sm:text-sm md:text-base font-bold tracking-tight text-center select-all">
        npm i @wenhaoqi/wasm_design_utils
      </div>
      {/* Lime square accent */}
      <div className="absolute bottom-6 right-10 w-3 h-3 bg-[#c0fe04] shadow-[0_0_6px_#c0fe04]" />
    </div>
  )
}

// ─── 4. Card VectorSymbols ───────────────────────────────────────────
function CardVectorSymbols() {
  return (
    <div className="relative w-full aspect-[4/3] bg-[#EAE5DA] flex items-center justify-center p-4 overflow-hidden">
      <div className="relative w-full max-w-[270px] bg-[#FAF8F5] rounded-md border border-neutral-300 shadow-sm p-3 text-neutral-800">
        {/* Window header */}
        <div className="flex items-center justify-between border-b border-neutral-200 pb-1.5 mb-2 text-[9px] font-mono text-neutral-500">
          <span className="font-bold text-neutral-700">VectorSymbols</span>
          <div className="flex gap-1.5 text-neutral-400">
            <span>&lt;&gt;</span>
            <span>👁</span>
            <span>⧉</span>
            <span>👤</span>
          </div>
        </div>
        {/* Symbol grid */}
        <div className="relative grid grid-cols-5 gap-2 text-center text-xs font-mono text-neutral-700 py-1">
          <span>B</span><span>I</span><span>U</span><span>S</span><span>⌸</span>
          <span>⊟</span><span>☑</span><span>✂</span><span>🗑</span><span>⌂</span>
          <span>⤓</span><span>✉</span><span>⚡</span><span>🔊</span><span>⚙</span>

          {/* Active selection purple box with corner handles */}
          <div className="absolute inset-x-2 top-0 bottom-2 border border-purple-500/80 bg-purple-500/10 pointer-events-none rounded-sm">
            <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-purple-600 rounded-sm" />
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-purple-600 rounded-sm" />
            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-purple-600 rounded-sm" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-purple-600 rounded-sm" />
          </div>
        </div>
        {/* Dimensions badge & tags */}
        <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-neutral-200 text-[8px] font-mono">
          <span className="bg-purple-600 text-white px-1.5 py-0.5 rounded font-bold">516 × 240</span>
          <span className="bg-[#c0fe04] text-black px-1.5 py-0.5 rounded font-bold uppercase">Heap Wasm</span>
        </div>
      </div>
    </div>
  )
}

// ─── 5. Card Darkside ────────────────────────────────────────────────
function CardDarkside() {
  return (
    <div className="relative w-full aspect-[4/3] bg-[#DFEDF8] flex items-center justify-center p-4 overflow-hidden">
      <div className="relative flex items-center justify-center gap-2 w-full max-w-[280px]">
        {/* Light Card */}
        <div className="w-1/2 bg-white/90 backdrop-blur rounded-lg border border-neutral-200 shadow-sm p-2 text-neutral-800">
          <div className="flex justify-between text-[8px] font-serif italic mb-1">
            <span>Discover</span>
            <span className="text-[7px] font-sans text-neutral-400">Filter (4)</span>
          </div>
          <div className="w-full h-12 rounded bg-gradient-to-tr from-slate-600 to-slate-400 mb-1" />
          <div className="flex justify-between items-center text-[7px] text-neutral-600 font-mono">
            <span>Gradient 045</span>
            <span className="w-3 h-3 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold">+</span>
          </div>
        </div>
        {/* Dark Card */}
        <div className="w-1/2 bg-[#12161A] text-white rounded-lg border border-neutral-700 shadow-lg p-2">
          <div className="flex justify-between text-[8px] font-serif italic mb-1">
            <span>Discover</span>
            <span className="text-[7px] font-sans text-neutral-400">Clear</span>
          </div>
          <div className="w-full h-12 rounded bg-gradient-to-tr from-cyan-900 to-indigo-900 mb-1" />
          <div className="flex justify-between items-center text-[7px] text-neutral-400 font-mono">
            <span>Gradient 045</span>
            <span className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">+</span>
          </div>
        </div>
      </div>
    </div>
  )
}
export function ProjectGrid() {
  const aboutRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)

  // Shared mutable state instead of React state. setMouseAngle() used to run on
  // every mousemove over the about section, re-rendering this whole subtree —
  // ten cards of inline SVG plus the ring-logo Canvas — at pointer rate.
  const pointerStateRef = useRef<RingPointerState>({ angle: Math.PI * 0.35, tracking: false })
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null)
  const angleRafRef = useRef(0)

  const computeAngle = useCallback(() => {
    angleRafRef.current = 0
    const pending = pendingPointerRef.current
    if (!pending || !logoRef.current) return
    const logoRect = logoRef.current.getBoundingClientRect()
    const logoCenterX = logoRect.left + logoRect.width / 2
    const logoCenterY = logoRect.top + logoRect.height / 2
    const dx = pending.x - logoCenterX
    const dy = -(pending.y - logoCenterY)
    pointerStateRef.current.angle = Math.atan2(dy, dx)
  }, [])

  // Coalesced to one measurement per frame; previously every mousemove event
  // forced its own layout read.
  const onSectionMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      pendingPointerRef.current = { x: e.clientX, y: e.clientY }
      if (angleRafRef.current) return
      angleRafRef.current = requestAnimationFrame(computeAngle)
    },
    [computeAngle]
  )

  useEffect(() => {
    return () => {
      if (angleRafRef.current) cancelAnimationFrame(angleRafRef.current)
    }
  }, [])

  return (
    <div className="relative w-full bg-background transition-colors duration-500 ease-in-out">
      {/* ── Intro / About Section ── */}
      <div
        ref={aboutRef}
        id="about"
        className="relative z-10 w-full min-h-screen flex items-center justify-center px-4 sm:px-8 lg:px-14 py-12 lg:py-16 pointer-events-none"
        onMouseMove={onSectionMouseMove}
        onMouseEnter={() => {
          pointerStateRef.current.tracking = true
        }}
        onMouseLeave={() => {
          pointerStateRef.current.tracking = false
          pointerStateRef.current.angle = Math.PI * 0.35
        }}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="w-full max-w-[1400px] 2xl:max-w-[1540px] mx-auto">
          <div className="grid grid-cols-12 gap-x-8 md:gap-x-12 lg:gap-x-16 xl:gap-x-20 gap-y-10 md:gap-y-0 w-full items-center">
            {/* Left Column: Logo — sized and aligned to match the vertical span of both paragraphs */}
            <div
              ref={logoRef}
              className="relative col-span-12 md:col-span-5 lg:col-span-4 xl:col-span-4 flex items-center justify-center md:justify-start"
            >
              <div className="w-full max-w-[300px] sm:max-w-[360px] md:max-w-[420px] lg:max-w-[460px] xl:max-w-[480px]">
                <AboutRingLogo pointerState={pointerStateRef} />
              </div>
            </div>

            {/* Right Column: Editorial About Typography — widened to fill horizontal space */}
            <div className="flex flex-col justify-center items-start gap-8 sm:gap-10 md:gap-12 lg:gap-14 col-span-12 md:col-span-7 lg:col-span-8 xl:col-span-8 text-base lg:text-xl leading-none">
              <p
                className="w-full text-black dark:text-white md:text-[3.4vw] lg:text-[2.7vw] xl:text-[2.75rem] 2xl:text-[3.1rem] text-xl leading-[1.28] md:leading-[1.16] select-text tracking-tight transition-colors duration-200"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                India's student-run Web3 hackathon & CTF. Bringing together ambitious developers, cybersecurity enthusiasts, and emerging founders for 72 hours of building, competition, and hands-on learning.
              </p>

              <p
                className="w-full text-[rgba(54,54,48,0.6)] dark:text-neutral-400 md:text-[3.4vw] lg:text-[2.7vw] xl:text-[2.75rem] 2xl:text-[3.1rem] text-xl leading-[1.28] md:leading-[1.16] select-text tracking-tight transition-colors duration-200"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                We raised over{' '}
                <a
                  href="#sponsors"
                  className="inline text-black dark:text-white underline underline-offset-[0.08em] decoration-solid decoration-[rgba(54,54,48,0.32)] dark:decoration-neutral-600 transition-colors duration-150 ease-out hover:decoration-black dark:hover:decoration-white"
                >
                  $9,000+ prize pool
                </a>{' '}
                in our last version. It gets bigger every year, so get ready for{' '}
                <a
                  href="#hero"
                  className="inline text-black dark:text-white underline underline-offset-[0.08em] decoration-solid decoration-[rgba(54,54,48,0.32)] dark:decoration-neutral-600 transition-colors duration-150 ease-out hover:decoration-black dark:hover:decoration-white"
                >
                  LNMHACKS 9.0™
                </a>
                .
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── CTF Challenge Separator & Upcoming Details Section ── */}
      <CTFSection />

      {/* ── ASCII Pac-Man Game Animation (fills dead space between CTF and sponsors) ── */}
      <AsciiPacmanGame />

      {/* ── Asymmetric Modular Canvas Grid (Sponsors Section) ── */}
      <div id="sponsors" className="relative z-10 w-full max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
        {/* Section Header */}
        <div className="w-full pb-8 sm:pb-12 text-left">
          <span
            className="text-xs font-mono tracking-widest uppercase text-neutral-500 dark:text-neutral-400 mb-2 block"
            style={{ fontFamily: '"tronica-mono", monospace' }}
          >
            [ SPONSORS & PARTNERS ]
          </span>
          <h2
            className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-black dark:text-white uppercase transition-colors duration-200"
            style={{
              fontFamily: '"tiktok", sans-serif',
              fontVariationSettings: '"wght" 850, "wdth" 110',
              letterSpacing: '-0.03em',
            }}
          >
            OUR  SPONSORS
          </h2>
          <p
            className="mt-2 text-base sm:text-lg md:text-xl tracking-tight max-w-xl text-neutral-600 dark:text-neutral-400 transition-colors duration-200"
            style={{ fontFamily: '"tiktok", sans-serif' }}
          >
            Backed by visionary organizations powering the developer community
          </p>
        </div>

        {/* ── The 3-Column Asymmetric Canvas Grid (Directly over existing background) ── */}
        <div className="relative w-full">
          {/* ── ROW 1: Empty Col 1 | Wide Monad Banner (Col 2 & 3) ── */}
          <div className="relative grid grid-cols-1 md:grid-cols-3 items-stretch">
            {/* Col 1: Empty cell */}
            <div className="hidden md:flex" />

            {/* Col 2 & 3: Wide Card 1 (Monad Foundation) */}
            <div className="col-span-1 md:col-span-2 p-4 sm:p-6 lg:p-8">
              <CardWrapper
                projectId={PROJECTS[0].id}
                title={PROJECTS[0].title}
                meta={PROJECTS[0].meta}
                badge={PROJECTS[0].badge}
              >
                <CardReunimos />
              </CardWrapper>
            </div>
          </div>

          {/* ── ROW 2: Card 2 (Inspire Mono) | Card 3 (WASM Utils) | Empty Col 3 ── */}
          <div className="relative grid grid-cols-1 md:grid-cols-3 items-stretch">
            {/* Col 1: Card 2 (Inspire Mono) */}
            <div className="p-4 sm:p-6 lg:p-8">
              <CardWrapper
                projectId={PROJECTS[1].id}
                title={PROJECTS[1].title}
                meta={PROJECTS[1].meta}
                badge={PROJECTS[1].badge}
              >
                <CardInspireMono />
              </CardWrapper>
            </div>

            {/* Col 2: Card 3 (WASM Utils) */}
            <div className="p-4 sm:p-6 lg:p-8">
              <CardWrapper
                projectId={PROJECTS[2].id}
                title={PROJECTS[2].title}
                meta={PROJECTS[2].meta}
                badge={PROJECTS[2].badge}
              >
                <CardWasmUtils />
              </CardWrapper>
            </div>

            {/* Col 3: Empty Cell */}
            <div className="hidden md:flex" />
          </div>

          {/* ── ROW 3: Empty Col 1 | Card 4 (VectorSymbols) | Card 5 (Darkside) ── */}
          <div className="relative grid grid-cols-1 md:grid-cols-3 items-stretch">
            {/* Col 1: Empty Cell */}
            <div className="hidden md:flex" />

            {/* Col 2: Card 4 (VectorSymbols) */}
            <div className="p-4 sm:p-6 lg:p-8">
              <CardWrapper
                projectId={PROJECTS[3].id}
                title={PROJECTS[3].title}
                meta={PROJECTS[3].meta}
                badge={PROJECTS[3].badge}
              >
                <CardVectorSymbols />
              </CardWrapper>
            </div>

            {/* Col 3: Card 5 (Darkside) */}
            <div className="p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
              <CardWrapper
                projectId={PROJECTS[4].id}
                title={PROJECTS[4].title}
                meta={PROJECTS[4].meta}
                badge={PROJECTS[4].badge}
              >
                <CardDarkside />
              </CardWrapper>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export { PROJECTS }
