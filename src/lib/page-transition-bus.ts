'use client'

type TransitionCallback = (url: string) => void

const transitionListeners = new Set<TransitionCallback>()

export function triggerPageTransition(url: string) {
  if (transitionListeners.size === 0) {
    // Fallback if no listener registered
    window.location.href = url
    return
  }
  transitionListeners.forEach((fn) => fn(url))
}

export function subscribePageTransition(callback: TransitionCallback) {
  transitionListeners.add(callback)
  return () => {
    transitionListeners.delete(callback)
  }
}
