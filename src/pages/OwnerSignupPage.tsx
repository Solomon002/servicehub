import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function OwnerSignupPage() {
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { configured, user, role } = useAuth()
  const navigate = useNavigate()

  useEffect(() => { if (user && role === 'owner') navigate('/dashboard', { replace: true }) }, [navigate, role, user])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabase) return
    setError(''); setMessage(''); setSubmitting(true)
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name')).trim()
    const email = String(form.get('email')).trim().toLowerCase()
    const phone = String(form.get('phone')).trim()
    const businessName = String(form.get('business')).trim()
    const slug = String(form.get('slug')).trim().toLowerCase()
    const location = String(form.get('location')).trim()
    const password = String(form.get('password'))
    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login/owner`,
          data: { full_name: name, phone, servicehub_role: 'owner', business_name: businessName, business_slug: slug, location },
        },
      })
      if (signupError) throw signupError
      if (data.session) setMessage(`Your account and shop are ready. Your public shop page is /shop?shop=${slug}, and customers can book at /book?shop=${slug}.`)
      else setMessage(`Check your email to confirm your account. Your shop profile will be created after confirmation. Your page will be /shop?shop=${slug}.`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the account. Please try again.')
    } finally { setSubmitting(false) }
  }

  return <main className="grid min-h-screen place-items-center bg-[#f7f8f5] px-5 py-10 text-stone-900"><div className="w-full max-w-2xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
    <Link to="/" className="flex items-center gap-2.5"><span className="grid size-10 place-items-center rounded-xl bg-emerald-900 font-bold text-white">S</span><span className="text-lg font-bold tracking-tight">Service<span className="text-emerald-800">Hub</span></span></Link>
    <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Join ServiceHub</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Create your shop account</h1><p className="mt-2 text-sm leading-6 text-stone-600">Set up your own shop on ServiceHub. Every business gets its own private workspace and public booking page.</p>
    {configured ? <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium sm:col-span-1">Your name<input name="name" required minLength={2} maxLength={120} autoComplete="name" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label>
      <label className="text-sm font-medium">Email address<input name="email" type="email" required autoComplete="email" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label>
      <label className="text-sm font-medium">Phone number<input name="phone" type="tel" required minLength={7} maxLength={24} autoComplete="tel" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label>
      <label className="text-sm font-medium">Shop name<input name="business" required minLength={2} maxLength={120} placeholder="e.g. Topsy Barbers" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label>
      <label className="text-sm font-medium">Unique shop address<span className="mt-1.5 flex items-center rounded-lg border border-stone-300 px-3 text-sm font-normal text-stone-500"><span>your-site/shop?shop=</span><input name="slug" required minLength={2} maxLength={50} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="topsy-barbers" className="min-w-0 flex-1 border-0 py-2.5 text-stone-900 outline-none focus:ring-0" /></span><span className="mt-1 block text-xs font-normal text-stone-500">Use lowercase letters, numbers, and hyphens. Each shop address must be unique.</span></label>
      <label className="text-sm font-medium">Location<input name="location" required minLength={2} maxLength={160} defaultValue="Lagos, Nigeria" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label>
      <label className="text-sm font-medium sm:col-span-2">Password<input name="password" type="password" required minLength={10} autoComplete="new-password" className="mt-1.5 w-full rounded-lg border border-stone-300 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /><span className="mt-1 block text-xs font-normal text-stone-500">Use at least 10 characters.</span></label>
      {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700 sm:col-span-2">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm leading-6 text-emerald-900 sm:col-span-2">{message}</p>}
      <button type="submit" disabled={submitting} className="rounded-lg bg-emerald-900 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-950 disabled:opacity-60 sm:col-span-2">{submitting ? 'Creating account…' : 'Create owner account'}</button>
      <p className="text-xs leading-5 text-stone-500 sm:col-span-2">By creating an account, you confirm you’re authorized to manage this shop. Owner access is created through the signup flow; barber access must be invited by an owner.</p>
    </form> : <div role="status" className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Connect your Supabase project to enable account creation. Follow the setup steps in the project README.</div>}
    <p className="mt-5 text-sm text-stone-600">Already have an account? <Link to="/login/owner" className="font-semibold text-emerald-800">Sign in</Link></p>
  </div></main>
}

export default OwnerSignupPage
