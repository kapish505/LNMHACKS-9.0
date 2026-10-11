'use client'

type LoaderListener = (loaded: boolean) => void

let isLoaded = false
const listeners = new Set<LoaderListener>()

export const setWebsiteLoaded = () => {
  if (isLoaded) return
  isLoaded = true
  listeners.forEach((fn) => fn(true))
}

export const isWebsiteLoaded = () => isLoaded

export const subscribeWebsiteLoaded = (fn: LoaderListener) => {
  listeners.add(fn)
  if (isLoaded) fn(true)
  return () => {
    listeners.delete(fn)
  }
}

// Reset helper (for hot-reload / unmount testing)
export const resetWebsiteLoaded = () => {
  isLoaded = false
}
