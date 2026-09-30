import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
const storageKey = 'servicehub-theme'
const ThemeContext = createContext<{ theme: ThemePreference; setTheme: (theme: ThemePreference) => void } | null>(null)

function readPreference(): ThemePreference {
  const value = localStorage.getItem(storageKey)
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(readPreference)
  const applyTheme = useCallback((preference: ThemePreference) => {
    const dark = preference === 'dark' || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.classList.toggle('dark', dark)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [])

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => applyTheme('system')
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [applyTheme, theme])

  const setTheme = (next: ThemePreference) => {
    localStorage.setItem(storageKey, next)
    setThemeState(next)
  }
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
