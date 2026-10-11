'use client'

import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import { FluidBackground } from '@/components/canvas/fluid-background'

import { CursorArrow } from '@/components/canvas/glass/cursor-arrow'
import { VaporCountdown } from '@/components/ui/countdown-vapor-digits'
import { RadialSpeedLines } from '@/components/canvas/radial-speed-lines'
import { ProjectMeshes } from '@/components/canvas/grid/project-meshes'
import { updateLenisScrollSnapshot } from '@/lib/scroll-bus'
import { updatePointer } from '@/lib/pointer-bus'

export default function WebGLEmbed() {
  // Listen for scroll and pointer events from the parent Framer iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // In production, you might want to check event.origin to ensure it's from Framer
      if (!event.data || typeof event.data !== 'object') return

      if (event.data.type === 'framer-scroll') {
        updateLenisScrollSnapshot({
          progress: event.data.progress,
          scrollTop: event.data.scrollTop || 0,
        })
      }

      if (event.data.type === 'framer-pointer') {
        updatePointer({
          x: event.data.x,
          y: event.data.y,
          inside: true
        })
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  return (
    <main className="relative w-screen h-screen bg-transparent overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 pointer-events-none">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <Suspense fallback={null}>
            <RadialSpeedLines />
            <FluidBackground />
            <CursorArrow />
            <ProjectMeshes />
          </Suspense>
        </Canvas>
      </div>
      <VaporCountdown className="relative z-10 pointer-events-auto" />
    </main>
  )
}
