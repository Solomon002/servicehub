import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import PopularServices from '../components/dashboard/PopularServices'
import RecentActivity from '../components/dashboard/RecentActivity'
import RevenueChart from '../components/dashboard/RevenueChart'
import { useAppointments } from '../context/AppointmentContext'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { getLocalDate } from '../data/appointments'
import { supabase } from '../lib/supabase'

const cardStyles = ['bg-blue-50 text-blue-700', 'bg-emerald-50 text-emerald-700', 'bg-violet-50 text-violet-700', 'bg-amber-50 text-amber-700']

function DashboardPage() {
  const { appointments, loading, error } = useAppointments()
  const { user, business, configured } = useAuth()
  const { barbers } = useCatalog()
  const [customerCount, setCustomerCount] = useState<number | null>(configured ? null : 342)
  const todayKey = getLocalDate()
  const today = new Intl.DateTimeFormat('en-NG', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(`${todayKey}T12:00:00`))
  const todayAppointments = appointments.filter((item) => item.date === todayKey && item.status !== 'Cancelled').sort((a, b) => a.time.localeCompare(b.time))
  const todayRevenue = todayAppointments.filter((item) => item.status === 'Completed' && item.paymentStatus === 'Paid').reduce((sum, item) => sum + item.price, 0)

  useEffect(() => {
    if (!configured || !supabase || !business) return
    let alive = true
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', business.id).then(({ count }) => {
      if (alive) setCustomerCount(count ?? 0)
    })
    return () => { alive = false }
  }, [business, configured])

  const summaryCards = [
    { label: "Today's bookings", value: loading ? '—' : String(todayAppointments.length), detail: 'Scheduled for today', icon: '▦' },
    { label: "Today's revenue", value: loading ? '—' : `₦${todayRevenue.toLocaleString('en-NG')}`, detail: 'Paid, completed appointments', icon: '₦' },
    { label: 'Total customers', value: customerCount === null ? '—' : customerCount.toLocaleString('en-NG'), detail: 'In your customer list', icon: '♙' },
    { label: 'Active barbers', value: String(barbers.filter((barber) => barber.active).length), detail: 'On your team', icon: '✂' },
  ]
  const greetingName = String(user?.user_metadata?.full_name ?? '').trim().split(/\s+/)[0] || business?.name || 'there'

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-stone-500">{today}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Good morning, {greetingName} <span aria-hidden="true">👋</span></h2>
          <p className="mt-2 text-sm text-stone-600">Here's what's happening at your shop today.</p>
        </div>
        <span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-500">
          {configured ? business?.name ?? 'Your business' : 'Sample business data'}
        </span>
      </div>

      {error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">Dashboard data could not be fully loaded: {error}</p>}
      <section aria-label="Today's summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card, index) => (
          <article key={card.label} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-stone-500">{card.label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">{card.value}</p></div><span aria-hidden="true" className={`grid size-10 shrink-0 place-items-center rounded-lg text-lg font-semibold ${cardStyles[index]}`}>{card.icon}</span></div>
            <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-stone-500">{card.detail}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 sm:px-6"><div><h3 className="font-semibold text-stone-900">Today's appointments</h3><p className="mt-1 text-sm text-stone-500">Your next visits for the day</p></div><Link to="/appointments" className="text-sm font-semibold text-emerald-800 hover:text-emerald-900">View all appointments <span aria-hidden="true">→</span></Link></div>
        {todayAppointments.length ? <ul aria-label="Today's appointments" className="divide-y divide-stone-100">
          {todayAppointments.map((appointment) => <li key={appointment.id} className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-4 sm:grid-cols-[96px_minmax(0,1fr)_minmax(140px,0.7fr)_auto] sm:px-6"><time className="text-sm font-semibold tabular-nums text-stone-700">{new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(`${todayKey}T${appointment.time}:00`))}</time><div className="min-w-0"><p className="truncate text-sm font-semibold text-stone-900">{appointment.customer}</p><p className="mt-0.5 truncate text-sm text-stone-500">{appointment.service}</p><p className="mt-1 truncate text-xs text-stone-400 sm:hidden">{appointment.barber}</p></div><p className="hidden truncate text-sm text-stone-600 sm:block">{appointment.barber}</p><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${appointment.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-800' : appointment.status === 'Completed' ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'}`}>{appointment.status}</span></li>)}
        </ul> : <div className="px-5 py-10 text-center text-sm text-stone-500">{loading ? 'Loading appointments…' : 'No appointments scheduled for today.'}</div>}
      </section>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,1fr)]"><RevenueChart /><PopularServices /></div>
      <RecentActivity />
    </main>
  )
}

export default DashboardPage
