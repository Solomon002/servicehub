import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../../context/AuthContext'

export function RequireStaff({ children }: { children: ReactNode }) {
  const { configured, loading, user, role, signOut } = useAuth()
  const location = useLocation()
  if (!configured) return <main className="grid min-h-screen place-items-center bg-stone-100 px-5 text-stone-900"><div className="max-w-lg rounded-2xl border border-stone-200 bg-white p-7 shadow-sm"><p className="text-xs font-bold uppercase tracking-widest text-emerald-800">ServiceHub setup</p><h1 className="mt-2 text-2xl font-semibold">Connect your database</h1><p className="mt-3 text-sm leading-6 text-stone-600">Staff pages are protected and require a configured Supabase project. Add the project URL and publishable key to <code>.env.local</code>, then follow the database setup in README.</p><Link to="/" className="mt-5 inline-block text-sm font-semibold text-emerald-800">Back to public page →</Link></div></main>
  if (loading) return <main className="grid min-h-screen place-items-center text-sm text-stone-500">Checking your session…</main>
  if (!user) return <Navigate to="/login/owner" state={{ from: location.pathname }} replace />
  if (!role) return <main className="grid min-h-screen place-items-center bg-stone-100 px-5"><div className="max-w-md rounded-xl border border-stone-200 bg-white p-6 text-center"><h1 className="text-lg font-semibold">No shop access is assigned</h1><p className="mt-2 text-sm leading-6 text-stone-600">This account isn’t linked to a ServiceHub shop. Ask the owner to invite you, or sign in with another account.</p><button type="button" onClick={() => void signOut()} className="mt-4 text-sm font-semibold text-emerald-800">Sign out</button></div></main>
  return children
}

export function RequireOwner({ children }: { children: ReactNode }) {
  const { role, loading } = useAuth()
  if (loading) return <main className="grid min-h-[60vh] place-items-center text-sm text-stone-500">Checking your access…</main>
  if (role !== 'owner') return <Navigate to="/calendar" replace />
  return children
}

export function RequireBarber({ children }: { children: ReactNode }) {
  const { role, loading } = useAuth()
  if (loading) return <main className="grid min-h-[60vh] place-items-center text-sm text-stone-500">Checking your access…</main>
  if (role !== 'barber') return <Navigate to="/dashboard" replace />
  return children
}
