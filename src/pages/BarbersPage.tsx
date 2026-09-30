import { useState, type FormEvent } from 'react'
import { useCatalog } from '../context/CatalogContext'
import { useAppointments } from '../context/AppointmentContext'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

type Shift = { day: number; mode: 'shop' | 'custom' | 'off'; opens: string; closes: string }
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('')
}

function BarbersPage() {
  const { barbers, services, addBarber, setBarberActive, loading, error: catalogError } = useCatalog()
  const { appointments } = useAppointments()
  const { configured, business } = useAuth()
  const [isAddFormOpen, setIsAddFormOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [editingSchedule, setEditingSchedule] = useState<(typeof barbers)[number] | null>(null)
  const [shiftDraft, setShiftDraft] = useState<Shift[]>([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleSaving, setScheduleSaving] = useState(false)

  async function handleAddBarber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name')).trim()
    const phone = String(formData.get('phone')).trim()
    const email = String(formData.get('email')).trim()
    const services = formData.getAll('services').map(String)
    try {
      const created = await addBarber({ name, phone, active: true, services }, email || undefined)
      setMessage(configured ? created.accountLink === 'existing' ? `${name} added. That email already has a ServiceHub account; ask them to sign in as a barber to link it to this shop.` : `${name} added. An invitation was sent to ${email}.` : `${name} added to the demo team. Invitations require a connected backend.`)
      setIsAddFormOpen(false)
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Could not add barber.') }
  }

  async function toggleActive(barber: (typeof barbers)[number]) {
    const nextStatus = !barber.active
    try { await setBarberActive(barber.id, nextStatus); setMessage(`${barber.name} marked ${nextStatus ? 'active' : 'inactive'}.`) }
    catch (caught) { setMessage(caught instanceof Error ? caught.message : 'Could not update barber.') }
  }

  async function openSchedule(barber: (typeof barbers)[number]) {
    if (!supabase || !business) { setMessage('Connect the shop database to manage barber working hours.'); return }
    setEditingSchedule(barber); setScheduleLoading(true)
    const { data, error } = await supabase.from('barber_hours').select('day_of_week,starts_at,ends_at,is_day_off').eq('business_id', business.id).eq('barber_id', barber.id)
    if (error) { setMessage(error.message); setEditingSchedule(null); setScheduleLoading(false); return }
    const shifts = dayNames.map((_, day) => {
      const row = data.find(item => item.day_of_week === day)
      return { day, mode: !row ? 'shop' as const : row.is_day_off ? 'off' as const : 'custom' as const, opens: row?.starts_at?.slice(0, 5) ?? '09:00', closes: row?.ends_at?.slice(0, 5) ?? '18:00' }
    })
    setShiftDraft(shifts); setScheduleLoading(false)
  }

  async function saveSchedule() {
    if (!supabase || !business || !editingSchedule) return
    if (shiftDraft.some(shift => shift.mode === 'custom' && shift.opens >= shift.closes)) { setMessage('Each custom shift must end after it starts.'); return }
    setScheduleSaving(true); setMessage('')
    const inheritDays = shiftDraft.filter(shift => shift.mode === 'shop').map(shift => shift.day)
    if (inheritDays.length) {
      const { error } = await supabase.from('barber_hours').delete().eq('business_id', business.id).eq('barber_id', editingSchedule.id).in('day_of_week', inheritDays)
      if (error) { setMessage(error.message); setScheduleSaving(false); return }
    }
    const rows = shiftDraft.filter(shift => shift.mode !== 'shop').map(shift => ({ business_id: business.id, barber_id: editingSchedule.id, day_of_week: shift.day, starts_at: shift.mode === 'off' ? null : shift.opens, ends_at: shift.mode === 'off' ? null : shift.closes, is_day_off: shift.mode === 'off' }))
    if (rows.length) {
      const { error } = await supabase.from('barber_hours').upsert(rows, { onConflict: 'barber_id,day_of_week' })
      if (error) { setMessage(error.message); setScheduleSaving(false); return }
    }
    setMessage(`${editingSchedule.name}'s schedule was saved.`); setScheduleSaving(false); setEditingSchedule(null)
  }

  const activeCount = barbers.filter((barber) => barber.active).length

  return (
    <main className="mx-auto max-w-6xl px-6 py-8 sm:py-10">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-stone-500">{business?.name ?? 'Barbers'}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Barbers</h2>
          <p className="mt-2 text-sm text-stone-600">Manage your team and see today's appointment load.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddFormOpen(true)}
          className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800"
        >
          + Add barber
        </button>
      </div>

      <p role="status" aria-live="polite" className="sr-only">{message}</p>
      {catalogError && <p role="alert" className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-800">Could not load the team: {catalogError}</p>}

      <section aria-label="Barber team" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {barbers.map((barber) => (
          <article key={barber.id} className={`rounded-xl border bg-white p-5 shadow-sm transition ${barber.active ? 'border-stone-200' : 'border-stone-200 opacity-70'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid size-12 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-900">
                  {initials(barber.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-stone-900">{barber.name}</h3>
                  <a href={`tel:${barber.phone.replaceAll(' ', '')}`} className="mt-1 block truncate text-xs text-stone-500 hover:text-emerald-800">
                    {barber.phone}
                  </a>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${barber.active ? 'bg-emerald-50 text-emerald-800' : 'bg-stone-100 text-stone-600'}`}>
                {barber.active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="mt-5 rounded-lg bg-stone-50 px-4 py-3">
              <p className="text-xs font-medium text-stone-500">Appointments today</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-stone-900">{appointments.filter((appointment) => appointment.barber === barber.name && appointment.date === new Date().toLocaleDateString('en-CA') && appointment.status !== 'Cancelled').length || barber.appointmentsToday}</p>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Services</p>
              {barber.services.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {barber.services.map((service) => (
                    <li key={service} className="rounded-full border border-stone-200 px-2.5 py-1 text-xs text-stone-600">{service}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-stone-400">No services assigned yet</p>
              )}
            </div>

            <div className="mt-5 border-t border-stone-100 pt-4 text-right">
              <button type="button" onClick={() => void openSchedule(barber)} className="mr-2 rounded-lg px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">Working hours</button>
              <button
                type="button"
                onClick={() => toggleActive(barber)}
                aria-label={`${barber.active ? 'Mark' : 'Set'} ${barber.name} ${barber.active ? 'inactive' : 'active'}`}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${barber.active ? 'text-stone-600 hover:bg-stone-50' : 'text-emerald-800 hover:bg-emerald-50'}`}
              >
                {barber.active ? 'Mark inactive' : 'Set active'}
              </button>
            </div>
          </article>
        ))}
      </section>

      <p className="mt-6 text-xs text-stone-400">{loading ? 'Loading team…' : `${activeCount} active barbers · Team records are saved to the connected shop database.`}</p>

      {isAddFormOpen && (
        <div className="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-stone-950/40 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="add-barber-title" className="my-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="add-barber-title" className="text-lg font-semibold text-stone-900">Add barber</h3>
                <p className="mt-1 text-sm text-stone-500">Add one record for each barber. Every barber gets their own login and private schedule.</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setIsAddFormOpen(false)} className="grid size-8 place-items-center rounded-lg text-xl text-stone-500 hover:bg-stone-100">×</button>
            </div>
            <form onSubmit={handleAddBarber} className="mt-5 space-y-4">
              <label className="block text-sm font-medium text-stone-700">
                Full name
                <input name="name" required autoFocus className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="block text-sm font-medium text-stone-700">
                Phone number
                <input name="phone" type="tel" required className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
              </label>
              <label className="block text-sm font-medium text-stone-700">Barber’s account email<input name="email" type="email" required className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /><span className="mt-1 block text-xs font-normal text-stone-500">New accounts receive an invite. Existing accounts can sign in after you add them here.</span></label>
              <fieldset>
                <legend className="text-sm font-medium text-stone-700">Services offered <span className="font-normal text-stone-400">(optional)</span></legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {services.map((service) => (
                    <label key={service.id} className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2.5 text-sm text-stone-700">
                      <input type="checkbox" name="services" value={service.name} className="size-4 accent-emerald-800" />
                      {service.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddFormOpen(false)} className="rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">Cancel</button>
                <button type="submit" className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900">Add barber</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {editingSchedule && <div className="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-stone-950/40 p-4"><section role="dialog" aria-modal="true" aria-labelledby="barber-hours-title" className="my-auto max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"><div className="flex items-start justify-between gap-4"><div><h3 id="barber-hours-title" className="text-lg font-semibold">{editingSchedule.name}’s working hours</h3><p className="mt-1 text-sm text-stone-500">A barber’s shift must fit inside the shop’s opening hours.</p></div><button type="button" aria-label="Close" onClick={() => setEditingSchedule(null)} className="grid size-8 place-items-center rounded-lg text-xl text-stone-500 hover:bg-stone-100">×</button></div>
        {scheduleLoading ? <p className="py-10 text-center text-sm text-stone-500">Loading schedule…</p> : <><div className="mt-5 space-y-2">{shiftDraft.map(shift => <div key={shift.day} className="grid items-center gap-3 rounded-lg border border-stone-100 p-3 sm:grid-cols-[100px_1fr_1fr_1fr]"><span className="text-sm font-medium">{dayNames[shift.day]}</span><select aria-label={`${dayNames[shift.day]} schedule`} value={shift.mode} onChange={event => setShiftDraft(current => current.map(item => item.day === shift.day ? { ...item, mode: event.target.value as Shift['mode'] } : item))} className="rounded-lg border border-stone-200 bg-white px-2 py-2 text-sm"><option value="shop">Shop hours</option><option value="custom">Custom shift</option><option value="off">Day off</option></select>{shift.mode === 'custom' ? <><input aria-label={`${dayNames[shift.day]} starts`} type="time" value={shift.opens} onChange={event => setShiftDraft(current => current.map(item => item.day === shift.day ? { ...item, opens: event.target.value } : item))} className="rounded-lg border border-stone-200 px-2 py-2 text-sm"/><input aria-label={`${dayNames[shift.day]} ends`} type="time" value={shift.closes} onChange={event => setShiftDraft(current => current.map(item => item.day === shift.day ? { ...item, closes: event.target.value } : item))} className="rounded-lg border border-stone-200 px-2 py-2 text-sm"/></> : <span className="text-xs text-stone-500 sm:col-span-2">{shift.mode === 'off' ? 'No appointments on this day' : 'Uses shop opening hours'}</span>}</div>)}</div><div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setEditingSchedule(null)} className="rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700">Cancel</button><button type="button" disabled={scheduleSaving} onClick={() => void saveSchedule()} className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{scheduleSaving ? 'Saving…' : 'Save schedule'}</button></div></>}</section></div>}
    </main>
  )
}

export default BarbersPage
