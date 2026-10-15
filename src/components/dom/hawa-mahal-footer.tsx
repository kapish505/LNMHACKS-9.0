'use client'

import Image from 'next/image'
import { triggerPageTransition } from '@/lib/page-transition-bus'
import styles from './hawa-mahal-footer.module.css'

const linkClass = 'text-neutral-600 transition-colors hover:text-black dark:text-neutral-300 dark:hover:text-white'

export function HawaMahalFooter() {
  return (
    <footer
      id="hawa-mahal-footer"
      className="relative z-40 mt-auto w-full bg-background text-foreground transition-colors duration-500 ease-in-out"
    >
      <div className={styles.stage}>
        <Image
          src="/hawa-mahal-facade.webp"
          alt="Hawa Mahal facade"
          width={4200}
          height={1515}
          sizes="100vw"
          unoptimized
          className={styles.facade}
        />
        <svg
          className={styles.fairyLights}
          viewBox="0 0 2103 759"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className={styles.lightCable}
            d="M0 646 L60 485 L108 513 L156 428 L204 402 L252 443 L300 342 L348 332 L396 336 L444 257 L492 248 L540 215 L588 172 L636 183 L684 136 L732 112 L780 117 L828 120 L876 109 L924 109 L972 82 L1020 52 L1068 49 L1116 68 L1164 81 L1212 101 L1260 112 L1308 123 L1356 99 L1404 122 L1452 160 L1500 172 L1548 212 L1596 258 L1644 247 L1692 296 L1740 339 L1788 339 L1836 389 L1884 414 L1932 411 L1980 515 L2028 487 L2103 646"
          />
          <path
            className={styles.bulbGlow}
            d="M0 646 L60 485 L108 513 L156 428 L204 402 L252 443 L300 342 L348 332 L396 336 L444 257 L492 248 L540 215 L588 172 L636 183 L684 136 L732 112 L780 117 L828 120 L876 109 L924 109 L972 82 L1020 52 L1068 49 L1116 68 L1164 81 L1212 101 L1260 112 L1308 123 L1356 99 L1404 122 L1452 160 L1500 172 L1548 212 L1596 258 L1644 247 L1692 296 L1740 339 L1788 339 L1836 389 L1884 414 L1932 411 L1980 515 L2028 487 L2103 646"
          />
          <path
            className={styles.bulbs}
            d="M0 646 L60 485 L108 513 L156 428 L204 402 L252 443 L300 342 L348 332 L396 336 L444 257 L492 248 L540 215 L588 172 L636 183 L684 136 L732 112 L780 117 L828 120 L876 109 L924 109 L972 82 L1020 52 L1068 49 L1116 68 L1164 81 L1212 101 L1260 112 L1308 123 L1356 99 L1404 122 L1452 160 L1500 172 L1548 212 L1596 258 L1644 247 L1692 296 L1740 339 L1788 339 L1836 389 L1884 414 L1932 411 L1980 515 L2028 487 L2103 646"
          />
        </svg>
      </div>

      <div className="relative z-10 w-full bg-background px-4 pb-8 pt-6 text-foreground sm:px-8 sm:pb-10 sm:pt-8 lg:px-14">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col items-start pr-0 lg:col-span-5 lg:pr-6">
            <h2
              className="mb-2 flex select-none items-center gap-1.5 text-2xl font-black uppercase tracking-tight sm:text-3xl"
              style={{
                fontFamily: '"tiktok", sans-serif',
                fontVariationSettings: '"wght" 850, "wdth" 110',
                letterSpacing: '-0.02em',
              }}
            >
              <span className="text-[#fb3377]">L</span>
              <span className="text-[#63c4fd]">N</span>
              <span className="text-[#1e60ff]">M</span>
              <span className="text-[#fb3377]">HACKS 9.0</span>
            </h2>
            <p className="mb-4 max-w-md text-xs leading-relaxed text-neutral-600 dark:text-neutral-400 sm:text-sm" style={{ fontFamily: '"tiktok", sans-serif' }}>
              The largest student-run hackathon in India. 72 hours of pure innovation, workshops, and developer culture.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-1 sm:gap-8 lg:col-span-7">
            <nav aria-label="Navigation">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#63c4fd]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#63c4fd]" /> Navigation
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="#hero" className={linkClass}>Home</a></li>
                <li><a href="#about" className={linkClass}>About</a></li>
                <li><a href="#glimpses" className={linkClass}>Glimpses</a></li>
                <li><a href="#sponsors" className={linkClass}>Sponsors</a></li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('arrow-section')
                      if (!el) return
                      const top = el.getBoundingClientRect().top + window.scrollY
                      window.scrollTo({ top: top + 2.4 * window.innerHeight, behavior: 'smooth' })
                    }}
                    className={`${linkClass} cursor-pointer text-left`}
                  >Timeline</button>
                </li>
              </ul>
            </nav>

            <nav aria-label="Community">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#fb3377]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#fb3377]" /> Community
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><a href="https://discord.gg/wsFFY3Yc85" target="_blank" rel="noreferrer" className={linkClass}>Discord ↗</a></li>
                <li><a href="https://x.com/LNMHacks" target="_blank" rel="noreferrer" className={linkClass}>Twitter / X ↗</a></li>
                <li><a href="https://www.instagram.com/lnmhacks/" target="_blank" rel="noreferrer" className={linkClass}>Instagram ↗</a></li>
              </ul>
            </nav>

            <nav aria-label="Resources">
              <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#63c4fd]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#1e60ff]" /> Resources
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm">
                <li><button type="button" onClick={() => triggerPageTransition('/hack-guide')} className={`${linkClass} text-left`}>Hack Guide</button></li>
                <li><button type="button" onClick={() => triggerPageTransition('/rules-tracks')} className={`${linkClass} text-left`}>Rules &amp; Tracks</button></li>
                <li><button type="button" onClick={() => triggerPageTransition('/code-of-conduct')} className={`${linkClass} text-left`}>Code of Conduct</button></li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="mx-auto mt-6 flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-neutral-300 pt-4 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
          <span>&copy; {new Date().getFullYear()} LNMHACKS 9.0™</span>
          <span className="text-[11px] text-neutral-500 dark:text-neutral-500">Jaipur, Rajasthan, India · Reach out via Discord, X &amp; Instagram</span>
        </div>
      </div>
    </footer>
  )
}
