'use client'

import React from 'react'
import { triggerPageTransition } from '@/lib/page-transition-bus'
import { PageCircleReveal } from '@/components/canvas/page-circle-reveal'

interface ComingSoonTemplateProps {
  label: string
  title?: string
  description: string
}

export function ComingSoonTemplate({
  label,
  title = 'COMING SOON',
  description,
}: ComingSoonTemplateProps) {
  return (
    <main className="relative min-h-screen bg-[#F0EDE8] flex flex-col items-center justify-center px-6 select-none">
      <PageCircleReveal />

      {/* Centered content */}
      <div className="flex flex-col items-center gap-6 text-center max-w-lg">
        <span
          className="text-[11px] tracking-[0.3em] uppercase text-[rgba(54,54,48,0.45)]"
          style={{ fontFamily: '"tronica-mono", monospace' }}
        >
          [ {label} ]
        </span>

        <h1
          className="text-5xl sm:text-7xl md:text-8xl font-black uppercase tracking-tight text-black"
          style={{
            fontFamily: '"tiktok", sans-serif',
            fontVariationSettings: '"wght" 850, "wdth" 110',
            letterSpacing: '-0.03em',
          }}
        >
          {title}
        </h1>

        <p
          className="text-sm sm:text-base text-[rgba(54,54,48,0.65)] leading-relaxed"
          style={{ fontFamily: '"tiktok", sans-serif' }}
        >
          {description}
        </p>

        <button
          type="button"
          onClick={() => triggerPageTransition('/')}
          className="mt-4 px-8 py-3 rounded-full bg-black hover:bg-[#1e60ff] text-white text-xs font-bold uppercase tracking-wider transition-colors duration-200 cursor-pointer"
          style={{ fontFamily: '"tiktok", sans-serif' }}
        >
          ← Back to Home
        </button>
      </div>

      {/* Footer */}
      <span
        className="absolute bottom-6 text-[10px] text-[rgba(54,54,48,0.35)] tracking-[0.25em] uppercase font-mono"
        style={{ fontFamily: '"tronica-mono", monospace' }}
      >
        &copy; {new Date().getFullYear()} LNMHACKS 9.0
      </span>
    </main>
  )
}
