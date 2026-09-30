import { useAppointments } from '../../context/AppointmentContext'

function RecentActivity() {
  const { appointments } = useAppointments()
  const latest = [...appointments].sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)).slice(0, 4)

  return (
    <section className="mt-8 rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-4 sm:px-6"><div><h3 className="font-semibold text-stone-900">Recent appointments</h3><p className="mt-1 text-sm text-stone-500">Latest scheduled visits</p></div><span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600">Appointment history</span></div>
      <ol className="divide-y divide-stone-100 px-5 sm:px-6">
        {latest.length ? latest.map((appointment) => <li key={appointment.id} className="flex items-center gap-3 py-4 sm:gap-4"><span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-700">{appointment.status === 'Completed' ? '✓' : '✂'}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-stone-800">{appointment.customer} · {appointment.service}</p><p className="mt-0.5 truncate text-xs text-stone-500">With {appointment.barber} · {appointment.status}</p></div><time className="shrink-0 text-xs text-stone-400">{appointment.date} · {appointment.time}</time></li>) : <li className="py-8 text-center text-sm text-stone-500">Recent appointments will appear here.</li>}
      </ol>
    </section>
  )
}

export default RecentActivity
