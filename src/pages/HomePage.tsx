import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { appointmentServices } from '../data/appointments'
import { useBusinessSettings } from '../context/BusinessSettingsContext'
import { bookingPath, readShopSlug } from '../lib/bookingRoute'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import ThemeSelect from '../components/ThemeSelect'

type PublicServiceRow = { id: string; name: string; description: string; duration_minutes: number; price_ngn: number }

function HomePage() {
  const { settings } = useBusinessSettings()
  const location = useLocation()
  const slug = readShopSlug(location.search)
  const [shop, setShop] = useState({ name: settings.businessName, location: settings.location, phone: settings.phone, openingTime: settings.openingTime, closingTime: settings.closingTime, closedToday: false })
  const [services, setServices] = useState(isSupabaseConfigured ? [] : appointmentServices)
  const [menuOpen, setMenuOpen] = useState(false)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [shopError, setShopError] = useState('')
  useEffect(() => {
    const client = supabase
    if (!isSupabaseConfigured || !client) { setLoading(false); return }
    let alive = true
    Promise.resolve(client.rpc('get_public_business', { p_slug: slug })).then(async ({ data, error }) => {
      const row = data?.[0]
      if (!alive) return
      if (error || !row) { setShopError(error?.message ?? 'This shop page could not be found. Check the shop link.'); setServices([]); setLoading(false); return }
      setShop((current) => ({ ...current, name: row.name, location: row.location, phone: row.phone }))
      const [hoursResult, servicesResult] = await Promise.all([
        client.from('business_hours').select('opens_at,closes_at,is_closed').eq('business_id', row.id).eq('day_of_week', new Date().getDay()).maybeSingle(),
        client.rpc('get_public_services', { p_slug: slug }),
      ])
      if (!alive) return
      const hoursRow = hoursResult.data as { opens_at: string | null; closes_at: string | null; is_closed: boolean } | null
      const serviceRows = servicesResult.data as PublicServiceRow[] | null
      if (hoursRow) setShop((current) => ({ ...current, openingTime: hoursRow.opens_at?.slice(0, 5) ?? current.openingTime, closingTime: hoursRow.closes_at?.slice(0, 5) ?? current.closingTime, closedToday: hoursRow.is_closed }))
      if (servicesResult.error) { setShopError(servicesResult.error.message); setServices([]) }
      else setServices((serviceRows ?? []).map((service) => ({ id: service.id, name: service.name, description: service.description ?? '', duration: service.duration_minutes, price: Number(service.price_ngn) })))
      setLoading(false)
    }).catch((caught: unknown) => {
      if (!alive) return
      setShopError(caught instanceof Error ? caught.message : 'This shop could not be loaded. Please try again.')
      setServices([])
      setLoading(false)
    })
    return () => { alive = false }
  }, [slug])
  const hours = shop.closedToday ? 'Closed today' : `${formatTime(shop.openingTime)}–${formatTime(shop.closingTime)}`
  return (
    <main className="min-h-screen bg-[#f7f8f5] text-stone-900">
      <header className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-5 sm:flex-nowrap sm:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="ServiceHub home">
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-900 font-bold text-white">S</span>
          <span className="text-lg font-bold tracking-tight">Service<span className="text-emerald-800">Hub</span></span>
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-2 sm:gap-4 md:flex">
          <Link to="/login/barber" className="rounded-lg px-2 py-2 text-xs font-medium text-stone-600 hover:bg-white sm:px-3 sm:text-sm">Barber sign in</Link>
          <Link to="/login/owner" className="rounded-lg px-2 py-2 text-xs font-medium text-stone-600 hover:bg-white sm:px-3 sm:text-sm">Owner sign in</Link>
          <Link to={bookingPath('services', slug)} className="rounded-lg bg-emerald-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-emerald-950 sm:px-4 sm:text-sm">Book now</Link>
          <ThemeSelect />
        </nav>
        <div className="flex items-center gap-2 md:hidden"><ThemeSelect /><button type="button" onClick={() => setMenuOpen(open => !open)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} className="grid size-10 place-items-center rounded-lg border border-stone-200 bg-white text-xl text-stone-700">{menuOpen ? '×' : '☰'}</button></div>
        <nav aria-label="Mobile navigation" className={`mobile-panel absolute inset-x-5 top-[calc(100%-0.25rem)] z-20 grid gap-1 rounded-xl border border-stone-200 bg-white p-3 shadow-lg md:hidden ${menuOpen ? 'is-open' : ''}`}><Link onClick={() => setMenuOpen(false)} to="/login/barber" className="rounded-lg px-3 py-3 text-sm text-stone-700 hover:bg-stone-50">Barber sign in</Link><Link onClick={() => setMenuOpen(false)} to="/login/owner" className="rounded-lg px-3 py-3 text-sm text-stone-700 hover:bg-stone-50">Owner sign in</Link><Link onClick={() => setMenuOpen(false)} to={bookingPath('services', slug)} className="rounded-lg bg-emerald-900 px-3 py-3 text-sm font-semibold text-white">Book now</Link></nav>
      </header>

      {shopError && <p role="alert" className="mx-auto mt-4 max-w-7xl px-5 text-sm text-rose-700 sm:px-8">{shopError}</p>}
      {!isSupabaseConfigured && <p role="status" className="mx-auto mt-3 max-w-7xl px-5 text-xs text-amber-800 sm:px-8">Preview mode: this shop page uses example content. Bookings are not sent to a shop; do not enter real customer details.</p>}

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-14 pt-9 sm:px-8 sm:pb-20 md:grid-cols-[1.05fr_0.95fr] md:pt-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900"><span className="size-2 rounded-full bg-emerald-600" />{shop.name}{shop.location ? ` · ${shop.location}` : ''}</p>
          <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">A fresh cut, <span className="text-emerald-800">on your time.</span></h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-stone-600">Choose your service, pick a barber and reserve a time that works for you. Your next great haircut is just a few clicks away.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to={bookingPath('services', slug)} className="rounded-lg bg-emerald-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-950">Book an appointment <span aria-hidden="true">→</span></Link>
            <a href="#services" className="rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50">Explore services</a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-stone-500"><span>✦ Skilled barbers</span><span>◷ Today, {hours}</span>{shop.location && <span>⌖ {shop.location}</span>}</div>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div aria-hidden="true" className="absolute -inset-4 rounded-[2rem] bg-emerald-900/5" />
          <div className="relative overflow-hidden rounded-3xl bg-[#173c30] p-6 text-white shadow-xl sm:p-8">
            <div className="flex items-start justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">{shop.name}</p><p className="mt-1 text-xl font-semibold">Your next appointment</p></div>
              <span className="grid size-11 place-items-center rounded-xl bg-white/10 text-xl">✂</span>
            </div>
            <div className="mt-7 rounded-2xl bg-white p-5 text-stone-900">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4"><div><p className="text-xs text-stone-500">Featured service</p><p className="mt-1 font-semibold">{services[0]?.name ?? 'Choose a service'}</p></div><p className="font-semibold">{services[0] ? `₦${services[0].price.toLocaleString('en-NG')}` : '—'}</p></div>
              <div className="flex items-center justify-between py-4"><div><p className="text-xs text-stone-500">Duration</p><p className="mt-1 text-sm font-medium">{services[0] ? `${services[0].duration} minutes` : 'Varies by service'}</p></div><div className="text-right"><p className="text-xs text-stone-500">Availability</p><p className="mt-1 text-sm font-medium text-emerald-800">Today · {hours}</p></div></div>
              <Link to={bookingPath('services', slug)} className="block rounded-lg bg-emerald-900 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-950">Find a time <span aria-hidden="true">→</span></Link>
            </div>
            <p className="mt-5 text-center text-sm text-emerald-100/80">Simple booking. Great grooming. No waiting around.</p>
          </div>
        </div>
      </section>

      <section id="services" className="border-y border-stone-200/80 bg-white px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">The service menu</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Good grooming, made easy</h2></div><Link to={bookingPath('services', slug)} className="text-sm font-semibold text-emerald-800 hover:text-emerald-950">See all and book →</Link></div>
          {loading ? <p className="mt-7 rounded-xl bg-stone-50 p-5 text-sm text-stone-500">Loading shop services…</p> : services.length ? <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service, index) => <li key={`${service.name}-${index}`} className="rounded-xl border border-stone-200 bg-[#fdfdfb] p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{service.name}</h3><span aria-hidden="true" className="text-emerald-800">✂</span></div><p className="mt-2 min-h-10 text-sm leading-5 text-stone-600">{service.description}</p><div className="mt-3 flex items-center justify-between text-sm text-stone-500"><span>{service.duration} min</span><span className="font-semibold text-stone-900">₦{service.price.toLocaleString('en-NG')}</span></div></li>)}
          </ul> : <p className="mt-7 rounded-xl border border-dashed border-stone-300 p-5 text-sm text-stone-500">{shopError ? 'Services are unavailable until this shop profile loads.' : 'This shop has not published any services yet.'}</p>}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 md:grid-cols-2 md:py-16">
        <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">Visit {shop.name}</p><h2 className="mt-2 text-2xl font-semibold">Your neighborhood barbershop</h2><p className="mt-3 max-w-md text-sm leading-6 text-stone-600">Drop in for a clean cut and friendly service. Book ahead to get the barber and time you prefer.</p></div>
        <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500">Opening hours</p><p className="mt-2 text-sm font-semibold">Today</p><p className="mt-1 text-sm text-stone-600">{hours}</p></div><div className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-xs text-stone-500">Location</p><p className="mt-2 text-sm font-semibold">{shop.location || 'Contact shop for location'}</p><a href={`tel:${shop.phone.replace(/\s/g, '')}`} className="mt-1 block text-sm text-emerald-800">{shop.phone}</a></div></div>
      </section>

      <footer className="border-t border-stone-200 bg-white px-5 py-6 sm:px-8"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs text-stone-500"><span>© 2026 {shop.name} · Powered by ServiceHub</span><div className="flex gap-4"><Link to="/login/barber" className="hover:text-emerald-800">Barber sign in</Link><Link to="/login/owner" className="hover:text-emerald-800">Owner sign in</Link></div></div></footer>
    </main>
  )
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: minutes ? '2-digit' : undefined }).format(date)
}

export default HomePage
