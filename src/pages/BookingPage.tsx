import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { appointmentServices } from '../data/appointments'
import { useBusinessSettings } from '../context/BusinessSettingsContext'
import { useBookingFlow } from '../context/BookingFlowContext'
import { bookingPath, readShopSlug } from '../lib/bookingRoute'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const formatNaira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`
type BusinessHourRow = { opens_at: string | null; closes_at: string | null; is_closed: boolean }
type PublicServiceRow = { id: string; name: string; description: string; duration_minutes: number; price_ngn: number }

function BookingPage() {
  const { settings } = useBusinessSettings()
  const { setBusinessSlug } = useBookingFlow()
  const location = useLocation()
  const slug = readShopSlug(location.search)
  const [shop, setShop] = useState({ name: settings.businessName, location: settings.location, phone: settings.phone, openingTime: settings.openingTime, closingTime: settings.closingTime, closedToday: false })
  const [shopError, setShopError] = useState('')
  const [services, setServices] = useState(() => isSupabaseConfigured ? [] : appointmentServices)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const hours = shop.closedToday ? 'Closed today' : `${formatTime(shop.openingTime)} – ${formatTime(shop.closingTime)}`
  useEffect(() => { setBusinessSlug(slug) }, [setBusinessSlug, slug])
  useEffect(() => {
    const client = supabase
    if (!isSupabaseConfigured || !client) { setLoading(false); return }
    let alive = true
    Promise.resolve(client.rpc('get_public_business', { p_slug: slug })).then(async ({ data, error }) => {
      if (!alive) return
      const row = data?.[0]
      if (error || !row) { setShopError(error?.message ?? 'Shop not found'); setServices([]); setLoading(false); return }
      setShop((current) => ({ ...current, name: row.name, location: row.location, phone: row.phone }))
      const [hoursResult, servicesResult] = await Promise.all([
        client.from('business_hours').select('opens_at,closes_at,is_closed').eq('business_id', row.id).eq('day_of_week', new Date().getDay()).maybeSingle(),
        client.rpc('get_public_services', { p_slug: slug }),
      ])
      const businessHours = hoursResult.data as BusinessHourRow | null
      const publicServices = servicesResult.data as PublicServiceRow[] | null
      if (alive && businessHours) setShop((current) => ({ ...current, openingTime: businessHours.opens_at?.slice(0, 5) ?? current.openingTime, closingTime: businessHours.closes_at?.slice(0, 5) ?? current.closingTime, closedToday: businessHours.is_closed }))
      if (alive && servicesResult.error) { setShopError(servicesResult.error.message); setServices([]) }
      else if (alive) setServices((publicServices ?? []).map((item) => ({ id: item.id, name: item.name, description: item.description ?? '', duration: item.duration_minutes, price: Number(item.price_ngn) })))
      if (alive) setLoading(false)
    }).catch((caught: unknown) => {
      if (!alive) return
      setShopError(caught instanceof Error ? caught.message : 'This shop could not be loaded. Please try again.')
      setServices([])
      setLoading(false)
    })
    return () => { alive = false }
  }, [settings.closingTime, settings.openingTime, slug])
  return (
    <main className="min-h-screen bg-stone-100 px-5 py-10 text-stone-900 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <header className="overflow-hidden rounded-2xl bg-emerald-800 text-white shadow-sm">
          <div className="px-6 py-10 text-center sm:px-12 sm:py-14">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/10 text-xl font-bold ring-1 ring-white/15">
              {shop.name.trim().charAt(0).toUpperCase() || 'S'}
            </div>
            <p className="mt-5 text-xs font-semibold tracking-[0.25em] text-emerald-200">{shop.name.toUpperCase()}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Book an appointment</h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-emerald-100/80 sm:text-base">
              Good grooming, right on schedule. Choose a service and book your visit.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link to={bookingPath('services', slug)} className="inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                Book an appointment <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <a href="#services" className="inline-flex rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                View services <span aria-hidden="true" className="ml-2">↓</span>
              </a>
            </div>
          </div>
          <div className="grid grid-cols-1 border-t border-white/10 bg-white/5 text-center sm:grid-cols-3">
            <div className="px-4 py-3 text-sm text-emerald-50 sm:border-r sm:border-white/10">{shop.location || 'Location not listed'}</div>
            <div className="border-t border-white/10 px-4 py-3 text-sm text-emerald-50 sm:border-r sm:border-t-0 sm:border-white/10">Today · {hours}</div>
            {shop.phone ? <a href={`tel:${shop.phone.replace(/\s/g, '')}`} className="border-t border-white/10 px-4 py-3 text-sm text-emerald-50 hover:bg-white/5 sm:border-t-0">{shop.phone}</a> : <span className="border-t border-white/10 px-4 py-3 text-sm text-emerald-50 sm:border-t-0">Phone not listed</span>}
          </div>
        </header>

        {shopError && <p role="alert" className="mt-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">Could not load this shop profile: {shopError}</p>}
        {!isSupabaseConfigured && <p role="status" className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Preview mode: bookings are not sent to a shop. Do not enter real customer details.</p>}
        <section id="services" className="mt-8 scroll-mt-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-800">The menu</p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Our services</h2>
            </div>
            <p className="text-sm text-stone-500">Available services and pricing</p>
          </div>

          {loading ? <p role="status" className="rounded-xl bg-white p-5 text-sm text-stone-500">Loading shop services…</p> : services.length ? <ul className="grid gap-3 sm:grid-cols-2">
            {services.map((service) => (
              <li key={service.name} className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800">✂</span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-stone-900">{service.name}</h3>
                    <p className="mt-1 text-xs leading-5 text-stone-600">{service.description}</p>
                    <p className="mt-1 text-xs text-stone-500">{service.duration} minutes</p>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-stone-900">{formatNaira(service.price)}</p>
              </li>
            ))}
          </ul> : <p className="rounded-xl border border-dashed border-stone-300 p-5 text-sm text-stone-500">{shopError ? 'Services are unavailable until this shop profile loads.' : 'This shop has not published any services yet.'}</p>}
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-emerald-800">◷</span>
              <h2 className="font-semibold">Opening hours</h2>
            </div>
            <p className="mt-3 text-sm text-stone-600">Today's opening hours</p>
            <p className="mt-1 text-sm font-medium text-stone-900">{hours}</p>
          </article>
          <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span aria-hidden="true" className="text-emerald-800">⌖</span>
              <h2 className="font-semibold">Find us</h2>
            </div>
            <p className="mt-3 text-sm text-stone-600">{shop.location}</p>
            <a href={`tel:${shop.phone.replace(/\s/g, '')}`} className="mt-1 block text-sm font-medium text-emerald-800 hover:text-emerald-900">Call {shop.phone}</a>
          </article>
        </section>

        <footer className="mt-8 text-center text-xs text-stone-400">
          {shop.name} · {isSupabaseConfigured ? 'Shop profile' : 'Preview profile · bookings are not saved'}
        </footer>
      </div>
    </main>
  )
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: minutes ? '2-digit' : undefined }).format(date)
}

export default BookingPage
