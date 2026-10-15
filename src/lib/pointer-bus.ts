import * as THREE from 'three'

type PointerSnapshot = { x: number; y: number; inside: boolean }

const uv = new THREE.Vector2(0.5, 0.5)
let insideFlag = true
let snapshotRef: PointerSnapshot = { x: 0.5, y: 0.5, inside: true }

function toUV(clientX: number, clientY: number): { x: number; y: number } {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1920
  const h = typeof window !== 'undefined' ? window.innerHeight : 1080
  return {
    x: Math.max(0, Math.min(1, clientX / w)),
    y: Math.max(0, Math.min(1, 1 - clientY / h)), // bottom-left origin for WebGL
  }
}

export const updatePointer = (next: PointerSnapshot) => {
  snapshotRef = next
  uv.set(next.x, next.y)
  insideFlag = next.inside
}

// Global auto-binding in browser: use pointermove for smooth 60fps tracking without mousemove duplication
if (typeof window !== 'undefined') {
  const handleMove = (e: PointerEvent | TouchEvent) => {
    let cx = 0
    let cy = 0
    if ('touches' in e && e.touches.length > 0) {
      cx = e.touches[0].clientX
      cy = e.touches[0].clientY
    } else if ('clientX' in e) {
      cx = (e as PointerEvent).clientX
      cy = (e as PointerEvent).clientY
    } else {
      return
    }
    const { x, y } = toUV(cx, cy)
    updatePointer({ x, y, inside: true })
  }

  window.addEventListener('pointermove', handleMove as EventListener, { passive: true })
  window.addEventListener('touchmove', handleMove as EventListener, { passive: true })
}

export function initPointerBus() {
  return () => {}
}

export const getPointerUV = () => uv
export const isPointerInside = () => insideFlag

