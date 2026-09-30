import { useTheme } from '../context/ThemeContext'
import { useLocation } from 'react-router'

function ThemeSelect({ compact = false }: { compact?: boolean }) {
  const { theme, setTheme } = useTheme()
  return <label className={`inline-flex items-center gap-2 text-xs font-medium text-stone-600 ${compact ? '' : 'rounded-lg border border-stone-200 bg-white px-3 py-2'}`}>
    <span aria-hidden="true">{theme === 'dark' ? '☾' : theme === 'light' ? '☀' : '◐'}</span>
    <span className="sr-only">Color theme</span>
    <select aria-label="Color theme" value={theme} onChange={event => setTheme(event.target.value as 'light' | 'dark' | 'system')} className="cursor-pointer bg-transparent text-inherit outline-none">
      <option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option>
    </select>
  </label>
}

export function RouteThemeControl() {
  const { pathname } = useLocation()
  if (!pathname.startsWith('/book') && !pathname.startsWith('/login') && !pathname.startsWith('/signup')) return null
  return <div className="fixed right-3 top-3 z-[100] rounded-lg bg-white/95 shadow-sm backdrop-blur sm:right-5 sm:top-5"><ThemeSelect /></div>
}

export default ThemeSelect
