import { useMemo, useState } from 'react'
import { useAppointments } from '../context/AppointmentContext'
import { useAuth } from '../context/AuthContext'

const currency = (amount: number) => `₦${amount.toLocaleString('en-NG')}`
const paid = (appointment: { paymentStatus?: string; status: string }) => appointment.paymentStatus === 'Paid' || (!appointment.paymentStatus && appointment.status === 'Completed')

function PaymentsPage() {
  const { appointments, updatePaymentStatus, loading, error } = useAppointments()
  const { configured } = useAuth()
  const [filter, setFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All')
  const [actionError, setActionError] = useState('')
  const eligible = useMemo(() => appointments.filter((appointment) => appointment.status !== 'Cancelled'), [appointments])
  const collected = eligible.filter(paid).reduce((sum, appointment) => sum + appointment.price, 0)
  const outstanding = eligible.filter((appointment) => !paid(appointment)).reduce((sum, appointment) => sum + appointment.price, 0)
  const visible = eligible.filter((appointment) => filter === 'All' || (paid(appointment) ? 'Paid' : 'Unpaid') === filter)
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))

  async function togglePayment(appointmentId: string, nextStatus: 'Paid' | 'Unpaid') {
    setActionError('')
    try { await updatePaymentStatus(appointmentId, nextStatus) }
    catch (caught) { setActionError(caught instanceof Error ? caught.message : 'Could not update this payment.') }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-6 sm:py-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-medium text-stone-500">Track appointment payments</p><h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Payments</h2></div><span className="rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-500">{configured ? 'Shop records · NGN' : 'Preview records · NGN'}</span></div>
      {error && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">Could not load payment records: {error}</p>}
      {actionError && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">{actionError}</p>}
      <section aria-label="Payment totals" className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-stone-200 bg-white p-5"><p className="text-sm text-stone-500">Collected</p><p className="mt-3 text-2xl font-semibold">{currency(collected)}</p><p className="mt-2 text-xs text-stone-500">Marked paid</p></article>
        <article className="rounded-xl border border-stone-200 bg-white p-5"><p className="text-sm text-stone-500">Outstanding</p><p className="mt-3 text-2xl font-semibold">{currency(outstanding)}</p><p className="mt-2 text-xs text-stone-500">Not yet marked paid</p></article>
        <article className="rounded-xl border border-stone-200 bg-white p-5"><p className="text-sm text-stone-500">Recorded appointments</p><p className="mt-3 text-2xl font-semibold">{eligible.length}</p><p className="mt-2 text-xs text-stone-500">Cancelled appointments excluded</p></article>
      </section>
      <section className="mt-7 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-5 py-4"><div><h3 className="font-semibold">Appointment payments</h3><p className="mt-1 text-sm text-stone-500">Update the collection status after a customer pays.</p></div><label className="flex items-center gap-2 text-sm text-stone-600">Show <select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} className="rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-sm"><option>All</option><option>Paid</option><option>Unpaid</option></select></label></div>
        {visible.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-5 py-3 font-medium">Customer</th><th className="px-5 py-3 font-medium">Service</th><th className="px-5 py-3 font-medium">Appointment</th><th className="px-5 py-3 font-medium">Amount</th><th className="px-5 py-3 font-medium">Payment</th><th className="px-5 py-3 text-right font-medium">Action</th></tr></thead><tbody className="divide-y divide-stone-100">{visible.map((appointment) => { const isPaid = paid(appointment); return <tr key={appointment.id}><td className="px-5 py-4 font-medium text-stone-900">{appointment.customer}<p className="mt-0.5 text-xs font-normal text-stone-500">{appointment.customerPhone ?? 'No phone on record'}</p></td><td className="px-5 py-4 text-stone-600">{appointment.service}<p className="mt-0.5 text-xs text-stone-500">{appointment.barber}</p></td><td className="px-5 py-4 text-stone-600">{new Intl.DateTimeFormat('en-NG', { month: 'short', day: 'numeric' }).format(new Date(`${appointment.date}T12:00:00`))}<p className="mt-0.5 text-xs text-stone-500">{appointment.time}</p></td><td className="px-5 py-4 font-semibold tabular-nums">{currency(appointment.price)}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${isPaid ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>{isPaid ? 'Paid' : 'Unpaid'}</span></td><td className="px-5 py-4 text-right"><button type="button" onClick={() => void togglePayment(appointment.id, isPaid ? 'Unpaid' : 'Paid')} className="text-xs font-semibold text-emerald-800 hover:text-emerald-950">Mark {isPaid ? 'unpaid' : 'paid'}</button></td></tr>})}</tbody></table></div> : <div className="px-5 py-12 text-center"><p className="font-medium text-stone-700">{loading ? 'Loading payment records…' : `No ${filter.toLowerCase()} payment records`}</p>{!loading && <p className="mt-1 text-sm text-stone-500">Appointments will appear here as they are created.</p>}</div>}
      </section>
      <p className="mt-4 text-xs leading-5 text-stone-400">Payment tracking is manual. No card, bank, or mobile-money payments are processed.</p>
    </main>
  )
}

export default PaymentsPage
