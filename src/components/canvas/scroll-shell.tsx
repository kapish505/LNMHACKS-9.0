'use client'

import { ReactLenis, useLenis } from 'lenis/react'
import { useEffect } from 'react'
import { bindLenisScrollBus } from '@/lib/scroll-bus'
import { initPointerBus } from '@/lib/pointer-bus'

export function ScrollShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    return initPointerBus()
  }, [])

  return (
    <ReactLenis root options={{ autoRaf: false, lerp: 0.1, smoothWheel: true, syncTouch: true }}>
      <LenisScrollEnvBridge />
      {children}
    </ReactLenis>
  )
}

function LenisScrollEnvBridge() {
  const lenis = useLenis()

  useEffect(() => {
    bindLenisScrollBus(lenis ?? null)
    return () => bindLenisScrollBus(null)
  }, [lenis])

  useEffect(() => {
    if (!lenis) return

    // Lenis gets its own requestAnimationFrame rather than riding R3F's
    // addEffect. Driving it from the Three.js loop meant scroll interpolation
    // advanced only as fast as the GPU could render: when the canvas dropped to
    // 15fps, smooth scrolling stepped at 15fps too, which is what made the page
    // feel broken rather than merely slow. It also pinned the main canvas to
    // frameloop="always", since pausing it would have frozen scrolling.
    //
    // This effect runs before the Canvas children mount, so Lenis still ticks
    // ahead of any useFrame consumer in the same frame and the existing read
    // ordering through scroll-bus is preserved.
    let raf = 0
    const loop = (time: number) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => cancelAnimationFrame(raf)
  }, [lenis])

  return null
}
