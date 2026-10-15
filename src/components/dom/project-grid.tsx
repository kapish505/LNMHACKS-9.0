'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { AboutRingLogo } from '@/components/dom/about-ring-logo'
import { domRegistry } from '@/lib/dom-registry'

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
  { id: 'proj-6', title: 'ADRIVE 阿里云盘', meta: '2020-2022', badge: 'CODING PROJECT', img1: '/projects/proj-6-base.svg', img2: '/projects/proj-6-hover.svg', useWebgl: true },
  { id: 'proj-7', title: 'SHORE ICON', meta: '2022', badge: 'CODING PROJECT', img1: '/projects/proj-7-base.svg', img2: '/projects/proj-7-hover.svg', useWebgl: true },
  { id: 'proj-8', title: 'TEAMBITION', meta: '2018-2020', badge: 'CODING PROJECT', img1: '/projects/proj-8-base.svg', img2: '/projects/proj-8-hover.svg', useWebgl: true },
  { id: 'proj-9', title: 'FOF: SEE HEAR TOUCH', meta: '2022 EVENT ↗', badge: 'CODING PROJECT', img1: '/projects/proj-9-base.svg', img2: '/projects/proj-9-hover.svg', useWebgl: true },
  { id: 'proj-10', title: 'FOF: DESIGN SYSTEM', meta: '2021 EVENT ↗', badge: 'CODING PROJECT', img1: '/projects/proj-10-base.svg', img2: '/projects/proj-10-hover.svg', useWebgl: true },
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

