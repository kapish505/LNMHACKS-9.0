type CursorPosition = { x: number; y: number }
type CursorListener = (pos: CursorPosition) => void

const listeners = new Set<CursorListener>()
const currentPos: CursorPosition = { x: -100, y: -100 }

export function emitSmoothCursor(x: number, y: number) {
  currentPos.x = x
  currentPos.y = y
  for (const fn of listeners) {
    fn(currentPos)
  }
}

export function subscribeSmoothCursor(fn: CursorListener) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function getSmoothCursorPos(): CursorPosition {
  return currentPos
}
