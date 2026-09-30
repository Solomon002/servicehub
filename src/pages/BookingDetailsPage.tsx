import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAppointments } from '../context/AppointmentContext'
import { useBookingFlow } from '../context/BookingFlowContext'
import { getAvailableBarbers, type Appointment } from '../data/appointments'
import { startingBarbers } from '../data/barbers'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { bookingPath } from '../lib/bookingRoute'

function BookingDetailsPage() {
  const { appointments, addAppointment } = useAppointments()
  const {
    selectedService,
    selectedBarber,
    selectedDate,
    selectedTime,
    selectedBarberName,
    businessSlug,
    setConfirmedAppointment,
  } = useBookingFlow()
  const { configured } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!selectedService) return <Navigate to="/book/services" replace />
  if (!selectedBarber) return <Navigate to="/book/barber" replace />
  if (!selectedTime) return <Navigate to="/book/date-time" replace />

  const service = selectedService
  const barberChoice = selectedBarber
  const time = selectedTime

  const date = new Date(`${selectedDate}T12:00:00`)
  const availableBarbers = getAvailableBarbers(selectedDate, time, service.name, appointments, barberChoice)
  const preferredBarber = barberChoice === 'any'
    ? [...availableBarbers].sort((a, b) => {
        const aCount = appointments.filter((item) => item.date === selectedDate && item.barber === a.name && item.status !== 'Cancelled').length
        const bCount = appointments.filter((item) => item.date === selectedDate && item.barber === b.name && item.status !== 'Cancelled').length
        return aCount - bCount
      })[0]
    : availableBarbers[0]

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!configured && !preferredBarber) {
      setError('That time was just booked. Please choose another available time.')
      return
    }
    setIsSubmitting(true)
    try {
    let appointment: Appointment
    if (configured) {
      if (!supabase || !service.id) throw new Error('Booking service is not available. Please go back and choose it again.')
      const { data, error: bookingError } = await supabase.rpc('create_public_booking', {
        p_slug: businessSlug,
        p_service_id: service.id,
        p_barber_id: barberChoice === 'any' ? null : barberChoice,
        p_date: selectedDate,
        p_time: time,
        p_customer_name: name.trim(),
        p_customer_phone: phone.trim(),
      })
      if (bookingError) throw bookingError
      const created = data?.[0]
      if (!created) throw new Error('The booking service did not return a confirmation. Try another time.')
      appointment = { id: created.appointment_id, customer: name.trim(), customerPhone: phone.trim(), service: created.service_name, barber: created.barber_name, date: created.appointment_date, time: created.starts_at.slice(0, 5), price: Number(created.price_ngn), status: 'Pending' }
    } else appointment = await addAppointment({
      customer: name.trim(),
      customerPhone: phone.trim(),
      service: service.name,
      barber: preferredBarber.name,
      date: selectedDate,
      time,
      price: service.price,
      status: 'Pending',
    })
    setConfirmedAppointment(appointment)
    navigate(bookingPath('confirmation', businessSlug))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the booking. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-8 text-stone-900 sm:py-12">
      <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <Link to={bookingPath('date-time', businessSlug)} className="text-sm font-medium text-stone-500 hover:text-emerald-800">← Change date or time</Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-800">Step 4 of 4</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your details</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">Add your contact information to request this appointment.</p>

        <div className="mt-6 divide-y divide-stone-200 rounded-lg bg-stone-50 px-4">
          <div className="py-3"><p className="text-xs text-stone-500">Service</p><p className="mt-1 font-semibold">{service.name}</p><p className="mt-1 text-sm text-stone-600">{service.duration} min · ₦{service.price.toLocaleString('en-NG')}</p></div>
          <div className="py-3"><p className="text-xs text-stone-500">Barber</p><p className="mt-1 font-semibold">{configured ? (selectedBarberName ?? 'Any available barber') : preferredBarber?.name ?? (barberChoice === 'any' ? 'Any available barber' : startingBarbers.find((barber) => barber.id === barberChoice)?.name)}</p></div>
          <div className="py-3"><p className="text-xs text-stone-500">Date and time</p><p className="mt-1 font-semibold">{new Intl.DateTimeFormat('en-NG', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)}</p><p className="mt-1 text-sm text-stone-600">{new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(`${selectedDate}T${selectedTime}:00`))}</p></div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submitBooking}>
          {!configured && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">Preview mode: this booking will not reach a shop. Do not enter real customer details.</p>}
          <div>
            <label htmlFor="customer-name" className="mb-1.5 block text-sm font-medium text-stone-700">Full name</label>
            <input id="customer-name" autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" placeholder="e.g. David Smith" />
          </div>
          <div>
            <label htmlFor="customer-phone" className="mb-1.5 block text-sm font-medium text-stone-700">Phone number</label>
            <input id="customer-phone" type="tel" inputMode="tel" autoComplete="tel" required minLength={7} maxLength={20} pattern="[0-9+() -]{7,20}" title="Enter a phone number using digits, spaces, +, parentheses, or hyphens." value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" placeholder="e.g. 080 1234 5678" />
          </div>
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error} <Link to={bookingPath('date-time', businessSlug)} className="font-semibold underline">Choose another time</Link></p>}
          <button type="submit" disabled={(!configured && !preferredBarber) || isSubmitting} className="w-full rounded-lg bg-emerald-800 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-stone-300">{isSubmitting ? 'Saving booking…' : `Confirm booking · ₦${service.price.toLocaleString('en-NG')}`}</button>
          <p className="text-center text-xs text-stone-400">Your appointment request will be marked pending until the shop confirms it.</p>
        </form>
      </div>
    </main>
  )
}

export default BookingDetailsPage