// ─── 6. Card ADRIVE 阿里云盘 (Smartphone mockup) ──────────────────────
function CardAdrive() {
  return (
    <div className="relative w-full aspect-[3/4] bg-[#ECE9F4] flex items-end justify-center px-4 overflow-hidden">
      <div className="w-[84%] max-w-[240px] bg-black rounded-t-[38px] border-[5px] border-b-0 border-neutral-800 shadow-2xl pt-3 px-3.5 pb-6">
        {/* Dynamic Island */}
        <div className="w-14 h-3.5 bg-neutral-900 rounded-full mx-auto mb-2.5" />
        {/* Status Bar */}
        <div className="flex justify-between text-white text-[9px] font-bold px-1 mb-3.5 font-mono">
          <span>9:41</span>
          <span>5G 100%</span>
        </div>
        {/* 2x2 App Grid */}
        <div className="grid grid-cols-2 gap-2.5 text-center">
          {/* Adrive */}
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-400 flex items-center justify-center shadow-md">
              <div className="w-5 h-5 rounded-full border-4 border-white" />
            </div>
            <span className="text-[8px] text-white/90 mt-1 font-sans">阿里云盘</span>
          </div>
          {/* Calendar */}
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 rounded-2xl bg-white flex flex-col items-center justify-center shadow-md">
              <span className="text-[7px] font-bold text-red-500 uppercase tracking-tighter">Tue</span>
              <span className="text-xs font-black text-black leading-none">1</span>
            </div>
            <span className="text-[8px] text-white/90 mt-1 font-sans">Calendar</span>
          </div>
          {/* Notes */}
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-b from-yellow-300 to-yellow-400 flex flex-col justify-center px-2 shadow-md">
              <div className="w-full h-0.5 bg-yellow-600/40 my-0.5" />
              <div className="w-3/4 h-0.5 bg-yellow-600/40 my-0.5" />
            </div>
            <span className="text-[8px] text-white/90 mt-1 font-sans">Notes</span>
          </div>
          {/* Mail */}
          <div className="flex flex-col items-center">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-400 to-blue-600 flex items-center justify-center shadow-md text-white text-xs">
              ✉
            </div>
            <span className="text-[8px] text-white/90 mt-1 font-sans">Mail</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 7. Card Shore Icon (3x4 icon grid) ──────────────────────────────
function CardShoreIcon() {
  const glyphs = [
    // 1. Smiley
    <svg key="1" viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[1.75] stroke-linecap-round stroke-linejoin-round"><circle cx="12" cy="12" r="9" /><path d="M 8 13 C 8 16 16 16 16 13" /><circle cx="9" cy="9.5" r="1" fill="white" stroke="none" /><circle cx="15" cy="9.5" r="1" fill="white" stroke="none" /></svg>,
    // 2. Lightbulb
    <svg key="2" viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[1.75] stroke-linecap-round stroke-linejoin-round"><path d="M 9 18 H 15 M 10 21 H 14 M 12 2 A 6 6 0 0 0 6 8 C 6 11 9 13 9 15 H 15 C 15 13 18 11 18 8 A 6 6 0 0 0 12 2 Z" /></svg>,
    // 3. Copy
    <svg key="3" viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[1.75] stroke-linecap-round stroke-linejoin-round"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M 5 15 H 4 A 2 2 0 0 1 2 13 V 4 A 2 2 0 0 1 4 2 H 13 A 2 2 0 0 1 15 4 V 5" /></svg>,
    // 4. Video Camera
    <svg key="4" viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[1.75] stroke-linecap-round stroke-linejoin-round"><path d="M 15 10 L 21 6 V 18 L 15 14 Z" /><rect x="3" y="6" width="12" height="12" rx="2" /></svg>,
    // 5. Home
    <svg key="5" viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[1.75] stroke-linecap-round stroke-linejoin-round"><path d="M 3 10 L 12 3 L 21 10 V 20 A 1 1 0 0 1 20 21 H 4 A 1 1 0 0 1 3 20 Z" /><path d="M 9 21 V 13 H 15 V 21" /></svg>,
    // 6. Link
    <svg key="6" viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[1.75] stroke-linecap-round stroke-linejoin-round"><path d="M 10 13 A 5 5 0 0 0 17 13 L 20 10 A 5 5 0 0 0 13 3 L 11 5" /><path d="M 14 11 A 5 5 0 0 0 7 11 L 4 14 A 5 5 0 0 0 11 21 L 13 19" /></svg>,
    // 7. Check
    <svg key="7" viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[1.75] stroke-linecap-round stroke-linejoin-round"><circle cx="12" cy="12" r="9" /><path d="M 8 12 L 11 15 L 16 9" /></svg>,
    // 8. Users
    <svg key="8" viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[1.75] stroke-linecap-round stroke-linejoin-round"><circle cx="9" cy="7" r="3.5" /><path d="M 2 19 A 7 7 0 0 1 16 19" /><circle cx="17" cy="8" r="2.5" /><path d="M 16 14 A 5 5 0 0 1 22 18" /></svg>,
    // 9. Search
    <svg key="9" viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[1.75] stroke-linecap-round stroke-linejoin-round"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M 15.5 15.5 L 21 21" /></svg>,
    // 10. Speaker
    <svg key="10" viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[1.75] stroke-linecap-round stroke-linejoin-round"><polygon points="4,9 8,9 13,5 13,19 8,15 4,15" fill="white" /><path d="M 16 9 A 4 4 0 0 1 16 15 M 19 6 A 8 8 0 0 1 19 18" /></svg>,
    // 11. Download
    <svg key="11" viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[1.75] stroke-linecap-round stroke-linejoin-round"><path d="M 12 3 V 15 M 7 10 L 12 15 L 17 10" /><path d="M 4 19 H 20" /></svg>,
    // 12. Music
    <svg key="12" viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[1.75] stroke-linecap-round stroke-linejoin-round"><path d="M 9 18 A 3 3 0 1 1 6 15 A 3 3 0 0 1 9 18 Z V 6 L 19 3 V 15 A 3 3 0 1 1 16 12 A 3 3 0 0 1 19 15 Z" /></svg>,
    // 13. Pencil
    <svg key="13" viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[1.75] stroke-linecap-round stroke-linejoin-round"><path d="M 17 3 A 2 2 0 0 1 20 6 L 7 19 L 3 20 L 4 16 Z" /></svg>,
    // 14. EyeSlash
    <svg key="14" viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[1.75] stroke-linecap-round stroke-linejoin-round"><path d="M 2 2 L 22 22 M 9.8 9.8 A 3 3 0 0 0 14.2 14.2 M 2 12 A 13 13 0 0 0 22 12" /></svg>,
    // 15. Undo
    <svg key="15" viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[1.75] stroke-linecap-round stroke-linejoin-round"><path d="M 3 8 H 15 A 6 6 0 1 1 9 19" /><path d="M 7 4 L 3 8 L 7 12" /></svg>,
    // 16. Mic
    <svg key="16" viewBox="0 0 24 24" className="w-5 h-5 stroke-white fill-none stroke-[1.75] stroke-linecap-round stroke-linejoin-round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M 5 10 A 7 7 0 0 0 19 10 M 12 17 V 21 M 8 21 H 16" /></svg>,
  ]

  return (
    <div className="relative w-full aspect-square bg-[#0B0B0C] flex items-center justify-center p-6 sm:p-8 overflow-hidden">
      <div className="grid grid-cols-4 gap-4 sm:gap-6 text-white w-full max-w-[240px]">
        {glyphs}
      </div>
    </div>
  )
}

// ─── 8. Card Teambition (3D Ribbon T + Sphere) ────────────────────────
function CardTeambition() {
  return (
    <div className="relative w-full aspect-square bg-gradient-to-br from-[#2F80ED] to-[#3B82F6] flex items-center justify-center p-6 overflow-hidden">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-xl">
          <defs>
            <linearGradient id="ribbonGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#99C2FF" />
            </linearGradient>
            <linearGradient id="ribbonGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
            <radialGradient id="sphereGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="60%" stopColor="#1E40AF" />
              <stop offset="100%" stopColor="#0F172A" />
            </radialGradient>
          </defs>
          {/* Horizontal loop of T */}
          <path
            d="M 25,50 C 25,32 135,32 135,50 C 135,68 25,68 25,50 Z"
            fill="url(#ribbonGrad1)"
          />
          {/* Vertical stem of T */}
          <path
            d="M 68,50 L 92,50 L 92,125 C 92,128 68,128 68,125 Z"
            fill="url(#ribbonGrad2)"
          />
          {/* 3D sphere */}
          <circle cx="112" cy="50" r="16" fill="url(#sphereGrad)" />
        </svg>
      </div>
    </div>
  )
}

// ─── 9. Card FOF: SEE HEAR TOUCH ─────────────────────────────────────
function CardFofSeeHearTouch() {
  return (
    <div className="relative w-full aspect-square bg-[#E87661] flex items-center justify-center p-6 overflow-hidden">
      <div className="flex flex-col gap-3 w-full max-w-[240px]">
        {/* Frame 1: SEE */}
        <div className="relative h-12 bg-black border-2 border-neutral-900 shadow-md flex items-center justify-between px-3 overflow-hidden">
          <div className="w-16 h-8 bg-neutral-800 rounded flex items-center justify-center text-neutral-400 text-xs">
            👁
          </div>
          <span className="font-sans font-black text-lg text-white tracking-wider">SEE</span>
        </div>
        {/* Frame 2: HEAR */}
        <div className="relative h-12 bg-black border-2 border-neutral-900 shadow-md flex items-center justify-between px-3 overflow-hidden">
          <div className="w-16 h-8 bg-neutral-800 rounded flex items-center justify-center text-neutral-400 text-xs">
            👂
          </div>
          <span className="font-sans font-black text-lg text-white tracking-wider">HEAR</span>
        </div>
        {/* Frame 3: TOUCH */}
        <div className="relative h-12 bg-black border-2 border-neutral-900 shadow-md flex items-center justify-between px-3 overflow-hidden">
          <div className="w-16 h-8 bg-neutral-800 rounded flex items-center justify-center text-neutral-400 text-xs">
            ✋
          </div>
          <span className="font-sans font-black text-lg text-white tracking-wider">TOUCH</span>
        </div>
      </div>
    </div>
  )
}

// ─── 10. Card FOF: DESIGN SYSTEM (3D Isometric Blocks) ────────────────
function CardFofDesignSystem() {
  return (
    <div className="relative w-full aspect-square bg-[#C6C8F5] flex items-center justify-center p-6 overflow-hidden">
      <div className="relative w-44 h-44 flex flex-col items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-md">
          <g transform="translate(10, 10)">
            {/* init */}
            <path d="M 20,40 L 35,32 L 35,65 L 20,73 Z" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
            <path d="M 20,40 L 35,32 L 45,38 L 30,46 Z" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1" />
            <path d="M 50,30 L 65,22 L 65,65 L 50,73 Z" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
            <path d="M 80,40 L 95,32 L 95,65 L 80,73 Z" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
            <path d="M 110,25 L 125,17 L 125,65 L 110,73 Z" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
            {/* Accent colored isometric cubes */}
            <polygon points="35,20 45,14 55,20 45,26" fill="#F87171" />
            <polygon points="35,20 45,26 45,36 35,30" fill="#EF4444" />
            <polygon points="55,20 45,26 45,36 55,30" fill="#DC2626" />

            <polygon points="120,40 130,34 140,40 130,46" fill="#60A5FA" />
            <polygon points="120,40 130,46 130,56 120,50" fill="#3B82F6" />
            <polygon points="140,40 130,46 130,56 140,50" fill="#2563EB" />

            {/* 系统 isometric grid */}
            <path d="M 25,85 L 60,65 L 75,74 L 40,94 Z" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
            <path d="M 35,92 L 50,83 L 50,125 L 35,134 Z" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1" />
            <path d="M 65,85 L 115,56 L 130,65 L 80,94 Z" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
            <path d="M 85,92 L 100,83 L 100,125 L 85,134 Z" fill="#F1F5F9" stroke="#94A3B8" strokeWidth="1" />

            <polygon points="25,120 35,114 45,120 35,126" fill="#4ADE80" />
            <polygon points="25,120 35,126 35,136 25,130" fill="#22C55E" />
            <polygon points="45,120 35,126 35,136 45,130" fill="#16A34A" />
          </g>
        </svg>
      </div>
    </div>
  )
}

// ─── Main ProjectGrid Component ──────────────────────────────────────
export function ProjectGrid() {
  const aboutRef = useRef<HTMLDivElement>(null)
  const logoRef = useRef<HTMLDivElement>(null)
  const [mouseAngle, setMouseAngle] = useState(Math.PI * 0.35)
  const [isTracking, setIsTracking] = useState(false)

  const onSectionMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!logoRef.current) return
    const logoRect = logoRef.current.getBoundingClientRect()
    const logoCenterX = logoRect.left + logoRect.width / 2
    const logoCenterY = logoRect.top + logoRect.height / 2
    const dx = e.clientX - logoCenterX
    const dy = -(e.clientY - logoCenterY)
    setMouseAngle(Math.atan2(dy, dx))
  }, [])

  return (
    <div className="relative w-full bg-[#F0EDE8] dark:bg-[#090d16] transition-colors duration-500 ease-in-out">
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
          <div className="grid grid-cols-12 gap-x-8 md:gap-x-14 lg:gap-x-20 xl:gap-x-24 gap-y-10 md:gap-y-0 w-full items-start">
            {/* Left Column: Logo */}
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

            {/* Right Column: Editorial About Typography */}
            <div className="flex flex-col justify-start items-start gap-8 sm:gap-10 md:gap-12 lg:gap-16 col-span-12 md:col-span-8 text-base lg:text-xl leading-none">
              <p
                className="w-full text-black dark:text-white md:text-[3.8vw] 2xl:text-[3.25rem] text-xl leading-[1.3] md:leading-[1.15] select-text tracking-tight transition-colors duration-200"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                LNMHACKS is the largest student run hackathon all over India. It is a 72 Hour hackathon with interesting workshops and tech talks from industry biggies.
              </p>

              <p
                className="w-full text-[rgba(54,54,48,0.6)] dark:text-neutral-400 md:text-[3.8vw] 2xl:text-[3.25rem] text-xl leading-[1.3] md:leading-[1.15] select-text tracking-tight transition-colors duration-200"
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
            OUR PAST SPONSORS
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

          {/* ── ROW 4: Card 6 (ADRIVE) | Card 7 (Shore Icon) | Card 8 (Teambition) ── */}
          <div className="relative grid grid-cols-1 md:grid-cols-3 items-stretch">
            {/* Col 1: Card 6 (ADRIVE Phone Mockup) */}
            <div className="p-4 sm:p-6 lg:p-8">
              <CardWrapper
                projectId={PROJECTS[5].id}
                title={PROJECTS[5].title}
                meta={PROJECTS[5].meta}
                badge={PROJECTS[5].badge}
              >
                <CardAdrive />
              </CardWrapper>
            </div>

            {/* Col 2: Card 7 (Shore Icon Grid) */}
            <div className="p-4 sm:p-6 lg:p-8">
              <CardWrapper
                projectId={PROJECTS[6].id}
                title={PROJECTS[6].title}
                meta={PROJECTS[6].meta}
                badge={PROJECTS[6].badge}
              >
                <CardShoreIcon />
              </CardWrapper>
            </div>

            {/* Col 3: Card 8 (Teambition) */}
            <div className="p-4 sm:p-6 lg:p-8">
              <CardWrapper
                projectId={PROJECTS[7].id}
                title={PROJECTS[7].title}
                meta={PROJECTS[7].meta}
                badge={PROJECTS[7].badge}
              >
                <CardTeambition />
              </CardWrapper>
            </div>
          </div>

          {/* ── ROW 5: Empty Col 1 | Card 9 (FOF: SEE HEAR TOUCH) | Card 10 (FOF: DESIGN SYSTEM) ── */}
          <div className="relative grid grid-cols-1 md:grid-cols-3 items-stretch">
            {/* Col 1: Empty Cell */}
            <div className="hidden md:flex" />

            {/* Col 2: Card 9 (FOF: SEE HEAR TOUCH) */}
            <div className="p-4 sm:p-6 lg:p-8">
              <CardWrapper
                projectId={PROJECTS[8].id}
                title={PROJECTS[8].title}
                meta={PROJECTS[8].meta}
                badge={PROJECTS[8].badge}
              >
                <CardFofSeeHearTouch />
              </CardWrapper>
            </div>

            {/* Col 3: Card 10 (FOF: DESIGN SYSTEM) */}
            <div className="p-4 sm:p-6 lg:p-8">
              <CardWrapper
                projectId={PROJECTS[9].id}
                title={PROJECTS[9].title}
                meta={PROJECTS[9].meta}
                badge={PROJECTS[9].badge}
              >
                <CardFofDesignSystem />
              </CardWrapper>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export { PROJECTS }
