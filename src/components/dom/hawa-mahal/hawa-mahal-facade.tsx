'use client'

import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, type CSSProperties, type HTMLAttributes } from 'react'
import { HAWA_MAHAL_SVG } from './facade.generated'
import { HawaMahalLights, type LightState, type SequenceOptions } from './lighting'

export type FacadePalette = 'day' | 'night'

/** Night treatment: floodlit terracotta, darker recesses, unlit panes nearly black-green. */
const NIGHT_VARS: Record<string, string> = {
  '--hm-stone': '#c84a27',
  '--hm-stone-light': '#e97a55',
  '--hm-stone-dark': '#8f2f13',
  '--hm-wall': '#5c1407',
  '--hm-shadow': '#3e0f08',
  '--hm-shadow-deep': '#2a0904',
  '--hm-cream': '#f4dcb6',
  '--hm-gold': '#f2c233',
  '--hm-gold-dark': '#b67a0c',
  '--hm-pane': '#0b3a33',
  '--hm-pane-deep': '#07271f',
  '--hm-lit-soft': '#d9a24a',
  '--hm-lit-active': '#f9c468',
  '--hm-lit-accent': '#ffe6a6',
}

/** The plinth colour at the very bottom edge of the SVG, so a host can continue it. */
export const FACADE_BASE_COLOUR: Record<FacadePalette, string> = { day: '#b4401f', night: '#8f2f13' }

export interface HawaMahalFacadeProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  palette?: FacadePalette
  /** SVG preserveAspectRatio, e.g. "xMidYMax slice" to pin the plinth to the bottom. */
  preserveAspectRatio?: string
  /** Initial state for every opening. Default 'off'. */
  initial?: LightState
  /** Run this sequence once the facade scrolls into view. */
  autoSequence?: SequenceOptions | false
  /** Receives the lighting API as soon as the SVG is in the DOM. */
  onReady?: (lights: HawaMahalLights) => void
}

/**
 * Inline Hawa Mahal facade. The SVG is inlined (not an <img>) so every window
 * is in the DOM and addressable through the `HawaMahalLights` API, available
 * via the forwarded ref or `onReady`.
 */
export const HawaMahalFacade = forwardRef<HawaMahalLights | null, HawaMahalFacadeProps>(function HawaMahalFacade(
  { palette = 'day', preserveAspectRatio, initial = 'off', autoSequence = false, onReady, style, className, ...rest },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const lightsRef = useRef<HawaMahalLights | null>(null)
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  const markup = useMemo(() => {
    const attrs: string[] = []
    if (preserveAspectRatio) attrs.push(`preserveAspectRatio="${preserveAspectRatio}"`)
    if (palette === 'night') {
      const vars = Object.entries(NIGHT_VARS)
        .map(([k, v]) => `${k}:${v}`)
        .join(';')
      attrs.push(`style="${vars}"`)
    }
    return attrs.length ? HAWA_MAHAL_SVG.replace('<svg ', `<svg ${attrs.join(' ')} `) : HAWA_MAHAL_SVG
  }, [palette, preserveAspectRatio])

  // Build the API in the layout phase so it exists before any parent effect
  // (and before the imperative handle below) reads the ref.
  useLayoutEffect(() => {
    const svg = hostRef.current?.querySelector('svg')
    if (!svg) return
    const lights = new HawaMahalLights(svg)
    lightsRef.current = lights
    if (initial !== 'off') lights.setAllLights(initial)
    onReadyRef.current?.(lights)
    return () => {
      lights.stop()
      lightsRef.current = null
    }
    // `initial` only applies on mount; later changes go through the API.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markup])

  useImperativeHandle<HawaMahalLights | null, HawaMahalLights | null>(ref, () => lightsRef.current)

  useEffect(() => {
    if (!autoSequence) return
    const host = hostRef.current
    const lights = lightsRef.current
    if (!host || !lights) return
    let started = false
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          started = true
          lights.runLightingSequence(autoSequence)
          io.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    io.observe(host)
    return () => io.disconnect()
    // the sequence object is treated as configuration for the mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markup, autoSequence === false])

  const hostStyle: CSSProperties = { lineHeight: 0, ...style }

  return (
    <div
      ref={hostRef}
      className={className}
      style={hostStyle}
      data-palette={palette}
      // The SVG is generated at build time from scripts/hawa-mahal; it contains no user content.
      dangerouslySetInnerHTML={{ __html: markup }}
      {...rest}
    />
  )
})

export type { HawaMahalLights, LightState, SequenceOptions }
