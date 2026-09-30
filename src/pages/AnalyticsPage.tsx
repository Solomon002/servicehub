import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAppointments } from '../context/AppointmentContext'
import { useAuth } from '../context/AuthContext'
import { getLocalDate } from '../data/appointments'

const naira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`
const isPaid = (appointment: { paymentStatus?: string; status: string }) => appointment.paymentStatus === 'Paid' || (!appointment.paymentStatus && appointment.status === 'Completed')

function AnalyticsPage() {
  const { appointments, loading, error } = useAppointments()
  const { configured } = useAuth()
  const [range, setRange] = useState<7 | 30 | 90>(30)
  const startDate = useMemo(() => {
    const start = new Date()
    start.setDate(start.getDate() - (range - 1))
    return getLocalDateFor(start)
  }, [range])
  const today = getLocalDate()
  const records = appointments.filter((appointment) => appointment.date >= startDate && appointment.date <= today && appointment.status !== 'Cancelled')
  const paidRecords = records.filter(isPaid)
  const revenue = paidRecords.reduce((sum, appointment) => sum + appointment.price, 0)
  const uniqueCustomers = new Set(records.map((appointment) => appointment.customer.trim().toLowerCase())).size
  const series = Array.from({ length: range }, (_, index) => {
    const date = new Date(`${startDate}T12:00:00`)
    date.setDate(date.getDate() + index)
    const key = getLocalDateFor(date)
    return { date: key, label: new Intl.DateTimeFormat('en-NG', { month: 'short', day: 'numeric' }).format(date), revenue: paidRecords.filter((item) => item.date === key).reduce((sum, item) => sum + item.price, 0) }
  })
  const services = Array.from(records.reduce((map, appointment) => map.set(appointment.service, (map.get(appointment.service) ?? 0) + 1), new Map<string, number>()).entries()).sort((a, b) => b[1] - a[1])
  const barbers = Array.from(paidRecords.reduce((map, appointment) => map.set(appointment.barber, (map.get(appointment.barber) ?? 0) + appointment.price), new Map<string, number>()).entries()).sort((a, b) => b[1] - a[1])
  const maxService = Math.max(1, ...services.map(([, count]) => count))

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-medium text-stone-500">Business performance</p><h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Analytics</h2></div><label className="flex items-center gap-2 text-sm text-stone-600">Period <select aria-label="Analytics period" value={range} onChange={(event) => setRange(Number(event.target.value) as typeof range)} className="rounded-lg border border-stone-300 bg-white px-3 py-2"><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option></select></label></div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">Could not load analytics data: {error}</p>}
      <section aria-label="Performance summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: 'Collected revenue', value: naira(revenue), note: 'Payments marked paid' }, { label: 'Appointments', value: String(records.length), note: 'Excludes cancelled' }, { label: 'Customers', value: String(uniqueCustomers), note: 'Unique names in period' }, { label: 'Average paid booking', value: paidRecords.length ? naira(Math.round(revenue / paidRecords.length)) : naira(0), note: `${paidRecords.length} paid appointments` }].map((item) => <article key={item.label} className="rounded-xl border border-stone-200 bg-white p-5"><p className="text-sm text-stone-500">{item.label}</p><p className="mt-3 text-2xl font-semibold tracking-tight">{loading ? '—' : item.value}</p><p className="mt-2 text-xs text-stone-500">{item.note}</p></article>)}
      </section>
      <div className="mt-7 grid items-start gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5"><h3 className="font-semibold">Collected revenue</h3><p className="mt-1 text-sm text-stone-500">Daily totals for payments marked paid</p></div>{loading ? <div className="grid h-64 place-items-center text-sm text-stone-500">Loading analytics…</div> : paidRecords.length ? <div role="img" aria-label={`Collected revenue chart for the last ${range} days`} className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}><defs><linearGradient id="analyticsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#047857" stopOpacity={0.2} /><stop offset="95%" stopColor="#047857" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e7e5e4" strokeDasharray="4 4" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#78716c' }} interval="preserveStartEnd" /><YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#78716c' }} tickFormatter={(value: number) => `₦${value / 1000}k`} width={52} /><Tooltip formatter={(value) => [naira(Number(value)), 'Collected']} contentStyle={{ borderRadius: 12, borderColor: '#e7e5e4', fontSize: 13 }} /><Area type="monotone" dataKey="revenue" stroke="#047857" strokeWidth={2.5} fill="url(#analyticsFill)" /></AreaChart></ResponsiveContainer></div> : <div className="grid h-64 place-items-center rounded-lg border border-dashed border-stone-200 text-center"><div><p className="text-sm font-medium text-stone-700">No collected revenue in this period</p><p className="mt-1 text-xs text-stone-500">Mark payments as paid to see the trend.</p></div></div>}</section>
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6"><h3 className="font-semibold">Popular services</h3><p className="mt-1 text-sm text-stone-500">Appointments in selected period</p>{services.length ? <ol className="mt-6 space-y-5">{services.map(([name, count], index) => <li key={name}><div className="mb-2 flex items-center justify-between gap-3"><span className="flex items-center gap-3 text-sm font-medium"><span className="grid size-7 place-items-center rounded-lg bg-stone-100 text-xs text-stone-500">{index + 1}</span>{name}</span><span className="text-sm font-semibold text-stone-600">{count}</span></div><div className="ml-10 h-2 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-emerald-700" style={{ width: `${count / maxService * 100}%` }} /></div></li>)}</ol> : <p className="mt-6 rounded-lg bg-stone-50 p-4 text-sm text-stone-500">No appointment data for this period.</p>}</section>
      </div>
      <section className="mt-5 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm"><div className="border-b border-stone-100 px-5 py-4"><h3 className="font-semibold">Barber revenue</h3><p className="mt-1 text-sm text-stone-500">Based on appointments marked paid</p></div>{barbers.length ? <ul className="divide-y divide-stone-100 sm:grid sm:grid-cols-2 sm:divide-y-0">{barbers.map(([name, amount]) => <li key={name} className="flex items-center justify-between px-5 py-4 text-sm"><span className="font-medium">{name}</span><span className="font-semibold tabular-nums">{naira(amount)}</span></li>)}</ul> : <p className="px-5 py-8 text-center text-sm text-stone-500">No paid appointments in this period.</p>}</section>
      <p className="mt-4 text-xs text-stone-400">{loading ? 'Loading appointment and payment records…' : configured ? 'Calculated from appointment and payment records for this shop.' : 'Preview metrics · based on sample appointment records, not shop data.'}</p>
    </main>
  )
}

function getLocalDateFor(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default AnalyticsPage
