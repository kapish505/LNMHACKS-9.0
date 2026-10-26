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
      className="relative z-10 w-full min-h-screen flex flex-col justify-between pt-12 sm:pt-14 md:pt-16 pb-6 sm:pb-8 overflow-hidden select-none"
    >
      {/* ── Abacus Wire 4-Row Sleek Colorful Separator (Moved Upwards) ── */}
      <div className="relative w-full h-[64px] sm:h-[72px] md:h-[78px] overflow-hidden pointer-events-none mb-3 sm:mb-5">
        <AbacusWire
          rows={4}
          text="Capture The Flag 4.O"
          background="transparent"
          textColor={wireTextColors}
          lineColor={wireLineColors}
          speed={30}
          stagger={12}
          scale={100}
        />
      </div>

      {/* ── The Format Editorial Component (Full Screen, Minimized Empty Space) ── */}
      <div className="w-full max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 lg:px-14 flex flex-col justify-between flex-1">
        {/* Headline + Blurb Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-end pb-5 sm:pb-7 lg:pb-8">
          <div className="lg:col-span-8">
            <h2
              className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.6rem] xl:text-[5.4rem] font-black tracking-tight text-neutral-900 dark:text-white leading-[1.02]"
              style={{ fontFamily: '"tiktok", sans-serif' }}
            >
              Hunt the exploit. <br />
              <span className="text-[#1e60ff] dark:text-[#63c4fd]">
                Capture every flag.
              </span>
            </h2>
          </div>
          <div className="lg:col-span-4 flex items-end">
            <p
              className="text-base sm:text-lg md:text-xl lg:text-[1.25rem] text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-xl font-medium"
              style={{ fontFamily: '"tiktok", sans-serif' }}
            >
              A high-stakes cybersecurity sprint. Reverse binaries, crack crypto, exploit web targets, and conquer jeopardy challenges.
            </p>
          </div>
        </div>

        {/* 3-Column Metric Section (Clean, Large Typography, Single Line) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 lg:gap-10 items-start">
          {/* Col 1: THE DATES */}
          <div className="flex flex-col justify-between">
            <div>
              <span
                className="text-xs sm:text-sm font-mono tracking-[0.24em] uppercase text-neutral-500 dark:text-neutral-400 block mb-2 sm:mb-3"
                style={{ fontFamily: '"tronica-mono", monospace' }}
              >
                THE DATES
              </span>
              <div
                className="text-6xl sm:text-7xl md:text-8xl lg:text-[7.6rem] xl:text-[8.6rem] font-black text-[#1e60ff] dark:text-[#63c4fd] leading-[0.84] mb-2 sm:mb-3 select-none flex items-center whitespace-nowrap"
                style={{
                  fontFamily: '"Rogient Block", "rogient-block", "tiktok", serif',
                  textShadow: isDark
                    ? '2.5px 2.5px 0px #090d16, 4px 4px 0px rgba(99, 196, 253, 0.35)'
                    : '2.5px 2.5px 0px #F0EDE8, 4px 4px 0px rgba(30, 96, 255, 0.3)',
                }}
              >
                <span className="tracking-tight">22-24</span>
                <span
                  className="text-sm sm:text-base md:text-lg font-mono tracking-[0.25em] text-[#1e60ff] dark:text-[#63c4fd] uppercase ml-2.5 sm:ml-3.5 rotate-[-90deg] inline-block font-bold origin-center"
                  style={{
                    fontFamily: '"tronica-mono", monospace',
                    textShadow: 'none',
                  }}
                >
                  JAN
                </span>
              </div>
            </div>
            <div>
              <h3
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-1.5 leading-tight"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                Jaipur, 2027.
              </h3>
              <p
                className="text-sm sm:text-base md:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed font-mono font-medium"
                style={{ fontFamily: '"tronica-mono", monospace' }}
              >
                Save the date. <br />
                Bring your curiosity.
              </p>
            </div>
          </div>

          {/* Col 2: THE OPERATOR */}
          <div className="flex flex-col justify-between">
            <div>
              <span
                className="text-xs sm:text-sm font-mono tracking-[0.24em] uppercase text-neutral-500 dark:text-neutral-400 block mb-2 sm:mb-3"
                style={{ fontFamily: '"tronica-mono", monospace' }}
              >
                THE OPERATOR
              </span>
              <div
                className="text-6xl sm:text-7xl md:text-8xl lg:text-[7.6rem] xl:text-[8.6rem] font-black text-[#1e60ff] dark:text-[#63c4fd] leading-[0.84] mb-2 sm:mb-3 select-none whitespace-nowrap"
                style={{
                  fontFamily: '"Rogient Block", "rogient-block", "tiktok", serif',
                  textShadow: isDark
                    ? '2.5px 2.5px 0px #090d16, 4px 4px 0px rgba(99, 196, 253, 0.35)'
                    : '2.5px 2.5px 0px #F0EDE8, 4px 4px 0px rgba(30, 96, 255, 0.3)',
                }}
              >
                01.
              </div>
            </div>
            <div>
              <h3
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-1.5 leading-tight"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                Solo or Squad.
              </h3>
              <p
                className="text-sm sm:text-base md:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed font-mono font-medium"
                style={{ fontFamily: '"tronica-mono", monospace' }}
              >
                Jeopardy-style CTF. <br />
                Battle across all skill tiers.
              </p>
            </div>
          </div>

          {/* Col 3: LAST EDITION (700+ Participants) */}
          <div className="flex flex-col justify-between">
            <div>
              <span
                className="text-xs sm:text-sm font-mono tracking-[0.24em] uppercase text-neutral-500 dark:text-neutral-400 block mb-2 sm:mb-3"
                style={{ fontFamily: '"tronica-mono", monospace' }}
              >
                LAST EDITION
              </span>
              <div
                className="text-6xl sm:text-7xl md:text-8xl lg:text-[7.6rem] xl:text-[8.6rem] font-black text-[#1e60ff] dark:text-[#63c4fd] leading-[0.84] mb-2 sm:mb-3 select-none whitespace-nowrap"
                style={{
                  fontFamily: '"Rogient Block", "rogient-block", "tiktok", serif',
                  textShadow: isDark
                    ? '2.5px 2.5px 0px #090d16, 4px 4px 0px rgba(99, 196, 253, 0.35)'
                    : '2.5px 2.5px 0px #F0EDE8, 4px 4px 0px rgba(30, 96, 255, 0.3)',
                }}
              >
                700+
              </div>
            </div>
            <div>
              <h3
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-1.5 leading-tight"
                style={{ fontFamily: '"tiktok", sans-serif' }}
              >
                Massive Scale.
              </h3>
              <p
                className="text-sm sm:text-base md:text-lg text-neutral-600 dark:text-neutral-400 leading-relaxed font-mono font-medium"
                style={{ fontFamily: '"tronica-mono", monospace' }}
              >
                700+ participants in last version. <br />
                Competing across India.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
export default CTFSection
