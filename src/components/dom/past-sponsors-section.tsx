'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/lib/theme-context'
import InteractiveGrid from '@/components/ui/interactive-grid'

export function PastSponsorsSection() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    const check = () => {
      setIsMobile(window.innerWidth < 768)
    }
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

  // Safely detect dark mode whether from theme context or DOM html class
  const isDark = mounted
    ? theme === 'dark' || document.documentElement.classList.contains('dark')
    : false

  return (
    <section
      id="past-sponsors"
      className="relative z-30 w-full flex flex-col justify-start pt-2 sm:pt-6 pb-16 sm:pb-24 pointer-events-auto overflow-hidden transition-colors duration-300"
    >
      {/* Section Header */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-14 pb-6 sm:pb-10 text-left">
        <span
          className="text-xs font-mono tracking-widest uppercase text-neutral-500 dark:text-neutral-400 mb-2 block"
          style={{ fontFamily: '"tronica-mono", monospace' }}
        >
          [ PAST SPONSORS ]
        </span>

        <h2
          className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-black dark:text-white uppercase transition-colors duration-200"
          style={{
            fontFamily: '"tiktok", sans-serif',
            fontVariationSettings: '"wght" 850, "wdth" 110',
            letterSpacing: '-0.03em',
          }}
        >
          PAST SPONSORS
        </h2>

        <p
          className="mt-2 text-base sm:text-lg md:text-xl tracking-tight max-w-xl text-[rgba(54,54,48,0.7)] dark:text-neutral-400 transition-colors duration-200"
          style={{ fontFamily: '"tiktok", sans-serif' }}
        >
          Visionary partners and industry pioneers who powered previous editions of LNMHACKS
        </p>
      </div>

      {/* Interactive Grid dynamically matched to active theme */}
      <div className="relative w-full max-w-6xl mx-auto px-4 sm:px-8 h-[460px] sm:h-[580px] md:h-[680px]">
        <InteractiveGrid
          columns={isMobile ? 3 : 5}
          rows={isMobile ? 4 : 5}
          padding={isMobile ? '16px' : '32px'}
          gap={isMobile ? 8 : 12}
          rounded={isMobile ? 12 : 16}
          logoScale={isMobile ? 3.2 : 3}
          cardFill={isDark ? '#070b15' : '#ffffff'}
          cardBorder={isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(0, 0, 0, 0.08)'}
          shadow={true}
          cardShadow={isDark ? 'rgba(30, 96, 255, 0.22)' : 'rgba(0, 0, 0, 0.07)'}
          glow={true}
          glowStart={isDark ? 'rgba(251, 51, 119, 0.45)' : 'rgba(251, 51, 119, 0.35)'}
          glowEnd={isDark ? '#63c4fd' : '#1e60ff'}
          glowIntensity={isDark ? 55 : 35}
          perspective={isMobile ? 1200 : 1600}
          rotateX={-360}
          rotateY={0}
        />
      </div>
    </section>
  )
}
