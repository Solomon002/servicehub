import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useBusinessSettings } from '../context/BusinessSettingsContext'
import { useAuth } from '../context/AuthContext'
import ThemeSelect from '../components/ThemeSelect'

const navigation = [
  { label: 'Dashboard', path: '/dashboard', icon: '▦', group: 'Overview' },
  { label: 'My work', path: '/my-work', icon: '◷', group: 'Overview' },
  { label: 'Calendar', path: '/calendar', icon: '▣', group: 'Overview' },
  { label: 'Appointments', path: '/appointments', icon: '☷', group: 'Business' },
  { label: 'Customers', path: '/customers', icon: '♙', group: 'Business' },
  { label: 'Services', path: '/services', icon: '✂', group: 'Business' },
  { label: 'Barbers', path: '/barbers', icon: '♧', group: 'Business' },
  { label: 'Payments', path: '/payments', icon: '₦', group: 'Finance' },
  { label: 'Analytics', path: '/analytics', icon: '▥', group: 'Finance' },
]

const sectionNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/my-work': 'My work',
  '/calendar': 'Calendar',
  '/appointments': 'Appointments',
  '/customers': 'Customers',
  '/services': 'Services',
  '/barbers': 'Barbers',
  '/payments': 'Payments',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
}

function BusinessLayout() {
  const { pathname } = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { settings } = useBusinessSettings()
  const { role, user, signOut } = useAuth()
  const pageTitle = sectionNames[pathname] ?? 'Dashboard'
  const visibleNavigation = role === 'barber' ? navigation.filter((item) => ['/my-work', '/calendar', '/appointments', '/customers'].includes(item.path)) : navigation.filter((item) => item.path !== '/my-work')
  const mobileNavigation = [...visibleNavigation, ...(role === 'owner' ? [{ label: 'Settings', path: '/settings', icon: '⚙' }] : [])]
  useEffect(() => { setMobileMenuOpen(false) }, [pathname])

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-stone-200 bg-white md:flex">
        <div className="flex h-20 items-center gap-3 border-b border-stone-100 px-6">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-800 text-lg font-bold text-white">
            S
          </div>
          <div>
            <p className="font-bold tracking-tight">ServiceHub</p>
            <p className="text-xs text-stone-500">Business workspace</p>
          </div>
        </div>

        <div className="px-4 pb-2 pt-6">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">
            Manage
          </p>
        </div>
        <nav aria-label="Business navigation" className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {['Overview', 'Business', 'Finance'].map((group) => <section key={group} aria-label={group}>
          <h2 className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-stone-400">{group}</h2>
          <div className="space-y-1">{visibleNavigation.filter(item => item.group === group).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                }`
              }
            >
              <span aria-hidden="true" className="grid size-5 place-items-center text-base">
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}</div></section>)}
        </nav>

        <div className="border-t border-stone-100 p-3">
          {role === 'owner' && <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                isActive ? 'bg-emerald-50 text-emerald-800' : 'text-stone-600 hover:bg-stone-50'
              }`
            }
          >
            <span aria-hidden="true" className="grid size-5 place-items-center">⚙</span>
            Settings
          </NavLink>}
          <div className="mt-3 flex items-center gap-3 rounded-lg bg-stone-50 p-3">
            <div className="grid size-9 place-items-center rounded-full bg-amber-100 text-sm font-semibold text-amber-900">
              SA
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user?.user_metadata.full_name ?? user?.email ?? 'Team member'}</p>
              <p className="text-xs capitalize text-stone-500">{role ?? 'Staff'}</p>
            </div>
            <button type="button" onClick={() => void signOut()} className="ml-auto text-xs font-medium text-stone-500 hover:text-rose-700">Sign out</button>
          </div>
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-stone-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div>
            <p className="text-xs text-stone-500">{settings.businessName}</p>
            <h1 className="text-sm font-semibold">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeSelect />
            <span className="hidden text-sm text-stone-600 sm:block">{user?.user_metadata.full_name ?? user?.email}</span>
            <div className="hidden size-9 place-items-center rounded-full bg-amber-100 text-xs font-semibold text-amber-900 md:grid">{(user?.user_metadata.full_name ?? 'SH').slice(0, 2).toUpperCase()}</div>
            <button type="button" onClick={() => setMobileMenuOpen(value => !value)} aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen} aria-controls="mobile-business-menu" className="grid size-10 place-items-center rounded-lg border border-stone-200 text-xl text-stone-700 md:hidden">
              <span aria-hidden="true">{mobileMenuOpen ? '×' : '☰'}</span>
            </button>
          </div>
        </header>

        <>
          <button type="button" aria-label="Close navigation menu" aria-hidden={!mobileMenuOpen} tabIndex={mobileMenuOpen ? 0 : -1} onClick={() => setMobileMenuOpen(false)} className={`mobile-scrim fixed inset-0 z-30 bg-black/30 md:hidden ${mobileMenuOpen ? 'is-open' : ''}`} />
          <nav id="mobile-business-menu" aria-label="Business navigation" aria-hidden={!mobileMenuOpen} className={`mobile-panel fixed inset-x-0 top-16 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-stone-200 bg-white p-4 shadow-xl md:hidden ${mobileMenuOpen ? 'is-open' : ''}`}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-400">Manage {settings.businessName}</p>
            <div className="grid gap-1">{mobileNavigation.map(item => <NavLink key={item.path} to={item.path} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${isActive ? 'bg-emerald-50 text-emerald-800' : 'text-stone-700 hover:bg-stone-50'}`}><span className="grid size-5 place-items-center" aria-hidden="true">{item.icon}</span>{item.label}</NavLink>)}</div>
            <div className="mt-3 flex items-center justify-between border-t border-stone-200 px-3 pt-4"><div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.user_metadata.full_name ?? user?.email ?? 'Team member'}</p><p className="text-xs capitalize text-stone-500">{role ?? 'Staff'}</p></div><button type="button" onClick={() => void signOut()} className="rounded-lg px-3 py-2 text-sm font-medium text-rose-700">Sign out</button></div>
          </nav>
        </>

        <div key={pathname} className="route-fade-in"><Outlet /></div>
      </div>
    </div>
  )
}

export default BusinessLayout
