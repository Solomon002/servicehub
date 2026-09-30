import { useMemo, useState } from 'react'
import AppointmentFormDialog from '../components/appointments/AppointmentFormDialog'
import { useAppointments } from '../context/AppointmentContext'
import { useAuth } from '../context/AuthContext'
import {
  allowedAppointmentStatuses,
  getLocalDate,
  type Appointment,
  type AppointmentStatus,
} from '../data/appointments'

const statusStyles: Record<AppointmentStatus, string> = {
  Pending: 'bg-amber-50 text-amber-800',
  Confirmed: 'bg-emerald-50 text-emerald-800',
  Completed: 'bg-blue-50 text-blue-800',
  Cancelled: 'bg-stone-100 text-stone-600',
}

const formatNaira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`

function formatAppointmentDate(date: string) {
  return new Intl.DateTimeFormat('en-NG', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T12:00:00`))
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en-NG', { hour: 'numeric', minute: '2-digit' }).format(date)
}

function AppointmentsPage() {
  const { appointments, addAppointment, updateAppointmentStatus, loading, error } = useAppointments()
  const { role, configured, business } = useAuth()
  const canManage = role === 'owner' || !configured
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<'today' | 'all'>('today')
  const [statusFilter, setStatusFilter] = useState<'All statuses' | AppointmentStatus>('All statuses')
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [actionError, setActionError] = useState('')

  const visibleAppointments = useMemo(() => {
    const query = search.trim().toLowerCase()
    return appointments
      .filter((appointment) => dateFilter === 'all' || appointment.date === getLocalDate())
      .filter((appointment) => statusFilter === 'All statuses' || appointment.status === statusFilter)
      .filter((appointment) =>
        `${appointment.customer} ${appointment.service} ${appointment.barber}`.toLowerCase().includes(query),
      )
      .sort((first, second) => first.date.localeCompare(second.date) || first.time.localeCompare(second.time))
  }, [appointments, dateFilter, search, statusFilter])

  async function updateStatus(appointment: Appointment, status: AppointmentStatus) {
    setActionError('')
    try { await updateAppointmentStatus(appointment.id, status); setMessage(`${appointment.customer}'s appointment marked ${status.toLowerCase()}.`) }
    catch (caught) { setActionError(caught instanceof Error ? caught.message : 'Could not update appointment.') }
  }

  function openAddForm() {
    setIsAddFormOpen(true)
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-500">{business?.name ?? 'Appointments'}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Appointments</h2>
          <p className="mt-2 text-sm text-stone-600">Review bookings and keep their status up to date.</p>
        </div>
        {canManage && <button type="button" onClick={openAddForm} className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800">
          + New appointment
        </button>}
      </div>

      <p role="status" aria-live="polite" className="sr-only">{message}</p>
      {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">Could not load appointments: {error}</p>}
      {actionError && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{actionError}</p>}

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-stone-100 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg bg-stone-100 p-1">
              <button type="button" aria-pressed={dateFilter === 'today'} onClick={() => setDateFilter('today')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${dateFilter === 'today' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>Today</button>
              <button type="button" aria-pressed={dateFilter === 'all'} onClick={() => setDateFilter('all')} className={`rounded-md px-3 py-1.5 text-sm font-medium ${dateFilter === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>All dates</button>
            </div>
            <span className="text-sm text-stone-500">{visibleAppointments.length} appointments</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
            <label>
              <span className="sr-only">Search appointments</span>
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, service, or barber" className="w-full rounded-lg border border-stone-200 px-3 py-2.5 text-sm outline-none placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label>
              <span className="sr-only">Filter by appointment status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'All statuses' | AppointmentStatus)} className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-700 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100">
                <option>All statuses</option>
                <option>Pending</option>
                <option>Confirmed</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
            </label>
          </div>
        </div>

        {visibleAppointments.length > 0 ? (
          <ul aria-label="Appointment list" className="divide-y divide-stone-100">
            {visibleAppointments.map((appointment) => (
              <li key={appointment.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 sm:px-5">
                <div className="w-24 shrink-0">
                  <p className="text-sm font-semibold tabular-nums text-stone-900">{formatTime(appointment.time)}</p>
                  <p className="mt-1 text-xs text-stone-500">{formatAppointmentDate(appointment.date)}</p>
                </div>
                <div className="min-w-[130px] flex-1">
                  <p className="truncate text-sm font-semibold text-stone-900">{appointment.customer}</p>
                  <p className="mt-1 truncate text-sm text-stone-600">{appointment.service} <span className="text-stone-300">·</span> {appointment.barber}</p>
                </div>
                <p className="ml-auto shrink-0 text-sm font-semibold tabular-nums text-stone-800">{formatNaira(appointment.price)}</p>
                <label className="sr-only" htmlFor={`status-${appointment.id}`}>Status for {appointment.customer}'s {appointment.service}</label>
                <select
                  id={`status-${appointment.id}`}
                  value={appointment.status}
                  onChange={(event) => updateStatus(appointment, event.target.value as AppointmentStatus)}
                  className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 ${statusStyles[appointment.status]}`}
                >
                  {allowedAppointmentStatuses(appointment.status, role === 'owner').map((status) => <option key={status}>{status}</option>)}
                </select>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-6 py-14 text-center">
            <h3 className="font-semibold text-stone-800">{loading ? 'Loading appointments…' : 'No appointments found'}</h3>
            {!loading && <p className="mt-1 text-sm text-stone-500">Try changing your filters or add a new appointment.</p>}
          </div>
      )}
      <p className="border-t border-stone-100 px-5 py-3 text-xs text-stone-400">{configured ? 'Appointment records are stored in your shop database.' : 'Preview data · changes are session-only and are not stored in a shop database.'}</p>
      </section>

      {isAddFormOpen && (
        <AppointmentFormDialog
          appointments={appointments}
          onCancel={() => setIsAddFormOpen(false)}
          onSave={async (appointment) => {
            try {
              await addAppointment(appointment)
              setSearch('')
              setDateFilter('all')
              setStatusFilter('All statuses')
              setMessage(`Appointment for ${appointment.customer} added as pending.`)
              setIsAddFormOpen(false)
            } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Could not create appointment.'); throw caught }
          }}
        />
      )}
    </main>
  )
}

export default AppointmentsPage
