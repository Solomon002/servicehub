import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAppointments } from '../context/AppointmentContext'
import { useBookingFlow } from '../context/BookingFlowContext'
import {
  getAvailableTimeSlots,
  getLocalDate,
} from '../data/appointments'
import { bookingPath } from '../lib/bookingRoute'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

function dateToIso(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isoToDate(value: string) {
  return new Date(`${value}T12:00:00`)
}

function addDays(date: Date, amount: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function getMonthGrid(date: Date) {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7
  const firstCell = addDays(firstOfMonth, -mondayOffset)
  return Array.from({ length: 42 }, (_, index) => addDays(firstCell, index))
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
}
type PublicSlot = { slot_time: string; available_barbers: number }

function DateTimeSelectionPage() {
  const { appointments } = useAppointments()
  const {
    selectedService,
    selectedBarber,
    selectedBarberName,
    selectedDate,
    selectDate,
    selectedTime,
    selectTime,
    businessSlug,
  } = useBookingFlow()
  const navigate = useNavigate()
  const [visibleMonth, setVisibleMonth] = useState(() => isoToDate(selectedDate))

  const maxDate = getLocalDate(60)
  const today = getLocalDate()
  const demoSlots = selectedService ? getAvailableTimeSlots(
    selectedDate,
    selectedService.name,
    appointments,
    selectedBarber ?? undefined,
  ) : []
  const [liveSlots, setLiveSlots] = useState<Array<{ time: string; availableBarberCount: number }>>([])
  const [slotsLoading, setSlotsLoading] = useState(isSupabaseConfigured)
  const [slotsError, setSlotsError] = useState('')
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !selectedService || !selectedBarber) return
    let alive = true
    setSlotsLoading(true); setSlotsError('')
    supabase.rpc('get_available_booking_slots', {
      p_slug: businessSlug,
      p_service_id: selectedService.id,
      p_barber_id: selectedBarber === 'any' ? null : selectedBarber,
      p_date: selectedDate,
    }).then(({ data, error }) => {
      if (!alive) return
      if (error) { setSlotsError(error.message); setLiveSlots([]) }
      else setLiveSlots(((data ?? []) as PublicSlot[]).map((row) => ({ time: row.slot_time.slice(0, 5), availableBarberCount: row.available_barbers })))
      setSlotsLoading(false)
    })
    return () => { alive = false }
  }, [businessSlug, selectedBarber, selectedDate, selectedService])
  if (!selectedService) return <Navigate to="/book/services" replace />
  if (!selectedBarber) return <Navigate to="/book/barber" replace />
  const dayAppointments = isSupabaseConfigured ? liveSlots : demoSlots
  const currentTime = new Date().getHours() * 60 + new Date().getMinutes()
  const visibleTimeSlots = dayAppointments.filter(({ time }) => {
    if (selectedDate !== today) return true
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes > currentTime
  })
  const monthName = new Intl.DateTimeFormat('en-NG', { month: 'long', year: 'numeric' }).format(visibleMonth)
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const minMonth = new Date(`${today}T12:00:00`)
  const maxMonth = isoToDate(maxDate)
  const canGoPrevious = visibleMonth.getFullYear() > minMonth.getFullYear() ||
    (visibleMonth.getFullYear() === minMonth.getFullYear() && visibleMonth.getMonth() > minMonth.getMonth())
  const canGoNext = visibleMonth.getFullYear() < maxMonth.getFullYear() ||
    (visibleMonth.getFullYear() === maxMonth.getFullYear() && visibleMonth.getMonth() < maxMonth.getMonth())
  const barberName = selectedBarber === 'any'
    ? 'Any available barber'
    : selectedBarberName ?? 'Selected barber'

  function moveMonth(amount: -1 | 1) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-8 text-stone-900 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link to={bookingPath('barber', businessSlug)} className="inline-flex items-center gap-2 text-sm font-medium text-stone-500 hover:text-emerald-800">
          <span aria-hidden="true">←</span> Change barber
        </Link>

        <div className="mt-8 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
          <span className="grid size-7 place-items-center rounded-full bg-emerald-800 text-white">✓</span>
          <span className="text-emerald-800">Service</span>
          <span className="mx-1 h-px w-8 bg-emerald-300" />
          <span className="grid size-7 place-items-center rounded-full bg-emerald-800 text-white">✓</span>
          <span className="text-emerald-800">Barber</span>
          <span className="mx-1 h-px w-8 bg-emerald-300" />
          <span className="grid size-7 place-items-center rounded-full bg-emerald-800 text-white">3</span>
          <span className="text-emerald-800">Date & time</span>
          <span className="mx-1 h-px w-8 bg-stone-300" />
          <span className="grid size-7 place-items-center rounded-full bg-white text-stone-400 ring-1 ring-stone-200">4</span>
          <span className="text-stone-400">Details</span>
        </div>

        <header className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-emerald-800">Step 3 of 4</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Choose a date and time</h1>
          <p className="mt-2 text-sm leading-6 text-stone-600">Select an open time for your {selectedService.name.toLowerCase()}.</p>
        </header>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-xs text-stone-500">Your booking</p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{selectedService.name} <span className="font-normal text-stone-500">· {selectedService.duration} min</span></p>
          </div>
          <p className="text-sm text-stone-600">{barberName}</p>
        </div>

        <section aria-label="Choose a date" className="mt-5 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-stone-900">Select a date</h2>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Previous month" disabled={!canGoPrevious} onClick={() => moveMonth(-1)} className="grid size-8 place-items-center rounded-lg border border-stone-200 text-lg text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40">‹</button>
              <p aria-live="polite" className="min-w-32 text-center text-sm font-semibold text-stone-800">{monthName}</p>
              <button type="button" aria-label="Next month" disabled={!canGoNext} onClick={() => moveMonth(1)} className="grid size-8 place-items-center rounded-lg border border-stone-200 text-lg text-stone-600 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40">›</button>
            </div>
          </div>

          <div className="grid grid-cols-7">
            {weekdays.map((weekday) => <p key={weekday} className="py-2 text-center text-xs font-medium text-stone-400">{weekday}</p>)}
            {getMonthGrid(visibleMonth).map((date) => {
              const isoDate = dateToIso(date)
              const isDisabled = isoDate < today || isoDate > maxDate
              const isSelected = selectedDate === isoDate
              const isToday = today === isoDate
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth()
              return (
                <button
                  key={isoDate}
                  type="button"
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  aria-label={new Intl.DateTimeFormat('en-NG', { weekday: 'long', month: 'long', day: 'numeric' }).format(date)}
                  onClick={() => {
                    selectDate(isoDate)
                    if (!isCurrentMonth) setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1))
                  }}
                  className={`mx-auto my-1 grid size-9 place-items-center rounded-full text-sm transition ${
                    isSelected
                      ? 'bg-emerald-800 font-semibold text-white'
                      : isDisabled || !isCurrentMonth
                        ? 'text-stone-300 disabled:cursor-not-allowed'
                        : isToday
                          ? 'font-semibold text-emerald-800 ring-1 ring-emerald-700 hover:bg-emerald-50'
                          : 'text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-center text-xs text-stone-400">Bookings are available up to 60 days ahead.</p>
        </section>

        <section aria-label="Available times" className="mt-5 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-semibold text-stone-900">Available times</h2>
              <p className="mt-1 text-sm text-stone-500">{new Intl.DateTimeFormat('en-NG', { weekday: 'long', month: 'long', day: 'numeric' }).format(isoToDate(selectedDate))}</p>
            </div>
            <p className="text-xs text-stone-400">Shop and barber hours</p>
          </div>

          {slotsLoading ? <p className="mt-4 text-sm text-stone-500">Checking live availability…</p> : visibleTimeSlots.length > 0 ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {visibleTimeSlots.map(({ time, availableBarberCount }) => (
                <button
                  key={time}
                  type="button"
                  aria-pressed={selectedTime === time}
                  onClick={() => selectTime(time)}
                  className={`rounded-lg border px-3 py-3 text-sm font-semibold transition ${selectedTime === time ? 'border-emerald-800 bg-emerald-800 text-white' : 'border-stone-200 text-stone-700 hover:border-emerald-600 hover:bg-emerald-50 hover:text-emerald-900'}`}
                >
                  {formatTime(time)}
                  {selectedBarber === 'any' && <span className={`mt-1 block text-[10px] font-normal ${selectedTime === time ? 'text-emerald-100' : 'text-stone-400'}`}>{availableBarberCount} {availableBarberCount === 1 ? 'barber' : 'barbers'} available</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-stone-200 px-4 py-8 text-center">
              <p className="text-sm font-medium text-stone-700">No times available for this date.</p>
              <p className="mt-1 text-xs text-stone-500">{slotsError || 'Choose another day or go back and select any available barber.'}</p>
            </div>
          )}
        </section>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:px-5">
          <div aria-live="polite" aria-atomic="true">
            {selectedTime ? (
              <>
                <p className="text-xs text-stone-500">Selected time</p>
                <p className="mt-1 text-sm font-semibold text-stone-900">{formatTime(selectedTime)}</p>
              </>
            ) : (
              <p className="text-sm text-stone-500">Choose a time to continue.</p>
            )}
          </div>
          <button type="button" disabled={!selectedTime} onClick={() => navigate(bookingPath('details', businessSlug))} className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-300">
            Continue <span aria-hidden="true">→</span>
          </button>
        </div>

        <p className="mt-5 text-center text-xs text-stone-400">{isSupabaseConfigured ? 'Live availability · based on shop hours, barber schedules, and existing appointments' : 'Preview availability · example shop hours are 9:00 AM–6:00 PM'}</p>
      </div>
    </main>
  )
}

export default DateTimeSelectionPage
