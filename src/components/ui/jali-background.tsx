'use client'

import React, { useEffect, useRef } from 'react'

const JALI_HOLES_SVG = `<svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
  <path fill-rule="evenodd" fill="black" d="
    M 0,0 H 40 V 40 H 0 Z
    M 20,4 L 36,20 L 20,36 L 4,20 Z
  " />
</svg>`

export function JaliBackground() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      containerRef.current.style.setProperty('--mouse-x', `${x}px`)
      containerRef.current.style.setProperty('--mouse-y', `${y}px`)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const encodedSvg = encodeURIComponent(JALI_HOLES_SVG)
  const patternUrl = `url("data:image/svg+xml,${encodedSvg}")`

  // Shorter, ultra-soft reveal gradient so it blends naturally with the organic waves
  const softRevealGradient = `radial-gradient(circle 250px at var(--mouse-x) var(--mouse-y), black 0%, rgba(0,0,0,0.5) 40%, transparent 100%)`

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
      style={{
        background: 'transparent',
        '--mouse-x': '50%',
        '--mouse-y': '50%',
      } as React.CSSProperties}
    >
      {/* 
        3D Stone Thickness (Inner Shadow Rim)
      */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          background: 'rgba(30, 5, 10, 0.95)',
          WebkitMaskImage: `${softRevealGradient}, ${patternUrl}`,
          WebkitMaskComposite: 'source-in',
          maskImage: `${softRevealGradient}, ${patternUrl}`,
          maskComposite: 'intersect',
          WebkitMaskSize: '100% 100%, 40px 40px',
          maskSize: '100% 100%, 40px 40px',
          WebkitMaskPosition: '0 0, -1.5px -1.5px',
          maskPosition: '0 0, -1.5px -1.5px',
        }}
      />

      {/* 
        The Physical 3D Jali Wall
        - Beautiful translucent peach to match the waves' spotlight organically.
      */}
      <div
        className="absolute inset-0 w-full h-full"
        style={{
          background: 'rgba(255, 163, 89, 0.85)',
          WebkitMaskImage: `${softRevealGradient}, ${patternUrl}`,
          WebkitMaskComposite: 'source-in',
          maskImage: `${softRevealGradient}, ${patternUrl}`,
          maskComposite: 'intersect',
          WebkitMaskSize: '100% 100%, 40px 40px',
          maskSize: '100% 100%, 40px 40px',
          WebkitMaskPosition: '0 0, 0 0',
          maskPosition: '0 0, 0 0',
        }}
      />
    </div>
  )
}
