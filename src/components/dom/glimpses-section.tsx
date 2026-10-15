'use client'

import React, { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { useTheme } from '@/lib/theme-context'

const LiquidGlassCarousel = dynamic(
  () => import('@/components/dom/liquid-glass-carousel'),
  { ssr: false }
)

const DEFAULT_ITEMS: string[] = [
  '/glimpses/glimpse-1.jpg',
  '/glimpses/glimpse-2.jpg',
  '/glimpses/glimpse-3.jpg',
  '/glimpses/glimpse-4.jpg',
  '/glimpses/glimpse-1.jpg',
  '/glimpses/glimpse-2.jpg',
  '/glimpses/glimpse-3.jpg',
  '/glimpses/glimpse-4.jpg',
  '/glimpses/glimpse-1.jpg',
  '/glimpses/glimpse-2.jpg',
  '/glimpses/glimpse-3.jpg',
  '/glimpses/glimpse-4.jpg',
]

export function GlimpsesSection() {
  const [carouselItems, setCarouselItems] = useState<string[]>(DEFAULT_ITEMS)
  const { theme } = useTheme()
  const carouselBackground = theme === 'dark' ? '#090d16' : '#F0EDE8'

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
    <div
      id="glimpses"
      className="relative z-30 w-full flex flex-col justify-start pt-12 sm:pt-20 pb-16 sm:pb-24 pointer-events-auto"
    >
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-14 pb-8 sm:pb-12 text-left">
        <span
          className="text-xs font-mono tracking-widest uppercase text-neutral-500 dark:text-neutral-400 mb-2 block"
          style={{ fontFamily: '"tronica-mono", monospace' }}
        >
          [ GLIMPSES ]
        </span>
        <h2
          className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-black dark:text-white uppercase transition-colors duration-200"
          style={{
            fontFamily: '"tiktok", sans-serif',
            fontVariationSettings: '"wght" 850, "wdth" 110',
            letterSpacing: '-0.03em',
          }}
        >
          GLIMPSES
        </h2>
        <p
          className="mt-2 text-base sm:text-lg md:text-xl tracking-tight max-w-xl text-[rgba(54,54,48,0.6)] dark:text-neutral-400 transition-colors duration-200"
          style={{
            fontFamily: '"tiktok", sans-serif',
          }}
        >
          Highlights from our past editions
        </p>
      </div>

      <div className="w-full h-[360px] sm:h-[460px] md:h-[540px] lg:h-[620px] pointer-events-auto">
        <LiquidGlassCarousel
          items={carouselItems}
          background={carouselBackground}
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
            enabled: false,
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
  )
}
