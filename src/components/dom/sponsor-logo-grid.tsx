'use client'

import { useState } from 'react'
import { SPONSORS, type Sponsor } from '@/data/sponsors'

const isDev = process.env.NODE_ENV !== 'production'

/**
 * One industry-partner card: the logo on a dark panel, and on hover (or tap /
 * keyboard focus) a panel slides up with the partner's review.
 */
function SponsorCard({ s }: { s: Sponsor }) {
  const [open, setOpen] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)
  const showLogo = !!s.logo && !logoFailed
  const hasQuote = !!s.review?.quote

  return (
    <article className="group relative flex w-full flex-col">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        aria-expanded={open}
        aria-label={`${s.name} — ${hasQuote ? 'read their review' : 'partner'}`}
        className="relative block w-full cursor-pointer overflow-hidden border border-white/[0.08] bg-[#0b0e16] text-left outline-none transition-transform duration-300 hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-[#c0fe04]"
        style={{
          aspectRatio: '16 / 10',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      >
        {/* badge */}
        <span className="pointer-events-none absolute right-0 top-0 z-10 select-none bg-[#c0fe04] px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-black sm:text-[10px]">
          {s.badge}
        </span>

        {/* brand bloom in the partner's colour */}
        <span
          className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: `radial-gradient(70% 60% at 50% 100%, ${s.hex}22 0%, transparent 70%)` }}
          aria-hidden="true"
        />

        {/* logo */}
        <span className="absolute inset-0 flex items-center justify-center gap-3 px-6 sm:gap-4">
          {showLogo && (
            // eslint-disable-next-line @next/next/no-img-element -- static SVG brand mark, no optimisation needed
            <img
              src={s.logo}
              alt=""
              width={48}
              height={48}
              onError={() => setLogoFailed(true)}
              className="h-9 w-9 shrink-0 drop-shadow-[0_0_14px_rgba(255,255,255,0.12)] sm:h-11 sm:w-11"
            />
          )}
          <span
            className="truncate text-[1.45rem] font-black leading-none tracking-tight text-white sm:text-[1.9rem]"
            style={{ fontFamily: '"tiktok", sans-serif', fontVariationSettings: '"wght" 800, "wdth" 105', color: showLogo ? '#fff' : s.hex }}
          >
            {s.name}
          </span>
        </span>

        {/* review panel */}
        <span
          className={`absolute inset-0 flex flex-col justify-end bg-[#05070d]/92 p-4 backdrop-blur-sm transition-all duration-400 ease-out sm:p-5 ${
            open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100'
          }`}
          style={{ borderTop: `2px solid ${s.hex}` }}
          aria-hidden={!open && undefined}
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: s.hex }}>
            {hasQuote ? `${s.name} on LNMHacks` : 'Partner of LNMHacks'}
          </span>
          {hasQuote ? (
            <>
              <span className="mt-2 text-[13px] leading-relaxed text-white/90 sm:text-[15px]" style={{ fontFamily: '"tiktok", sans-serif' }}>
                &ldquo;{s.review!.quote}&rdquo;
              </span>
              <span className="mt-2 font-mono text-[10px] uppercase tracking-wider text-white/55">
                — {s.review!.by}
                {s.review!.role ? `, ${s.review!.role}` : ''}
              </span>
            </>
          ) : (
            <span className="mt-2 text-[13px] leading-relaxed text-white/70 sm:text-[15px]" style={{ fontFamily: '"tiktok", sans-serif' }}>
              {isDev ? `Add ${s.name}'s quote in src/data/sponsors.ts to show it here.` : `Backing the builders at LNMHacks.`}
            </span>
          )}
        </span>
      </button>

      {/* editorial metadata row, matching the sponsor banners above */}
      <div className="mt-2.5 flex w-full items-center justify-between px-0.5">
        <span
          className="text-xs font-bold uppercase tracking-wider text-neutral-900 transition-colors duration-200 group-hover:text-blue-600 sm:text-[13px] dark:text-white dark:group-hover:text-blue-400"
          style={{ fontFamily: '"tronica-mono", monospace' }}
        >
          {s.name}
        </span>
        <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-500 sm:text-xs dark:text-neutral-400">{s.meta}</span>
      </div>
    </article>
  )
}

/** The industry-partner wall: four across on desktop, two on phones. */
export function SponsorLogoGrid() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 p-4 sm:gap-x-6 sm:p-6 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-8 lg:p-8">
      {SPONSORS.map((s) => (
        <SponsorCard key={s.slug} s={s} />
      ))}
    </div>
  )
}
