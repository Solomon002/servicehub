import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useBookingFlow } from '../context/BookingFlowContext'
import { startingBarbers } from '../data/barbers'
import { bookingPath } from '../lib/bookingRoute'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('')
}
type PublicBarber = { id: string; display_name: string }

function BarberSelectionPage() {
  const { selectedService, selectedBarber, selectedBarberName, selectBarber, businessSlug } = useBookingFlow()
  const navigate = useNavigate()
  const [barbers, setBarbers] = useState(() => isSupabaseConfigured ? [] : startingBarbers)
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !selectedService?.id) return
    let alive = true
    supabase.rpc('get_public_barbers', { p_slug: businessSlug, p_service_id: selectedService.id }).then(({ data, error: queryError }) => {
      if (!alive) return
      if (queryError) { setError(queryError.message); setBarbers([]) }
      else setBarbers(((data ?? []) as PublicBarber[]).map((item) => ({ id: item.id, name: item.display_name, phone: '', active: true, appointmentsToday: 0, services: [selectedService.name] })))
      setLoading(false)
    })
    return () => { alive = false }
  }, [businessSlug, selectedService])

  if (!selectedService) return <Navigate to="/book/services" replace />

  // In production, use the shop's live team returned by get_public_barbers.
  // The local seed list is only for the offline demo and has unrelated IDs.
  const matchingBarbers = barbers.filter(
    (barber) => barber.active && barber.services.includes(selectedService.name),
  )

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-8 text-stone-900 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link to={bookingPath('services', businessSlug)} className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-emerald-800">
          <span aria-hidden="true">←</span> Change service
        </Link>

        <div className="mt-8 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
          <span className="grid size-7 place-items-center rounded-full bg-emerald-800 text-white">✓</span>
          <span className="text-emerald-800">Service</span>
          <span className="mx-1 h-px w-8 bg-emerald-300" />
          <span className="grid size-7 place-items-center rounded-full bg-emerald-800 text-white">2</span>
          <span className="text-emerald-800">Barber</span>
          <span className="mx-1 h-px w-8 bg-stone-300" />
          <span className="grid size-7 place-items-center rounded-full bg-white text-stone-400 ring-1 ring-stone-200">3</span>
          <span className="text-stone-400">Date & time</span>
          <span className="mx-1 h-px w-8 bg-stone-300" />
          <span className="grid size-7 place-items-center rounded-full bg-white text-stone-400 ring-1 ring-stone-200">4</span>
          <span className="text-stone-400">Details</span>
        </div>

        <header className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-800">Step 2 of 4</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Choose a barber</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">Choose someone who offers your service, or let us find an available barber.</p>
        </header>

        <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-xs text-stone-500">Your service</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{selectedService.name} <span className="font-normal text-stone-500">· {selectedService.duration} min</span></p>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-stone-900">₦{selectedService.price.toLocaleString('en-NG')}</p>
        </div>

        <fieldset className="mt-6 space-y-3">
          <legend className="sr-only">Choose a barber</legend>
          <label className={`flex cursor-pointer items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition sm:p-5 ${selectedBarber === 'any' ? 'border-emerald-700 ring-2 ring-emerald-100' : 'border-stone-200 hover:border-stone-300'}`}>
            <input type="radio" name="barber" value="any" checked={selectedBarber === 'any'} onChange={() => selectBarber('any', 'Any available barber')} className="size-4 shrink-0 accent-emerald-800" />
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-emerald-100 text-lg text-emerald-900" aria-hidden="true">✦</span>
            <span className="min-w-0">
              <span className="block font-semibold text-stone-900">Any available barber</span>
              <span className="mt-1 block text-sm leading-5 text-stone-500">We’ll match you with someone who can do this service at your chosen time.</span>
            </span>
          </label>

          {matchingBarbers.map((barber) => (
            <label key={barber.id} className={`flex cursor-pointer items-center gap-4 rounded-xl border bg-white p-4 shadow-sm transition sm:p-5 ${selectedBarber === barber.id ? 'border-emerald-700 ring-2 ring-emerald-100' : 'border-stone-200 hover:border-stone-300'}`}>
              <input type="radio" name="barber" value={barber.id} checked={selectedBarber === barber.id} onChange={() => selectBarber(barber.id, barber.name)} className="size-4 shrink-0 accent-emerald-800" />
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-stone-100 text-sm font-semibold text-stone-700">{initials(barber.name)}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-stone-900">{barber.name}</span>
                <span className="mt-1 block text-sm text-stone-500">{barber.appointmentsToday} appointments today</span>
              </span>
              <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 sm:inline-block">Service match</span>
            </label>
          ))}
        </fieldset>

        {!loading && !error && matchingBarbers.length === 0 && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            No active barbers are currently listed for this service. Please contact the shop or choose another service.
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:px-5">
          <p aria-live="polite" className="text-sm text-stone-500">
            {selectedBarber === 'any'
              ? 'We’ll find a barber for your selected time.'
              : matchingBarbers.find((barber) => barber.id === selectedBarber)?.name ?? selectedBarberName ?? 'Choose a barber to continue.'}
          </p>
          <button type="button" disabled={!selectedBarber || loading || (isSupabaseConfigured && barbers.length === 0)} onClick={() => navigate(bookingPath('date-time', businessSlug))} className="shrink-0 rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-300">
            Continue <span aria-hidden="true">→</span>
          </button>
        </div>

        {error && <p role="alert" className="mt-4 text-center text-sm text-rose-700">Could not load barbers: {error}</p>}
        {loading && <p className="mt-4 text-center text-sm text-stone-500">Loading available barbers…</p>}
        <p className="mt-5 text-center text-xs text-stone-400">{isSupabaseConfigured ? 'Shop team · Barbers shown match the selected service' : 'Preview team · Barbers shown match your selected service'}</p>
      </div>
    </main>
  )
}

export default BarberSelectionPage
