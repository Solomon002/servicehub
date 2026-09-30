import { useState } from 'react'
import { Link } from 'react-router'
import AppointmentFormDialog from '../components/appointments/AppointmentFormDialog'
import { useAppointments } from '../context/AppointmentContext'
import { useAuth } from '../context/AuthContext'
import { allowedAppointmentStatuses, appointmentServices, getLocalDate, type Appointment, type AppointmentStatus } from '../data/appointments'

type CalendarView = 'Day' | 'Week' | 'Month'

const statusStyles: Record<AppointmentStatus, string> = {
  Pending: 'bg-amber-50 text-amber-800',
  Confirmed: 'bg-emerald-50 text-emerald-800',
  Completed: 'bg-blue-50 text-blue-800',
  Cancelled: 'bg-stone-100 text-stone-600',
}

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

function startOfWeek(date: Date) {
  const weekdayFromMonday = (date.getDay() + 6) % 7
  return addDays(date, -weekdayFromMonday)
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date)
}

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat('en-NG', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(date)
}

function formatAppointmentDate(date: string) {
  return new Intl.DateTimeFormat('en-NG', { weekday: 'short', month: 'short', day: 'numeric' }).format(isoToDate(date))
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat('en-NG', { month: 'short', day: 'numeric' }).format(date)
}

function getMonthGrid(date: Date) {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  const firstCell = addDays(firstOfMonth, -((firstOfMonth.getDay() + 6) % 7))
  return Array.from({ length: 42 }, (_, index) => addDays(firstCell, index))
}

