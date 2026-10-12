'use client'

import { useRef, useEffect } from 'react'
import { subscribeLenisScroll } from '@/lib/scroll-bus'
import { getArrowSectionVH } from '@/lib/arrow-section-progress'

// NOTE: Change this import to 'framer' when copying this component into Framer.com
import { addPropertyControls, ControlType } from '@/lib/framer-mock'

export interface InnovateSectionProps {
  phase1Text: string
  phase2Text: string
  phase3Text: string
  phase4Text: string
  textColor: string
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function InnovateSection({
  phase1Text = 'INNOVATE\nWITH\nPURPOSE',
  phase2Text = 'BUILD\nTHE\nFUTURE',
  phase3Text = 'PUSH\nEVERY\nBOUNDARY',
  phase4Text = 'CREATE\nREAL\nIMPACT',
  textColor = 'rgba(255, 255, 255, 0.95)',
}: Partial<InnovateSectionProps>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRefs = useRef<(HTMLHeadingElement | null)[]>([])

  const textPhases = [
    { lines: phase1Text.split('\n'), fadeIn: 4.5, fadeInEnd: 5.0, fadeOutStart: 6.5, fadeOut: 7.0 },
    { lines: phase2Text.split('\n'), fadeIn: 7.0, fadeInEnd: 7.5, fadeOutStart: 9.0, fadeOut: 9.5 },
    { lines: phase3Text.split('\n'), fadeIn: 9.5, fadeInEnd: 10.0, fadeOutStart: 11.5, fadeOut: 12.0 },
    { lines: phase4Text.split('\n'), fadeIn: 12.0, fadeInEnd: 12.5, fadeOutStart: 14.0, fadeOut: 14.5 },
  ]

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return
      const aVH = getArrowSectionVH()
      let anyVisible = false

      for (let i = 0; i < textPhases.length; i++) {
        const phase = textPhases[i]
        const el = textRefs.current[i]
        if (!el) continue

        const fadeIn = smoothstep(phase.fadeIn, phase.fadeInEnd, aVH)
        const fadeOut = 1 - smoothstep(phase.fadeOutStart, phase.fadeOut, aVH)
        const opacity = fadeIn * fadeOut

        if (opacity > 0.001) {
          anyVisible = true
          el.style.opacity = String(opacity)
          el.style.display = 'block'

          const scaleIn = 0.88 + fadeIn * 0.12
          const scaleHold = aVH > phase.fadeInEnd
            ? 1.0 + smoothstep(phase.fadeInEnd, phase.fadeOut, aVH) * 0.03
            : scaleIn
          el.style.transform = `scale(${scaleHold})`
        } else {
          el.style.opacity = '0'
          el.style.display = 'none'
        }
      }

      containerRef.current.style.visibility = anyVisible ? 'visible' : 'hidden'
    }

    const unsubscribe = subscribeLenisScroll(update)
    return () => { unsubscribe() }
  }, [textPhases])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-10 pointer-events-none flex items-center justify-center"
      style={{ visibility: 'hidden' }}
    >
      {textPhases.map((phase, i) => (
        <h1
          key={i}
          ref={(el) => { textRefs.current[i] = el }}
          className="absolute text-center font-black tracking-tight leading-[0.92] select-none"
          style={{
            fontSize: 'clamp(2.5rem, 10vw, 8rem)',
            color: textColor,
            textShadow: '0 0 30px rgba(100, 180, 255, 0.3)',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            letterSpacing: '-0.04em',
            willChange: 'transform, opacity',
            opacity: 0,
            display: 'none',
          }}
        >
          {phase.lines.map((line, j) => (
            <span key={j}>
              {line}
              {j < phase.lines.length - 1 && <br />}
            </span>
          ))}
        </h1>
      ))}
    </div>
  )
}

addPropertyControls(InnovateSection, {
  phase1Text: { type: ControlType.String, title: 'Phase 1 Text', defaultValue: 'INNOVATE\\nWITH\\nPURPOSE', displayTextArea: true },
  phase2Text: { type: ControlType.String, title: 'Phase 2 Text', defaultValue: 'BUILD\\nTHE\\nFUTURE', displayTextArea: true },
  phase3Text: { type: ControlType.String, title: 'Phase 3 Text', defaultValue: 'PUSH\\nEVERY\\nBOUNDARY', displayTextArea: true },
  phase4Text: { type: ControlType.String, title: 'Phase 4 Text', defaultValue: 'CREATE\\nREAL\\nIMPACT', displayTextArea: true },
  textColor: { type: ControlType.Color, title: 'Text Color', defaultValue: 'rgba(255, 255, 255, 0.95)' },
})
