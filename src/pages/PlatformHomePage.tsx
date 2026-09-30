import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase'
import ThemeSelect from '../components/ThemeSelect'

type PublicShop = { slug: string; name: string; location: string }

function PlatformHomePage() {
  const [shops, setShops] = useState<PublicShop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    let active = true
    if (!supabase) { setLoading(false); return }
    supabase.rpc('list_public_businesses').then(({ data, error: queryError }) => {
      if (!active) return
      if (queryError) setError('Shops could not be loaded right now.')
      else setShops((data ?? []) as PublicShop[])
      setLoading(false)
    })
    return () => { active = false }
  }, [])

  return <main className="min-h-screen bg-[#f7f8f5] text-stone-900">
    <header className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
      <Link to="/" className="flex items-center gap-2.5"><span className="grid size-10 place-items-center rounded-xl bg-emerald-900 font-bold text-white">S</span><span className="text-lg font-bold tracking-tight">Service<span className="text-emerald-800">Hub</span></span></Link>
      <div className="hidden items-center gap-3 md:flex"><nav aria-label="Main navigation" className="flex items-center gap-2 sm:gap-4"><Link to="/login/barber" className="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-white">Barber sign in</Link><Link to="/login/owner" className="rounded-lg px-3 py-2 text-sm text-stone-600 hover:bg-white">Owner sign in</Link><Link to="/signup/owner" className="rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-950">List your shop</Link></nav><ThemeSelect /></div>
      <div className="flex items-center gap-2 md:hidden"><ThemeSelect /><button type="button" onClick={() => setMenuOpen(open => !open)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} className="grid size-10 place-items-center rounded-lg border border-stone-200 bg-white text-xl text-stone-700">{menuOpen ? '×' : '☰'}</button></div>
      <nav aria-label="Mobile navigation" className={`mobile-panel absolute inset-x-5 top-[calc(100%-0.25rem)] z-20 grid gap-1 rounded-xl border border-stone-200 bg-white p-3 shadow-lg md:hidden ${menuOpen ? 'is-open' : ''}`}><Link onClick={() => setMenuOpen(false)} to="/login/barber" className="rounded-lg px-3 py-3 text-sm text-stone-700 hover:bg-stone-50">Barber sign in</Link><Link onClick={() => setMenuOpen(false)} to="/login/owner" className="rounded-lg px-3 py-3 text-sm text-stone-700 hover:bg-stone-50">Owner sign in</Link><Link onClick={() => setMenuOpen(false)} to="/signup/owner" className="rounded-lg bg-emerald-900 px-3 py-3 text-sm font-semibold text-white">List your shop</Link></nav>
    </header>
    <section className="mx-auto max-w-7xl px-5 pb-12 pt-14 sm:px-8 sm:pb-16 sm:pt-20">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-800">For barbershops across Nigeria</p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">Run your barbershop <span className="text-emerald-800">without the booking chaos.</span></h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-stone-600">Manage appointments, your team, customer history, and payment records in one place. Give customers a simple way to book—then get back to great cuts.</p>
      <div className="mt-8 flex flex-wrap gap-3"><Link to="/signup/owner" className="rounded-lg bg-emerald-900 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-950">Create your shop</Link><a href="#shops" className="rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50">Find a barbershop</a></div>
      <div className="mt-12 grid gap-3 sm:grid-cols-3"><Feature title="Manage the daily schedule" text="See bookings, check availability, and keep the calendar up to date."/><Feature title="Keep your team and clients organized" text="Give each barber their own login and keep customer history with appointments."/><Feature title="Let customers book online" text="Publish your service menu and a shop-specific booking page to share."/></div>
    </section>
    <section className="border-b border-stone-200 bg-emerald-950 px-5 py-12 text-white sm:px-8 sm:py-14"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-5"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-200">For customers</p><h2 className="mt-2 text-2xl font-semibold">Find a barber and book in minutes.</h2><p className="mt-2 max-w-xl text-sm leading-6 text-emerald-100">Choose a barbershop, compare its services, and reserve an available time online.</p></div><a href="#shops" className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-emerald-950">Find a barbershop</a></div></section>
    <section id="shops" className="border-y border-stone-200 bg-white px-5 py-12 sm:px-8 sm:py-14"><div className="mx-auto max-w-7xl"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Customer directory</p><h2 className="mt-2 text-2xl font-semibold">Find a barbershop</h2></div><p className="max-w-md text-sm text-stone-500">Choose a shop to see its services and available appointments.</p></div>
      {loading ? <p className="mt-6 text-sm text-stone-500">Loading shops…</p> : error ? <p role="status" className="mt-6 text-sm text-stone-500">{error}</p> : shops.length ? <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shops.map(shop => <li key={shop.slug} className="rounded-xl border border-stone-200 p-5"><h3 className="font-semibold">{shop.name}</h3><p className="mt-1 text-sm text-stone-500">{shop.location}</p><Link to={`/shop?shop=${encodeURIComponent(shop.slug)}`} className="mt-4 inline-flex text-sm font-semibold text-emerald-800">View shop & book →</Link></li>)}</ul> : <p className="mt-6 rounded-xl border border-dashed border-stone-300 bg-[#f7f8f5] p-5 text-sm leading-6 text-stone-600">No shops have listed yet. If you own a barbershop, <Link to="/signup/owner" className="font-semibold text-emerald-800">create your shop page</Link> and it will appear here.</p>}
    </div></section>
    <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 px-5 py-6 text-xs text-stone-500 sm:px-8"><span>ServiceHub · Barbershops across Nigeria</span><div className="flex gap-4"><Link to="/login/barber">Barber sign in</Link><Link to="/login/owner">Owner sign in</Link></div></footer>
  </main>
}

function Feature({ title, text }: { title: string; text: string }) { return <article className="rounded-xl border border-stone-200 bg-white p-5"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-stone-600">{text}</p></article> }
export default PlatformHomePage
