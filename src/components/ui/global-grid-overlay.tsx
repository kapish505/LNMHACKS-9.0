'use client'

import React, { useEffect, useState } from 'react'
import { useTheme } from '@/lib/theme-context'

export function GlobalGridOverlay() {
  const [dim, setDim] = useState<{ width: number; height: number } | null>(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const lineStroke = isDark ? 'rgba(255, 255, 255, 0.13)' : 'rgba(0, 0, 0, 0.09)'
  const crossStroke = isDark ? 'rgba(255, 255, 255, 0.38)' : 'rgba(0, 0, 0, 0.25)'

  useEffect(() => {
    const update = () => {
      setDim({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }
    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  if (!dim) {
    return null
  }

  // Exactly 3 rows in hero section (at zero scroll) with no extra at top and bottom
  const rowHeight = dim.height / 3
  const ys = [0, rowHeight, rowHeight * 2, dim.height]

  // Exactly 3 columns with just some extra at right and left edge
  // Matches editorial container padding (56px on lg, 32px on sm/md, 20px on mobile)
  const edgeMargin = dim.width >= 1024 ? 56 : dim.width >= 640 ? 32 : 20
  const colWidth = (dim.width - 2 * edgeMargin) / 3
  const xs = [
    edgeMargin,
    edgeMargin + colWidth,
    edgeMargin + colWidth * 2,
    dim.width - edgeMargin,
  ]

  return (
    <svg
      className="fixed inset-0 w-full h-full pointer-events-none select-none transition-colors duration-300"
      style={{ zIndex: 2 }}
      width={dim.width}
      height={dim.height}
      aria-hidden="true"
    >
      {/* Horizontal grid lines running across the entire width */}
      {ys.map((y, i) => (
        <line
          key={`h-${i}`}
          x1={0}
          y1={Math.round(y)}
          x2={dim.width}
          y2={Math.round(y)}
          stroke={lineStroke}
          strokeWidth={1}
        />
      ))}

      {/* Vertical grid lines (3 columns + left and right extra edge) */}
      {xs.map((x, i) => (
        <line
          key={`v-${i}`}
          x1={Math.round(x)}
          y1={0}
          x2={Math.round(x)}
          y2={dim.height}
          stroke={lineStroke}
          strokeWidth={1}
        />
      ))}

      {/* Crosshair "+" intersections at every (x, y) */}
      {xs.map((x, xi) =>
        ys.map((y, yi) => {
          const rx = Math.round(x)
          const ry = Math.round(y)
          return (
            <g key={`cross-${xi}-${yi}`}>
              <line
                x1={rx - 7}
                y1={ry}
                x2={rx + 7}
                y2={ry}
                stroke={crossStroke}
                strokeWidth={1.5}
              />
              <line
                x1={rx}
                y1={ry - 7}
                x2={rx}
                y2={ry + 7}
                stroke={crossStroke}
                strokeWidth={1.5}
              />
            </g>
          )
        })
      )}
    </svg>
  )
}
