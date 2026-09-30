import { Link } from 'react-router'
import { useAppointments } from '../context/AppointmentContext'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { getLocalDate } from '../data/appointments'

function BarberWorkspacePage() {
  const { appointments, loading, error } = useAppointments()
  const { business, barberId, user } = useAuth()
  const { barbers } = useCatalog()
  const barber = barbers.find((item) => item.id === barberId)
  const name = barber?.name ?? String(user?.user_metadata?.full_name ?? user?.email ?? 'Barber').split(' ')[0]
  const today = getLocalDate()
  const now = new Date()
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const todayAppointments = appointments.filter((item) => item.date === today && item.status !== 'Cancelled').sort((a, b) => a.time.localeCompare(b.time))
  const upcoming = appointments.filter((item) => item.status !== 'Cancelled' && (item.date > today || (item.date === today && item.time >= nowTime))).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).slice(0, 5)

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-sm font-medium text-stone-500">{business?.name ?? 'Your shop'}</p><h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Welcome, {name}</h2><p className="mt-2 text-sm text-stone-600">Here’s your personal schedule and upcoming appointments.</p></div>
        <Link to="/calendar" className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">Open calendar</Link>
      </div>

      {error && <p role="alert" className="mb-5 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">Could not load your schedule: {error}</p>}
      <section aria-label="Your appointment summary" className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-stone-500">Your appointments today</p><p className="mt-3 text-3xl font-semibold tabular-nums">{loading ? '—' : todayAppointments.length}</p><p className="mt-2 text-xs text-stone-500">Assigned to your barber account</p></article>
        <article className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-stone-500">Upcoming appointments</p><p className="mt-3 text-3xl font-semibold tabular-nums">{loading ? '—' : upcoming.length}</p><p className="mt-2 text-xs text-stone-500">Your next scheduled visits</p></article>
      </section>

      <section className="mt-7 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4"><div><h3 className="font-semibold">Your upcoming schedule</h3><p className="mt-1 text-sm text-stone-500">Only appointments assigned to your barber account are shown.</p></div><Link to="/appointments" className="text-sm font-semibold text-emerald-800 hover:text-emerald-950">All my appointments →</Link></div>
        {upcoming.length ? <ul className="divide-y divide-stone-100">{upcoming.map((appointment) => <li key={appointment.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center"><time className="text-sm font-semibold tabular-nums text-stone-700">{appointment.date} · {new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit' }).format(new Date(`2000-01-01T${appointment.time}:00`))}</time><div className="min-w-0"><p className="truncate text-sm font-semibold text-stone-900">{appointment.customer}</p><p className="mt-0.5 truncate text-sm text-stone-500">{appointment.service}{appointment.customerPhone ? ` · ${appointment.customerPhone}` : ''}</p></div><span className="w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">{appointment.status}</span></li>)}</ul> : <div className="px-5 py-12 text-center text-sm text-stone-500">{loading ? 'Loading your schedule…' : 'You have no upcoming appointments.'}</div>}
      </section>
    </main>
  )
}

export default BarberWorkspacePage
