'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/lib/theme-context'
import { AbacusWire } from '@/components/ui/abacus-wire'

/**
 * CTF Section Separator & The Format Component
 * Positioned right after About section, matching website theme and fonts.
 */
export function CTFSection() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Safely detect dark mode whether from theme context or DOM html class
  const isDark = mounted
    ? theme === 'dark' || document.documentElement.classList.contains('dark')
    : true

  // Electric cyan & royal blue cyber color palette for the 4 rows of Abacus Wire
  const wireTextColors = isDark
    ? ['#63c4fd', '#1e60ff', '#38bdf8', '#818cf8']
    : ['#1e60ff', '#0284c7', '#2563eb', '#4f46e5']

  const wireLineColors = isDark
    ? [
        'rgba(99, 196, 253, 0.55)',
        'rgba(30, 96, 255, 0.45)',
        'rgba(56, 189, 248, 0.5)',
        'rgba(129, 140, 248, 0.45)',
      ]
    : [
        'rgba(30, 96, 255, 0.4)',
        'rgba(2, 132, 199, 0.35)',
        'rgba(37, 99, 235, 0.35)',
        'rgba(79, 70, 229, 0.35)',
      ]

  return (
    <section
      id="ctf"
      className="relative z-10 w-full min-h-screen flex flex-col justify-between pt-4 sm:pt-6 md:pt-8 pb-8 sm:pb-12 overflow-hidden select-none"
    >
      {/* ── Abacus Wire 4-Row Sleek Colorful Separator (Elevated, Scaled Up Text) ── */}
      <div className="relative w-full h-[76px] sm:h-[84px] md:h-[90px] overflow-hidden pointer-events-none mb-1 sm:mb-2">
        <AbacusWire
          rows={4}
          text="Capture The Flag 4.O"
          background="transparent"
          textColor={wireTextColors}
          lineColor={wireLineColors}
          speed={30}
          stagger={12}
          scale={115}
          font={{
            fontSize: 18,
            fontWeight: 700,
            fontFamily: '"tiktok", "Poppins", sans-serif',
          }}
          advanced={{
            rowPitch: 120,
            centerY: 50,
          }}
        />
      </div>

      {/* ── The Format Editorial Component (Full Screen, Balanced, Minimized Gap) ── */}
      <div className="w-full max-w-[1440px] 2xl:max-w-[1640px] mx-auto px-4 sm:px-6 md:px-10 lg:px-14 flex flex-col justify-start flex-1 pt-1 sm:pt-2 gap-4 sm:gap-6 lg:gap-7">
        {/* Headline + Blurb Row: Exactly Aligned to 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 xl:gap-16 items-end">
          {/* Col 1 & 2: Large Impactful Headline Spanning Across 2 Columns */}
          <div className="md:col-span-2">
            <h2
              className="text-4xl sm:text-6xl md:text-6xl lg:text-[5.2rem] xl:text-[6.2rem] font-black tracking-tight text-neutral-900 dark:text-white leading-[1.0]"
              style={{ fontFamily: '"tiktok", sans-serif' }}
            >
              Hunt the exploit. <br />
              <span className="text-[#1e60ff] dark:text-[#63c4fd]">
                Capture every flag.
              </span>
            </h2>
          </div>

          {/* Col 3: Large Editorial Paragraph Utilizing Full Width of Col 3 */}
          <div className="md:col-span-1 flex items-end">
            <p
              className="text-base sm:text-lg md:text-xl lg:text-[1.3rem] xl:text-[1.45rem] text-neutral-600 dark:text-neutral-300 leading-relaxed font-medium"
              style={{ fontFamily: '"tiktok", sans-serif' }}
            >
              A high-stakes cybersecurity sprint. Reverse binaries, crack crypto, exploit web targets, and conquer jeopardy challenges.
            </p>
          </div>
        </div>

        {/* 3-Column Metric Section (Strictly Baseline Aligned, Large Typography, Full Width) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 xl:gap-16 items-start">
          {/* ── Col 1: THE DATES ── */}
          <div className="flex flex-col justify-start">
            <span
              className="text-xs sm:text-sm font-mono tracking-[0.26em] uppercase text-neutral-500 dark:text-neutral-400 block mb-2 sm:mb-3"
              style={{ fontFamily: '"tronica-mono", monospace' }}
            >
              THE DATES
            </span>

            {/* Baseline Aligned Container for Numbers */}
            <div className="h-[95px] sm:h-[115px] md:h-[135px] lg:h-[150px] xl:h-[170px] flex items-end pb-2 mb-3 sm:mb-4">
              <div
                className="text-6xl sm:text-7xl md:text-8xl lg:text-[7.6rem] xl:text-[8.8rem] font-black text-[#1e60ff] dark:text-[#63c4fd] leading-none select-none flex items-center whitespace-nowrap"
                style={{
                  fontFamily: '"Rogient Block", "rogient-block", "tiktok", serif',
                  textShadow: isDark
                    ? '3px 3px 0px #090d16, 5px 5px 0px rgba(99, 196, 253, 0.38)'
                    : '3px 3px 0px #F0EDE8, 5px 5px 0px rgba(30, 96, 255, 0.32)',
                }}
              >
                <span className="tracking-tight">22-24</span>
                <span
                  className="text-sm sm:text-base md:text-lg lg:text-xl font-mono tracking-[0.25em] text-[#1e60ff] dark:text-[#63c4fd] uppercase ml-2.5 sm:ml-3.5 rotate-[-90deg] inline-block font-bold origin-center"
                  style={{
                    fontFamily: '"tronica-mono", monospace',
                    textShadow: 'none',
                  }}
                >
                  JAN
                </span>
              </div>
            </div>

            {/* Sized Text Block */}
            <div>
              <h3
                className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] xl:text-[3rem] font-bold text-neutral-900 dark:text-white mb-2 leading-tight"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                Jaipur, 2027.
              </h3>
              <p
                className="text-sm sm:text-base md:text-lg lg:text-[1.2rem] text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans font-normal"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                72 hours of non-stop hacking and binary battles at LNMIIT Jaipur. Save the dates and prepare your exploits.
              </p>
            </div>
          </div>

          {/* ── Col 2: THE OPERATOR ── */}
          <div className="flex flex-col justify-start">
            <span
              className="text-xs sm:text-sm font-mono tracking-[0.26em] uppercase text-neutral-500 dark:text-neutral-400 block mb-2 sm:mb-3"
              style={{ fontFamily: '"tronica-mono", monospace' }}
            >
              THE OPERATOR
            </span>

            {/* Baseline Aligned Container for Numbers */}
            <div className="h-[95px] sm:h-[115px] md:h-[135px] lg:h-[150px] xl:h-[170px] flex items-end pb-2 mb-3 sm:mb-4">
              <div
                className="text-6xl sm:text-7xl md:text-8xl lg:text-[7.6rem] xl:text-[8.8rem] font-black text-[#1e60ff] dark:text-[#63c4fd] leading-none select-none whitespace-nowrap"
                style={{
                  fontFamily: '"Rogient Block", "rogient-block", "tiktok", serif',
                  textShadow: isDark
                    ? '3px 3px 0px #090d16, 5px 5px 0px rgba(99, 196, 253, 0.38)'
                    : '3px 3px 0px #F0EDE8, 5px 5px 0px rgba(30, 96, 255, 0.32)',
                }}
              >
                01.
              </div>
            </div>

            {/* Sized Text Block */}
            <div>
              <h3
                className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] xl:text-[3rem] font-bold text-neutral-900 dark:text-white mb-2 leading-tight"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                Solo or Squad.
              </h3>
              <p
                className="text-sm sm:text-base md:text-lg lg:text-[1.2rem] text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans font-normal"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                Compete solo or squad up with up to 4 hackers. Jeopardy-style challenges spanning web exploitation, reverse engineering, and cryptography.
              </p>
            </div>
          </div>

          {/* ── Col 3: LAST EDITION ── */}
          <div className="flex flex-col justify-start">
            <span
              className="text-xs sm:text-sm font-mono tracking-[0.26em] uppercase text-neutral-500 dark:text-neutral-400 block mb-2 sm:mb-3"
              style={{ fontFamily: '"tronica-mono", monospace' }}
            >
              LAST EDITION
            </span>

            {/* Baseline Aligned Container for Numbers */}
            <div className="h-[95px] sm:h-[115px] md:h-[135px] lg:h-[150px] xl:h-[170px] flex items-end pb-2 mb-3 sm:mb-4">
              <div
                className="text-6xl sm:text-7xl md:text-8xl lg:text-[7.6rem] xl:text-[8.8rem] font-black text-[#1e60ff] dark:text-[#63c4fd] leading-none select-none whitespace-nowrap"
                style={{
                  fontFamily: '"Rogient Block", "rogient-block", "tiktok", serif',
                  textShadow: isDark
                    ? '3px 3px 0px #090d16, 5px 5px 0px rgba(99, 196, 253, 0.38)'
                    : '3px 3px 0px #F0EDE8, 5px 5px 0px rgba(30, 96, 255, 0.32)',
                }}
              >
                700+
              </div>
            </div>

            {/* Sized Text Block */}
            <div>
              <h3
                className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] xl:text-[3rem] font-bold text-neutral-900 dark:text-white mb-2 leading-tight"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                Massive Scale.
              </h3>
              <p
                className="text-sm sm:text-base md:text-lg lg:text-[1.2rem] text-neutral-600 dark:text-neutral-300 leading-relaxed font-sans font-normal"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                Over 700 elite hackers and security researchers competed in our last edition across India. Bigger, sharper, and higher stakes this year.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
export default CTFSection
