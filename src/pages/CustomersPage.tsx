import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { useAppointments } from '../context/AppointmentContext'
import { supabase } from '../lib/supabase'

type AppointmentHistoryItem = {
  date: string
  service: string
  barber: string
  amount: number
  status: 'Completed' | 'Upcoming'
}

type Customer = {
  id: string
  name: string
  phone: string
  visits: number
  totalSpent: number
  preferredBarber: string
  notes: string
  history: AppointmentHistoryItem[]
}

const startingCustomers: Customer[] = [
  {
    id: 'david-smith',
    name: 'David Smith',
    phone: '080 1234 5678',
    visits: 8,
    totalSpent: 42000,
    preferredBarber: 'Michael Johnson',
    notes: 'Low fade',
    history: [
      { date: 'Sep 24, 2026', service: 'Low Fade', barber: 'Michael Johnson', amount: 6000, status: 'Completed' },
      { date: 'Sep 10, 2026', service: 'Haircut', barber: 'Michael Johnson', amount: 5000, status: 'Completed' },
      { date: 'Aug 27, 2026', service: 'Low Fade', barber: 'Michael Johnson', amount: 6000, status: 'Completed' },
    ],
  },
  {
    id: 'john-doe',
    name: 'John Doe',
    phone: '080 5555 0123',
    visits: 14,
    totalSpent: 85000,
    preferredBarber: 'Michael Johnson',
    notes: 'Usually books on Saturday mornings.',
    history: [
      { date: 'Sep 25, 2026', service: 'Haircut', barber: 'Michael Johnson', amount: 5000, status: 'Completed' },
      { date: 'Sep 18, 2026', service: 'Haircut + Beard', barber: 'Chris Adams', amount: 7000, status: 'Completed' },
      { date: 'Sep 30, 2026', service: 'Haircut', barber: 'Michael Johnson', amount: 5000, status: 'Upcoming' },
    ],
  },
  {
    id: 'michael-brown',
    name: 'Michael Brown',
    phone: '080 9012 3456',
    visits: 21,
    totalSpent: 125000,
    preferredBarber: 'David Williams',
    notes: 'Prefers a short trim.',
    history: [
      { date: 'Sep 20, 2026', service: 'Haircut + Beard', barber: 'David Williams', amount: 7000, status: 'Completed' },
      { date: 'Sep 6, 2026', service: 'Beard Trim', barber: 'David Williams', amount: 3000, status: 'Completed' },
    ],
  },
]

