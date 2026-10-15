'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
})

const THEME_STORAGE_KEY = 'lnmhacks_theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null
    if (stored === 'dark' || stored === 'light') {
      setThemeState(stored)
      applyTheme(stored)
      return
    }

    // Auto-detect system preference if user hasn't explicitly set one
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const initial: Theme = mql.matches ? 'dark' : 'light'
    setThemeState(initial)
    applyTheme(initial)

    const handler = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't set an explicit preference
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        const next: Theme = e.matches ? 'dark' : 'light'
        setThemeState(next)
        applyTheme(next)
      }
    }

    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: newTheme } }))
  }

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    applyTheme(newTheme)
  }

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

/** Helper to subscribe directly from outside React components (e.g. canvas loops) */
export function subscribeThemeChange(callback: (theme: Theme) => void) {
  if (typeof window === 'undefined') return () => {}
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ theme: Theme }>
    callback(custom.detail?.theme || 'light')
  }
  window.addEventListener('theme-change', handler)
  return () => window.removeEventListener('theme-change', handler)
}