function CalendarPage() {
  const { appointments, addAppointment, updateAppointmentStatus, loading, error } = useAppointments()
  const { role, configured, business } = useAuth()
  const canManage = role === 'owner' || !configured
  const [view, setView] = useState<CalendarView>('Day')
  const [selectedDate, setSelectedDate] = useState(getLocalDate())
  const [formValues, setFormValues] = useState<Partial<Pick<Appointment, 'date' | 'time'>> | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [actionError, setActionError] = useState('')

  const selectedDateObject = isoToDate(selectedDate)
  const selectedMonth = new Intl.DateTimeFormat('en-NG', { month: 'long', year: 'numeric' }).format(selectedDateObject)

  function moveCalendar(direction: -1 | 1) {
    let next: Date
    if (view === 'Month') {
      next = new Date(selectedDateObject.getFullYear(), selectedDateObject.getMonth() + direction, 1)
    } else {
      next = new Date(selectedDateObject)
      next.setDate(next.getDate() + direction * (view === 'Week' ? 7 : 1))
    }
    setSelectedDate(dateToIso(next))
  }

  function openNewAppointment(date: string, time: string) {
    if (!canManage) return
    setFormValues({ date, time })
  }

  function appointmentsOn(date: string) {
    return appointments
      .filter((appointment) => appointment.date === date)
      .sort((first, second) => first.time.localeCompare(second.time))
  }

  const dayAppointments = appointmentsOn(selectedDate)
  const standardSlots = Array.from({ length: 18 }, (_, index) => {
    const minutes = 9 * 60 + index * 30
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  })
  const daySlots = [...new Set([...standardSlots, ...dayAppointments.map((appointment) => appointment.time)])]
    .sort((first, second) => first.localeCompare(second))

  async function changeAppointmentStatus(appointment: Appointment, status: AppointmentStatus) {
    setActionError('')
    try {
      await updateAppointmentStatus(appointment.id, status)
      setSelectedAppointment({ ...appointment, status })
    } catch (caught) { setActionError(caught instanceof Error ? caught.message : 'Could not update appointment status.') }
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-500">{business?.name ?? 'Calendar'}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Calendar</h2>
          <p className="mt-2 text-sm text-stone-600">{canManage ? 'Review the schedule and book an open time.' : 'Review your assigned appointments.'}</p>
        </div>
        <Link to="/appointments" className="text-sm font-semibold text-emerald-800 hover:text-emerald-900">Open appointments list →</Link>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">Could not load calendar appointments: {error}</p>}
      {actionError && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{actionError}</p>}

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-100 p-4 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous period" onClick={() => moveCalendar(-1)} className="grid size-9 place-items-center rounded-lg border border-stone-200 text-lg text-stone-600 hover:bg-stone-50">‹</button>
            <button type="button" onClick={() => setSelectedDate(getLocalDate())} className="rounded-lg border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">Today</button>
            <button type="button" aria-label="Next period" onClick={() => moveCalendar(1)} className="grid size-9 place-items-center rounded-lg border border-stone-200 text-lg text-stone-600 hover:bg-stone-50">›</button>
            <h3 className="ml-2 text-sm font-semibold text-stone-900 sm:text-base">
              {view === 'Day' ? formatFullDate(selectedDateObject) : view === 'Week' ? `${formatShortDate(startOfWeek(selectedDateObject))} – ${formatShortDate(addDays(startOfWeek(selectedDateObject), 6))}` : selectedMonth}
            </h3>
          </div>
          <div className="inline-flex rounded-lg bg-stone-100 p-1" aria-label="Calendar view">
            {(['Day', 'Week', 'Month'] as CalendarView[]).map((option) => (
              <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)} className={`rounded-md px-3 py-1.5 text-sm font-medium ${view === option ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>
                {option}
              </button>
            ))}
          </div>
        </div>

        {view === 'Day' && (
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-5 py-3">
              <p className="text-sm font-medium text-stone-700">{dayAppointments.length} appointments</p>
              <p className="text-xs text-stone-500">Shop hours · 9:00 AM – 6:00 PM</p>
            </div>
            <ol aria-label={`Schedule for ${formatFullDate(selectedDateObject)}`} className="divide-y divide-stone-100 px-4 sm:px-5">
              {daySlots.map((time) => {
                const timeAppointments = dayAppointments.filter((appointment) => appointment.time === time)
                return (
                  <li key={time} className="flex min-h-16 gap-3 py-2.5 sm:gap-5">
                    <time className="w-20 shrink-0 pt-2 text-xs font-semibold tabular-nums text-stone-500 sm:w-24 sm:text-sm">{formatTime(time)}</time>
                    <div className="min-w-0 flex-1 space-y-2">
                      {timeAppointments.length > 0 ? timeAppointments.map((appointment) => (
                        <button key={appointment.id} type="button" onClick={() => setSelectedAppointment(appointment)} className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-left hover:border-emerald-300 hover:bg-emerald-50">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-stone-900">{appointment.customer} <span className="font-normal text-stone-500">· {appointment.service}</span></span>
                            <span className="mt-0.5 block truncate text-xs text-stone-500">{appointment.barber}</span>
                          </span>
                          <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusStyles[appointment.status]}`}>{appointment.status}</span>
                        </button>
                      )) : (
                        <button type="button" onClick={() => openNewAppointment(selectedDate, time)} className="group flex min-h-10 w-full items-center rounded-lg border border-dashed border-stone-200 px-3 text-left text-xs text-stone-400 hover:border-emerald-300 hover:bg-emerald-50/50 hover:text-emerald-800">
                          <span className="opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">+ Create appointment</span>
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
            {dayAppointments.length === 0 && (
              <p className="border-t border-stone-100 px-5 py-3 text-xs text-stone-400">No appointments booked yet for this day.</p>
            )}
          </div>
        )}

        {view === 'Week' && (
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {Array.from({ length: 7 }, (_, index) => {
              const date = addDays(startOfWeek(selectedDateObject), index)
              const isoDate = dateToIso(date)
              const items = appointmentsOn(isoDate)
              const isSelected = isoDate === selectedDate
              return (
                <section key={isoDate} className={`min-w-0 rounded-lg border ${isSelected ? 'border-emerald-200 bg-emerald-50/40' : 'border-stone-200'}`}>
                  <button type="button" onClick={() => { setSelectedDate(isoDate); setView('Day') }} className="w-full border-b border-stone-100 p-3 text-left hover:bg-stone-50">
                    <p className="text-xs font-medium text-stone-500">{new Intl.DateTimeFormat('en-NG', { weekday: 'short' }).format(date)}</p>
                    <p className={`mt-1 text-sm font-semibold ${isSelected ? 'text-emerald-800' : 'text-stone-900'}`}>{formatShortDate(date)}</p>
                    <p className="mt-1 text-xs text-stone-500">{items.length} bookings</p>
                  </button>
                  <ul className="space-y-2 p-2">
                    {items.slice(0, 3).map((appointment) => (
                      <li key={appointment.id}>
                        <button type="button" onClick={() => setSelectedAppointment(appointment)} className="w-full rounded-md border-l-2 border-emerald-700 bg-emerald-50 px-2 py-1.5 text-left hover:bg-emerald-100">
                          <span className="block truncate text-[11px] font-semibold text-stone-800">{formatTime(appointment.time)} · {appointment.customer}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-stone-500">{appointment.service}</span>
                        </button>
                      </li>
                    ))}
                    {items.length > 3 && <li className="px-1 text-[11px] text-stone-500">+{items.length - 3} more</li>}
                    {items.length === 0 && <li className="px-1 py-2 text-[11px] text-stone-400">No bookings</li>}
                  </ul>
                  <button type="button" onClick={() => openNewAppointment(isoDate, '09:00')} className="m-2 mt-0 w-[calc(100%-1rem)] rounded-md px-2 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50">+ Add</button>
                </section>
              )
            })}
          </div>
        )}

        {view === 'Month' && (
          <div className="overflow-x-auto">
            <div className="min-w-[620px]">
              <div className="grid grid-cols-7 border-b border-stone-100 bg-stone-50">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <p key={day} className="py-3 text-center text-xs font-semibold text-stone-500">{day}</p>)}
              </div>
              <div className="grid grid-cols-7">
                {getMonthGrid(selectedDateObject).map((date) => {
                  const isoDate = dateToIso(date)
                  const items = appointmentsOn(isoDate)
                  const isCurrentMonth = date.getMonth() === selectedDateObject.getMonth()
                  const isSelected = isoDate === selectedDate
                  return (
                    <button key={isoDate} type="button" onClick={() => { setSelectedDate(isoDate); setView('Day') }} className={`min-h-20 border-b border-r border-stone-100 p-2 text-left hover:bg-emerald-50/50 ${!isCurrentMonth ? 'bg-stone-50/60 text-stone-400' : 'text-stone-700'}`}>
                      <span className={`grid size-6 place-items-center rounded-full text-xs ${isSelected ? 'bg-emerald-800 font-semibold text-white' : ''}`}>{date.getDate()}</span>
                      {items.length > 0 && <span className="mt-2 block truncate text-[10px] font-medium text-emerald-800">{items.length} {items.length === 1 ? 'booking' : 'bookings'}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <p className="mt-4 text-xs text-stone-400">{loading ? 'Loading appointments…' : configured ? 'Shop appointments · Availability is checked against the database.' : 'Preview appointments · Open slots use preview shop hours'}</p>

      {formValues && canManage && (
        <AppointmentFormDialog
          key={`${formValues.date}-${formValues.time}`}
          appointments={appointments}
          initialValues={formValues}
          onCancel={() => setFormValues(null)}
          onSave={async (appointment) => {
            await addAppointment(appointment)
            setFormValues(null)
          }}
        />
      )}

      {selectedAppointment && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-stone-950/40 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="appointment-details-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{formatAppointmentDate(selectedAppointment.date)}</p>
                <h3 id="appointment-details-title" className="mt-1 text-lg font-semibold text-stone-900">{selectedAppointment.customer}</h3>
              </div>
              <button type="button" aria-label="Close" onClick={() => setSelectedAppointment(null)} className="grid size-8 place-items-center rounded-lg text-xl text-stone-500 hover:bg-stone-100">×</button>
            </div>
            <dl className="mt-5 divide-y divide-stone-100 rounded-lg border border-stone-100 px-4">
              <div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-stone-500">Time</dt><dd className="font-medium text-stone-800">{formatTime(selectedAppointment.time)}</dd></div>
              <div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-stone-500">Service</dt><dd className="text-right font-medium text-stone-800">{selectedAppointment.service} · {appointmentServices.find((item) => item.name === selectedAppointment.service)?.duration ?? 30} min</dd></div>
              <div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-stone-500">Barber</dt><dd className="font-medium text-stone-800">{selectedAppointment.barber}</dd></div>
              <div className="flex justify-between gap-4 py-3 text-sm"><dt className="text-stone-500">Price</dt><dd className="font-medium text-stone-800">₦{selectedAppointment.price.toLocaleString('en-NG')}</dd></div>
            </dl>
            <label className="mt-5 block text-sm font-medium text-stone-700">
              Appointment status
              <select value={selectedAppointment.status} onChange={(event) => changeAppointmentStatus(selectedAppointment, event.target.value as AppointmentStatus)} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100">
                {allowedAppointmentStatuses(selectedAppointment.status, role === 'owner').map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setSelectedAppointment(null)} className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">Done</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default CalendarPage
