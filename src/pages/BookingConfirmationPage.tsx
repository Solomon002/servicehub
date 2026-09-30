import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { useBookingFlow } from '../context/BookingFlowContext'
import { bookingPath } from '../lib/bookingRoute'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

function BookingConfirmationPage() {
  const { confirmedAppointment, businessSlug } = useBookingFlow()
  const [shopName, setShopName] = useState('Your barbershop')
  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return
    let alive = true
    supabase.rpc('get_public_business', { p_slug: businessSlug }).then(({ data }) => { if (alive && data?.[0]?.name) setShopName(data[0].name) })
    return () => { alive = false }
  }, [businessSlug])
  if (!confirmedAppointment) return <Navigate to="/book/services" replace />

  const appointmentDate = new Date(`${confirmedAppointment.date}T12:00:00`)
  const formattedDate = new Intl.DateTimeFormat('en-NG', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(appointmentDate)
  const [hours, minutes] = confirmedAppointment.time.split(':').map(Number)
  appointmentDate.setHours(hours, minutes, 0, 0)
  const formattedTime = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(appointmentDate)

  return (
    <main className="min-h-screen bg-stone-100 px-5 py-12 text-stone-900">
      <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-white p-7 text-center shadow-sm sm:p-10">
        <div aria-hidden="true" className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-100 text-2xl font-semibold text-emerald-800">✓</div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-800">{shopName}</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Booking request received</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">Your appointment is pending. The shop will confirm it shortly.</p>

        <div className="mt-7 divide-y divide-stone-200 rounded-xl bg-stone-50 px-5 text-left">
          <div className="py-4"><p className="text-xs text-stone-500">Service</p><p className="mt-1 font-semibold">{confirmedAppointment.service}</p></div>
          <div className="grid grid-cols-2 gap-4 py-4"><div><p className="text-xs text-stone-500">Date</p><p className="mt-1 text-sm font-semibold">{formattedDate}</p></div><div><p className="text-xs text-stone-500">Time</p><p className="mt-1 text-sm font-semibold">{formattedTime}</p></div></div>
          <div className="grid grid-cols-2 gap-4 py-4"><div><p className="text-xs text-stone-500">Barber</p><p className="mt-1 text-sm font-semibold">{confirmedAppointment.barber}</p></div><div><p className="text-xs text-stone-500">Total</p><p className="mt-1 text-sm font-semibold">₦{confirmedAppointment.price.toLocaleString('en-NG')}</p></div></div>
          <div className="py-4"><p className="text-xs text-stone-500">Booked for</p><p className="mt-1 text-sm font-semibold">{confirmedAppointment.customer}</p><p className="mt-1 text-sm text-stone-600">{confirmedAppointment.customerPhone}</p></div>
          <div className="flex items-center justify-between py-4"><p className="text-xs text-stone-500">Status</p><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">{confirmedAppointment.status}</span></div>
        </div>
        <Link to={bookingPath('services', businessSlug)} className="mt-7 inline-flex rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">Book another appointment</Link>
      </div>
    </main>
  )
}

export default BookingConfirmationPage
