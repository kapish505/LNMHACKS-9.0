'use client'

import Image from 'next/image'
import { triggerPageTransition } from '@/lib/page-transition-bus'
import styles from './hawa-mahal-footer.module.css'

const linkClass = 'text-white/80 transition-colors hover:text-white'

export function HawaMahalFooter() {
  return (
    <footer
      id="hawa-mahal-footer"
      className="relative z-40 mt-auto w-full text-white"
    >
      <div className={styles.stage}>
        <Image
          src="/hawa-mahal-footer-scene.png"
          alt="Hawa Mahal illuminated against the night sky"
          width={1672}
          height={941}
          sizes="100vw"
          className={styles.facade}
        />
        <svg
          className={styles.fairyLights}
          viewBox="0 0 1672 941"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <path
            className={styles.lightCable}
            d="M0 392 L54 366 L112 326 L166 293 L224 270 L282 238 L336 195 L391 149 L441 116 L488 106 L530 118 L570 91 L618 80 L664 82 L709 56 L755 41 L802 28 L836 20 L870 28 L917 41 L963 56 L1008 82 L1054 80 L1102 91 L1142 118 L1184 106 L1231 116 L1281 149 L1336 195 L1390 238 L1448 270 L1506 293 L1560 326 L1618 366 L1672 392"
          />
          <path
            className={styles.bulbGlow}
            d="M0 392 L54 366 L112 326 L166 293 L224 270 L282 238 L336 195 L391 149 L441 116 L488 106 L530 118 L570 91 L618 80 L664 82 L709 56 L755 41 L802 28 L836 20 L870 28 L917 41 L963 56 L1008 82 L1054 80 L1102 91 L1142 118 L1184 106 L1231 116 L1281 149 L1336 195 L1390 238 L1448 270 L1506 293 L1560 326 L1618 366 L1672 392"
          />
          <path
            className={styles.bulbs}
            d="M0 392 L54 366 L112 326 L166 293 L224 270 L282 238 L336 195 L391 149 L441 116 L488 106 L530 118 L570 91 L618 80 L664 82 L709 56 L755 41 L802 28 L836 20 L870 28 L917 41 L963 56 L1008 82 L1054 80 L1102 91 L1142 118 L1184 106 L1231 116 L1281 149 L1336 195 L1390 238 L1448 270 L1506 293 L1560 326 L1618 366 L1672 392"
          />
        </svg>
      <div className={`${styles.footerContent} relative z-10 w-full px-4 pb-8 pt-6 text-white sm:px-8 sm:pb-10 sm:pt-8 lg:px-14`}>
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
            <p className="mb-4 max-w-md text-xs leading-relaxed text-white/75 sm:text-sm" style={{ fontFamily: '"tiktok", sans-serif' }}>
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

        <div className="mx-auto mt-6 flex max-w-7xl flex-wrap items-center justify-between gap-4 border-t border-white/20 pt-4 text-xs text-white/75">
          <span>&copy; {new Date().getFullYear()} LNMHACKS 9.0™</span>
          <span className="text-[10px] text-white/65 sm:text-[11px]">Jaipur, Rajasthan, India · Reach out via Discord, X &amp; Instagram</span>
        </div>
      </div>
      </div>
    </footer>
  )
}