const formatNaira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`

function CustomersPage() {
  const { configured, business, role } = useAuth()
  const { appointments } = useAppointments()
  const [customers, setCustomers] = useState(configured ? [] : startingCustomers)
  const [loading, setLoading] = useState(configured)
  const [loadError, setLoadError] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCustomerId, setSelectedCustomerId] = useState(configured ? '' : startingCustomers[0].id)
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)

  useEffect(() => {
    if (!configured || !business || !supabase) return
    let alive = true
    setLoading(true); setLoadError('')
    supabase.from('customers').select('id,full_name,phone,notes').eq('business_id', business.id).order('full_name')
      .then(({ data, error }) => {
        if (!alive) return
        if (error) { setLoadError(error.message); setCustomers([]); setLoading(false); return }
        const nextCustomers = (data ?? []).map((row) => {
          const history = appointments.filter((item) => item.customerPhone?.replace(/[^0-9]/g, '') === row.phone.replace(/[^0-9]/g, '') || item.customer.toLowerCase() === row.full_name.toLowerCase()).sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
          const completed = history.filter((item) => item.status === 'Completed')
          const counts = new Map<string, number>()
          history.forEach((item) => counts.set(item.barber, (counts.get(item.barber) ?? 0) + 1))
          const preferredBarber = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Not set'
          return { id: row.id, name: row.full_name, phone: row.phone, visits: completed.length, totalSpent: completed.reduce((sum, item) => sum + item.price, 0), preferredBarber, notes: row.notes || 'No notes yet.', history: history.map((item) => ({ date: new Intl.DateTimeFormat('en-NG', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${item.date}T12:00:00`)), service: item.service, barber: item.barber, amount: item.price, status: item.status === 'Completed' ? 'Completed' as const : 'Upcoming' as const })) }
        })
        setCustomers(nextCustomers)
        setSelectedCustomerId((current) => nextCustomers.some((item) => item.id === current) ? current : nextCustomers[0]?.id ?? '')
        setLoading(false)
      })
    return () => { alive = false }
  }, [appointments, business, configured])

  const filteredCustomers = customers.filter((customer) =>
    `${customer.name} ${customer.phone}`.toLowerCase().includes(search.trim().toLowerCase()),
  )
  const selectedCustomer =
    filteredCustomers.find((customer) => customer.id === selectedCustomerId) ?? filteredCustomers[0]

  async function handleAddCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name')).trim()
    const phone = String(formData.get('phone')).trim()
    const notes = String(formData.get('notes')).trim()

    let newId = `customer-${Date.now()}`
    if (configured) {
      if (!supabase || !business) { setLoadError('Shop database is not ready.'); return }
      const { data, error } = await supabase.from('customers').insert({ business_id: business.id, full_name: name, phone, normalized_phone: phone.replace(/[^0-9]/g, ''), notes }).select('id').single()
      if (error) { setLoadError(error.message); return }
      newId = data.id
    }
    const newCustomer: Customer = {
      id: newId,
      name,
      phone,
      visits: 0,
      totalSpent: 0,
      preferredBarber: 'Not set',
      notes: notes || 'No notes yet.',
      history: [],
    }

    setCustomers((currentCustomers) => [newCustomer, ...currentCustomers])
    setSelectedCustomerId(newCustomer.id)
    setSearch('')
    setIsAddFormOpen(false)
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-500">{business?.name ?? 'Customers'}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Customers</h2>
          <p className="mt-2 text-sm text-stone-600">Keep customer details and appointment history together.</p>
        </div>
        {role === 'owner' && <button
          type="button"
          onClick={() => setIsAddFormOpen(true)}
          className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          + Add customer
        </button>}
      </div>
      {loadError && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">Could not load or save customer records: {loadError}</p>}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-4 sm:px-5">
            <label className="relative min-w-56 flex-1">
              <span className="sr-only">Search customers</span>
              <span aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 text-stone-400">⌕</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name or phone"
                className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <span className="text-sm text-stone-500">{filteredCustomers.length} customers</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
                <tr>
                  <th scope="col" className="px-5 py-3">Customer</th>
                  <th scope="col" className="px-4 py-3">Visits</th>
                  <th scope="col" className="px-4 py-3">Total spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredCustomers.map((customer) => {
                  const isSelected = selectedCustomer?.id === customer.id
                  return (
                    <tr key={customer.id} className={isSelected ? 'bg-emerald-50/60' : 'hover:bg-stone-50'}>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setSelectedCustomerId(customer.id)}
                          className="text-left focus-visible:rounded focus-visible:outline-2 focus-visible:outline-emerald-700"
                        >
                          <span className="block font-semibold text-stone-900">{customer.name}</span>
                          <span className="mt-1 block text-xs text-stone-500">{customer.phone}</span>
                        </button>
                      </td>
                      <td className="px-4 py-4 tabular-nums text-stone-700">{customer.visits}</td>
                      <td className="px-4 py-4 whitespace-nowrap font-medium tabular-nums text-stone-700">
                        {formatNaira(customer.totalSpent)}
                      </td>
                    </tr>
                  )
                })}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-12 text-center text-sm text-stone-500">
                      {loading ? 'Loading customer records…' : configured && !search ? 'No customer records yet. They’ll appear here after a booking or when you add one.' : `No customers match “${search}”. Try another name or phone number.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="border-t border-stone-100 px-5 py-3 text-xs text-stone-400">{configured ? 'Shop customer records · access is restricted to authorized staff' : 'Preview customer records · not stored in a shop database'}</p>
        </section>

        {selectedCustomer ? (
          <section aria-label={`${selectedCustomer.name} profile`} className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="border-b border-stone-100 p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-100 font-semibold text-emerald-900">
                  {selectedCustomer.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-stone-900">{selectedCustomer.name}</h3>
                  <a className="mt-1 block text-sm text-stone-500 hover:text-emerald-800" href={`tel:${selectedCustomer.phone.replaceAll(' ', '')}`}>
                    {selectedCustomer.phone}
                  </a>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-stone-50 p-3">
                  <p className="text-xs text-stone-500">Total visits</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-stone-900">{selectedCustomer.visits}</p>
                </div>
                <div className="rounded-lg bg-stone-50 p-3">
                  <p className="text-xs text-stone-500">Total spent</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-stone-900">{formatNaira(selectedCustomer.totalSpent)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Preferred barber</h4>
                <p className="mt-1.5 text-sm font-medium text-stone-800">{selectedCustomer.preferredBarber}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Notes</h4>
                <p className="mt-1.5 text-sm leading-6 text-stone-700">{selectedCustomer.notes}</p>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-stone-900">Appointment history</h4>
                  <span className="text-xs text-stone-500">Latest visits</span>
                </div>
                {selectedCustomer.history.length > 0 ? (
                  <ul className="divide-y divide-stone-100 rounded-lg border border-stone-100">
                    {selectedCustomer.history.map((appointment) => (
                      <li key={`${appointment.date}-${appointment.service}`} className="flex items-start justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-stone-800">{appointment.service}</p>
                          <p className="mt-1 text-xs text-stone-500">{appointment.date} · {appointment.barber}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-medium tabular-nums text-stone-800">{formatNaira(appointment.amount)}</p>
                          <span className={`mt-1 inline-block text-xs ${appointment.status === 'Upcoming' ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {appointment.status}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-dashed border-stone-200 px-4 py-6 text-center text-sm text-stone-500">
                    No appointment history yet.
                  </p>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
            Select a customer to view their profile.
          </section>
        )}
      </div>

      {isAddFormOpen && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-stone-950/40 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="add-customer-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="add-customer-title" className="text-lg font-semibold text-stone-900">Add customer</h3>
                <p className="mt-1 text-sm text-stone-500">Add their contact details to your list.</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setIsAddFormOpen(false)} className="grid size-8 place-items-center rounded-lg text-xl text-stone-500 hover:bg-stone-100">×</button>
            </div>
            <form onSubmit={handleAddCustomer} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-stone-700">
                Full name
                <input name="name" required autoFocus className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="block text-sm font-medium text-stone-700">
                Phone number
                <input name="phone" type="tel" required className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="block text-sm font-medium text-stone-700">
                Notes <span className="font-normal text-stone-400">(optional)</span>
                <textarea name="notes" rows={3} className="mt-1.5 w-full resize-y rounded-lg border border-stone-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddFormOpen(false)} className="rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">Cancel</button>
                <button type="submit" className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">Save customer</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}

export default CustomersPage
