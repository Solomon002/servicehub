import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { useBookingFlow } from '../context/BookingFlowContext'
import { appointmentServices } from '../data/appointments'
import { bookingPath, readShopSlug } from '../lib/bookingRoute'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

const formatNaira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`
type PublicService = { id: string; name: string; description: string; duration_minutes: number; price_ngn: number }

function ServiceSelectionPage() {
  const { selectedService, selectService, businessSlug, setBusinessSlug } = useBookingFlow()
  const location = useLocation()
  const navigate = useNavigate()
  const [services, setServices] = useState(() => isSupabaseConfigured ? [] : appointmentServices.map((service) => ({ ...service, id: undefined as string | undefined })))
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState('')
  const [shopName, setShopName] = useState('this barbershop')
  const slug = readShopSlug(location.search)
  useEffect(() => { setBusinessSlug(slug) }, [setBusinessSlug, slug])
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    let alive = true
    setLoading(true)
    supabase.rpc('get_public_services', { p_slug: slug }).then(({ data, error: queryError }) => {
      if (!alive) return
      if (queryError) { setError(queryError.message); setServices([]) }
      else setServices(((data ?? []) as PublicService[]).map((item) => ({ id: item.id, name: item.name, description: item.description ?? '', duration: item.duration_minutes, price: Number(item.price_ngn) })))
      setLoading(false)
    })
    return () => { alive = false }
  }, [slug])
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return
    let alive = true
    supabase.rpc('get_public_business', { p_slug: slug }).then(({ data }) => { if (alive && data?.[0]?.name) setShopName(data[0].name) })
    return () => { alive = false }
  }, [slug])

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-8 text-stone-900 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link to={bookingPath('home', slug)} className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-emerald-800">
          <span aria-hidden="true">←</span> Back to shop
        </Link>

        <div className="mt-8 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
          <span className="grid size-7 place-items-center rounded-full bg-emerald-800 text-white">1</span>
          <span className="text-emerald-800">Service</span>
          <span className="mx-1 h-px w-8 bg-stone-300" />
          <span className="grid size-7 place-items-center rounded-full bg-white text-stone-400 ring-1 ring-stone-200">2</span>
          <span className="text-stone-400">Barber</span>
          <span className="mx-1 h-px w-8 bg-stone-300" />
          <span className="grid size-7 place-items-center rounded-full bg-white text-stone-400 ring-1 ring-stone-200">3</span>
          <span className="text-stone-400">Date & time</span>
          <span className="mx-1 h-px w-8 bg-stone-300" />
          <span className="grid size-7 place-items-center rounded-full bg-white text-stone-400 ring-1 ring-stone-200">4</span>
          <span className="text-stone-400">Details</span>
        </div>

        <header className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-800">Step 1 of 4</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Choose a service</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">Select the service you’d like to book at {shopName}.</p>
        </header>

        <fieldset className="mt-6 space-y-3">
          <legend className="sr-only">Available services</legend>
          {services.map((service) => {
            const isSelected = selectedService?.name === service.name
            return (
              <label key={service.name} className={`flex cursor-pointer items-center justify-between gap-4 rounded-xl border bg-white p-4 shadow-sm transition sm:p-5 ${isSelected ? 'border-emerald-700 ring-2 ring-emerald-100' : 'border-stone-200 hover:border-stone-300'}`}>
                <span className="flex min-w-0 items-center gap-4">
                  <input
                    type="radio"
                    name="service"
                    value={service.name}
                    checked={isSelected}
                    onChange={() => selectService(service)}
                    className="size-4 shrink-0 accent-emerald-800"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-stone-900">{service.name}</span>
                    <span className="mt-1 block text-sm leading-5 text-stone-600">{service.description}</span>
                    <span className="mt-1 block text-sm text-stone-500">{service.duration} minutes</span>
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-stone-900">{formatNaira(service.price)}</span>
              </label>
            )
          })}
        </fieldset>

        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:px-5">
          <div aria-live="polite" aria-atomic="true">
            {selectedService ? (
              <>
                <p className="text-xs text-stone-500">Selected service</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">{selectedService.name} · {formatNaira(selectedService.price)}</p>
              </>
            ) : (
              <p className="text-sm text-stone-500">Select a service to continue.</p>
            )}
          </div>
          <button
            type="button"
            disabled={!selectedService}
            onClick={() => navigate(bookingPath('barber', businessSlug))}
            className="shrink-0 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            Continue <span aria-hidden="true">→</span>
          </button>
        </div>

        {error && <p role="alert" className="mt-4 text-center text-sm text-rose-700">Could not load shop services: {error}</p>}
        {loading && <p className="mt-4 text-center text-sm text-stone-500">Loading shop services…</p>}
        <p className="mt-5 text-center text-xs text-stone-400">{isSupabaseConfigured ? 'Live services · Prices are shown in Nigerian naira' : 'Demo services · Prices are shown in Nigerian naira'}</p>
      </div>
    </main>
  )
}

export default ServiceSelectionPage
