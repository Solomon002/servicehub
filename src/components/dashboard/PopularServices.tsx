import { useAppointments } from '../../context/AppointmentContext'

function PopularServices() {
  const { appointments } = useAppointments()
  const totals = appointments.reduce<Record<string, number>>((result, appointment) => {
    if (appointment.status !== 'Cancelled') result[appointment.service] = (result[appointment.service] ?? 0) + 1
    return result
  }, {})
  const popularServices = Object.entries(totals).map(([name, bookings]) => ({ name, bookings })).sort((a, b) => b.bookings - a.bookings).slice(0, 4)
  const busiestServiceCount = Math.max(1, ...popularServices.map((service) => service.bookings))

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-stone-900">Popular services</h3><p className="mt-1 text-sm text-stone-500">Most booked</p></div><span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600">Appointment history</span></div>
      <ol className="mt-6 space-y-5">
        {popularServices.length ? popularServices.map((service, index) => <li key={service.name}><div className="mb-2 flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-stone-100 text-xs font-semibold text-stone-500">{index + 1}</span><span className="truncate text-sm font-medium text-stone-800">{service.name}</span></div><span className="shrink-0 text-sm font-semibold tabular-nums text-stone-700">{service.bookings} <span className="font-normal text-stone-500">bookings</span></span></div><div aria-hidden="true" className="ml-10 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${(service.bookings / busiestServiceCount) * 100}%` }} /></div></li>) : <li className="py-6 text-center text-sm text-stone-500">Services will appear here after bookings come in.</li>}
      </ol>
    </section>
  )
}

export default PopularServices
