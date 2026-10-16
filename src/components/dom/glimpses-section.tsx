'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { useLenis } from 'lenis/react'
import styles from './glimpses-section.module.css'

const DEFAULT_ITEMS = [
  '/glimpses/glimpse-1.jpg',
  '/glimpses/glimpse-2.jpg',
  '/glimpses/glimpse-3.jpg',
  '/glimpses/glimpse-4.jpg',
]

type DragState = {
  row: number
  startX: number
  startOffset: number
  moved: boolean
}

export function GlimpsesSection() {
  const [items, setItems] = useState<string[]>(DEFAULT_ITEMS)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const trackRefs = useRef<Array<HTMLDivElement | null>>([])
  const rowOffsets = useRef([0, 0])
  const rowWidths = useRef([0, 0])
  const dragRef = useRef<DragState | null>(null)
  const suppressClickRef = useRef(false)
  const scrollBoostRef = useRef({ current: 1, target: 1, lastAt: 0, scrollY: 0 })

  const uniqueItems = useMemo(() => [...new Set(items)], [items])
  const rows = useMemo(() => {
    const midpoint = Math.floor(uniqueItems.length / 2)
    const offsetItems = uniqueItems.length > 1
      ? [...uniqueItems.slice(midpoint), ...uniqueItems.slice(0, midpoint)]
      : uniqueItems
    return [uniqueItems, offsetItems]
  }, [uniqueItems])

  useEffect(() => {
    fetch('/api/glimpses')
      .then((response) => response.json())
      .then((data) => {
        if (data && Array.isArray(data.items) && data.items.length > 0) {
          setItems(data.items)
        }
      })
      .catch((error) => console.error('Failed to load glimpses from /api/glimpses', error))
  }, [])

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      trackRefs.current.forEach((track, index) => {
        if (!track) return
        const width = track.scrollWidth / 2
        rowWidths.current[index] = width
        if (width > 0) {
          rowOffsets.current[index] = ((rowOffsets.current[index] % width) + width) % width
          track.style.transform = `translate3d(${-rowOffsets.current[index]}px, 0, 0)`
        }
      })
    })

    trackRefs.current.forEach((track) => track && resizeObserver.observe(track))
    return () => resizeObserver.disconnect()
  }, [rows])

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let previousTime = performance.now()
    let inView = false
    let pageVisible = !document.hidden
    let running = false

    const animate = (now: number) => {
      const delta = Math.min((now - previousTime) / 1000, 0.05)
      previousTime = now

      const boost = scrollBoostRef.current
      boost.target = now - boost.lastAt > 140 ? 1 : boost.target
      boost.current += (boost.target - boost.current) * Math.min(1, delta * 3.5)

      if (!reduceMotion && !dragRef.current) {
        trackRefs.current.forEach((track, index) => {
          const width = rowWidths.current[index]
          if (!track || width <= 0) return
          const direction = index === 0 ? -1 : 1
          const speed = (index === 0 ? 34 : 30) * boost.current
          let offset = rowOffsets.current[index] + direction * speed * delta
          if (offset <= -width) offset += width
          if (offset > 0) offset -= width
          rowOffsets.current[index] = offset
          track.style.transform = `translate3d(${offset}px, 0, 0)`
        })
      }

      frame = requestAnimationFrame(animate)
    }

    const startAnimation = () => {
      if (reduceMotion || !inView || !pageVisible || running) return
      previousTime = performance.now()
      running = true
      frame = requestAnimationFrame(animate)
    }

    const stopAnimation = () => {
      if (!running) return
      cancelAnimationFrame(frame)
      running = false
      frame = 0
    }

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      if (inView) startAnimation()
      else stopAnimation()
    }, { rootMargin: '120px 0px' })
    if (sectionRef.current) observer.observe(sectionRef.current)

    const onScroll = () => {
      const now = performance.now()
      const last = scrollBoostRef.current
      const delta = Math.abs(window.scrollY - last.scrollY)
      const elapsed = Math.max(16, now - last.lastAt)
      last.target = Math.min(3.2, 1 + (delta / elapsed) * 0.65)
      last.lastAt = now
      last.scrollY = window.scrollY
    }
    const onVisibilityChange = () => {
      pageVisible = !document.hidden
      if (pageVisible) startAnimation()
      else stopAnimation()
    }

    scrollBoostRef.current.lastAt = performance.now()
    scrollBoostRef.current.scrollY = window.scrollY
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      stopAnimation()
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  // ─── lightbox: keyboard, prev/next, scroll lock ───
  const lenis = useLenis()
  const selectedIndex = selectedImage ? uniqueItems.indexOf(selectedImage) : -1
  const stepImage = useCallback(
    (delta: number) => {
      setSelectedImage((current) => {
        if (!current || uniqueItems.length === 0) return current
        const i = uniqueItems.indexOf(current)
        return uniqueItems[(i + delta + uniqueItems.length) % uniqueItems.length]
      })
    },
    [uniqueItems],
  )

  useEffect(() => {
    if (!selectedImage) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedImage(null)
      else if (event.key === 'ArrowRight') stepImage(1)
      else if (event.key === 'ArrowLeft') stepImage(-1)
    }
    window.addEventListener('keydown', onKeyDown)
    // freeze the page behind the viewer (Lenis drives the scroll, so stop it too)
    lenis?.stop()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      lenis?.start()
      document.body.style.overflow = previousOverflow
    }
  }, [selectedImage, stepImage, lenis])

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const distance = event.clientX - drag.startX
      if (Math.abs(distance) > 4) drag.moved = true
      if (!drag.moved) return

      const width = rowWidths.current[drag.row]
      if (!width) return
      const offset = drag.startOffset - distance
      const wrappedOffset = ((offset % width) + width) % width
      rowOffsets.current[drag.row] = wrappedOffset
      const track = trackRefs.current[drag.row]
      if (track) track.style.transform = `translate3d(${-wrappedOffset}px, 0, 0)`
    }

    const onPointerUp = () => {
      const drag = dragRef.current
      if (!drag) return
      if (drag.moved) {
        suppressClickRef.current = true
        window.setTimeout(() => { suppressClickRef.current = false }, 100)
      }
      dragRef.current = null
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [])

  const startDrag = (event: React.PointerEvent<HTMLDivElement>, row: number) => {
    if (event.button !== 0) return
    dragRef.current = {
      row,
      startX: event.clientX,
      startOffset: rowOffsets.current[row],
      moved: false,
    }
  }

  const openImage = (event: React.MouseEvent<HTMLButtonElement>, src: string) => {
    if (suppressClickRef.current) {
      event.preventDefault()
      return
    }
    setSelectedImage(src)
  }

  return (
    <section
      id="glimpses"
      ref={sectionRef}
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
          style={{ fontFamily: '"tiktok", sans-serif' }}
        >
          Highlights from our past editions
        </p>
      </div>

      <div className={styles.gallery} role="group" aria-label="Highlights from past editions">
        {rows.map((row, rowIndex) => (
          <div
            className={styles.row}
            key={`row-${rowIndex}`}
            onPointerDown={(event) => startDrag(event, rowIndex)}
          >
            <div className={styles.track} ref={(node) => { trackRefs.current[rowIndex] = node }}>
              {[...row, ...row].map((src, index) => (
                <button
                  className={styles.card}
                  type="button"
                  key={`${rowIndex}-${src}-${index}`}
                  onClick={(event) => openImage(event, src)}
                  aria-label={`Open glimpse ${index % row.length + 1} full screen`}
                >
                  <Image
                    src={src}
                    alt={`LNMHacks past edition highlight ${index % row.length + 1}`}
                    fill
                    sizes="(max-width: 640px) 78vw, (max-width: 1200px) 42vw, 32vw"
                    loading="lazy"
                    className={styles.image}
                    draggable={false}
                  />
                  <span className={styles.openHint}>View image <span aria-hidden="true">↗</span></span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedImage && (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Expanded glimpse"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className={styles.closeButton}
            type="button"
            aria-label="Close image"
            onClick={() => setSelectedImage(null)}
          >
            ×
          </button>

          {uniqueItems.length > 1 && (
            <>
              <button
                className={`${styles.navButton} ${styles.navPrev}`}
                type="button"
                aria-label="Previous image"
                onClick={(event) => {
                  event.stopPropagation()
                  stepImage(-1)
                }}
              >
                ←
              </button>
              <button
                className={`${styles.navButton} ${styles.navNext}`}
                type="button"
                aria-label="Next image"
                onClick={(event) => {
                  event.stopPropagation()
                  stepImage(1)
                }}
              >
                →
              </button>
            </>
          )}

          <figure className={styles.lightboxFigure} onClick={(event) => event.stopPropagation()}>
            <div className={styles.lightboxImage} key={selectedImage}>
              <Image src={selectedImage} alt={`LNMHacks past edition, image ${selectedIndex + 1} of ${uniqueItems.length}`} fill sizes="96vw" priority />
            </div>
            <figcaption className={styles.lightboxCaption}>
              <span>Glimpses</span>
              <span>
                {String(selectedIndex + 1).padStart(2, '0')} / {String(uniqueItems.length).padStart(2, '0')}
              </span>
              <span className={styles.lightboxHint}>← → to browse · Esc to close</span>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  )
}
