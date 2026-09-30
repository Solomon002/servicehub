import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAuth, type StaffRole } from '../context/AuthContext'

function StaffLoginPage({ role }: { role: StaffRole }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { configured, loading, user, role: currentRole, signIn, refreshMembership, signOut } = useAuth()
  const navigate = useNavigate()
  const isOwner = role === 'owner'
  const workspace = isOwner ? '/dashboard' : '/my-work'

  if (user && !loading && currentRole === role) return <Navigate to={workspace} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      const authenticatedRole = await refreshMembership()
      if (authenticatedRole && authenticatedRole !== role) {
        await signOut()
        throw new Error(`This account is not registered as a ${role}. Use the ${authenticatedRole} sign-in instead.`)
      }
      if (!authenticatedRole) throw new Error('This account has no shop access. Ask the shop owner to invite you.')
      navigate(workspace, { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign in. Check your details and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f8f5] px-5 py-10 text-stone-900">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <Link to="/" className="flex items-center gap-2.5"><span className="grid size-10 place-items-center rounded-xl bg-emerald-900 font-bold text-white">S</span><span className="text-lg font-bold tracking-tight">Service<span className="text-emerald-800">Hub</span></span></Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">ServiceHub workspace</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{isOwner ? 'Owner sign in' : 'Barber sign in'}</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">{isOwner ? 'Manage your shop, team and appointments.' : 'Open your schedule and see your appointments.'}</p>
        {configured ? <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div><label htmlFor="staff-email" className="mb-1.5 block text-sm font-medium text-stone-700">Email address</label><input id="staff-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" placeholder="you@example.com" /></div>
          <div><label htmlFor="staff-password" className="mb-1.5 block text-sm font-medium text-stone-700">Password</label><input id="staff-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" placeholder="Enter your password" /></div>
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-emerald-900 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-950 disabled:opacity-60">{submitting ? 'Signing in…' : `Continue to ${isOwner ? 'owner' : 'barber'} workspace`}</button>
        </form> : <div role="status" className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Connect your Supabase project to enable staff sign-in. Follow the setup steps in the project README.</div>}
        {isOwner && <p className="mt-5 text-sm text-stone-600">New to ServiceHub? <Link to="/signup/owner" className="font-semibold text-emerald-800 hover:text-emerald-950">Create an owner account</Link></p>}
        <div className="mt-5 flex justify-between gap-3 text-xs"><Link to={isOwner ? '/login/barber' : '/login/owner'} className="font-medium text-emerald-800 hover:text-emerald-950">{isOwner ? 'Barber sign in' : 'Owner sign in'}</Link><Link to="/" className="text-stone-500 hover:text-stone-800">Back to ServiceHub</Link></div>
      </div>
    </main>
  )
}

export default StaffLoginPage
