import { useState, type FormEvent } from 'react'
import {
  appointmentBarbers,
  appointmentServices,
  findAppointmentConflict,
  getLocalDate,
  type Appointment,
} from '../../data/appointments'
import { useCatalog } from '../../context/CatalogContext'
import { isSupabaseConfigured } from '../../lib/supabase'

type AppointmentDraft = Omit<Appointment, 'id'>

type AppointmentFormDialogProps = {
  appointments: Appointment[]
  initialValues?: Partial<Pick<Appointment, 'customer' | 'service' | 'barber' | 'date' | 'time'>>
  onCancel: () => void
  onSave: (appointment: AppointmentDraft) => void | Promise<void>
}

const formatNaira = (amount: number) => `₦${amount.toLocaleString('en-NG')}`

function AppointmentFormDialog({ appointments, initialValues = {}, onCancel, onSave }: AppointmentFormDialogProps) {
  const { services: liveServices, barbers: liveBarbers } = useCatalog()
  const services = isSupabaseConfigured ? liveServices : appointmentServices
  const barbers = isSupabaseConfigured ? liveBarbers.map((item) => item.name) : appointmentBarbers
  const [selectedService, setSelectedService] = useState(initialValues.service ?? services[0]?.name ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const service = services.find((item) => item.name === selectedService) ?? services[0]

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const serviceName = String(formData.get('service'))
    const selectedServiceDetails = services.find((item) => item.name === serviceName) ?? services[0]
    if (!selectedServiceDetails) { setError('Add a service before creating an appointment.'); return }
    const customerPhone = String(formData.get('phone')).trim()
    const appointment: AppointmentDraft = {
      customer: String(formData.get('customer')),
      customerPhone,
      service: selectedServiceDetails.name,
      barber: String(formData.get('barber')),
      date: String(formData.get('date')),
      time: String(formData.get('time')),
      price: selectedServiceDetails.price,
      status: 'Pending',
    }

    const [hours, minutes] = appointment.time.split(':').map(Number)
    const startsAt = hours * 60 + minutes
    const endsAt = startsAt + selectedServiceDetails.duration
    if (!isSupabaseConfigured && (startsAt < 9 * 60 || endsAt > 18 * 60)) {
      setError('Choose a time within the preview shop hours of 9:00 AM to 6:00 PM.')
      return
    }

    const conflict = isSupabaseConfigured ? undefined : findAppointmentConflict(appointments, appointment)
    if (conflict) {
      setError(`${conflict.barber} already has ${conflict.customer}'s ${conflict.service} at ${conflict.time}. Choose a different time or barber.`)
      return
    }

    setSaving(true)
    setError('')
    try {
      await onSave(appointment)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save this appointment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 grid place-items-center overflow-y-auto bg-stone-950/40 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="appointment-form-title" className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="appointment-form-title" className="text-lg font-semibold text-stone-900">New appointment</h3>
            <p className="mt-1 text-sm text-stone-500">Choose a customer, service, barber, and time.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onCancel} className="grid size-8 place-items-center rounded-lg text-xl text-stone-500 hover:bg-stone-100">×</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-stone-700">
            Customer
            <input name="customer" required minLength={2} maxLength={120} defaultValue={initialValues.customer ?? ''} placeholder="Customer name" className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="block text-sm font-medium text-stone-700">Customer phone<input name="phone" type="tel" required minLength={7} maxLength={24} defaultValue="" placeholder="080 1234 5678" className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" /></label>
          <label className="block text-sm font-medium text-stone-700">
            Service
            <select name="service" value={selectedService} onChange={(event) => setSelectedService(event.target.value)} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100">
              {services.map((item) => <option key={item.name} value={item.name}>{item.name} · {item.duration} min · {formatNaira(item.price)}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium text-stone-700">
            Barber
            <select name="barber" required disabled={!barbers.length} defaultValue={initialValues.barber ?? barbers[0] ?? ''} className="mt-1.5 w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100">
              {barbers.map((barber) => <option key={barber}>{barber}</option>)}
            </select>
            {!barbers.length && <p className="mt-1 text-xs text-rose-700">Add an active barber before creating an appointment.</p>}
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-stone-700">
              Date
              <input name="date" type="date" required min={getLocalDate()} defaultValue={initialValues.date ?? getLocalDate()} className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Time
              <input name="time" type="time" required defaultValue={initialValues.time ?? '09:00'} className="mt-1.5 w-full rounded-lg border border-stone-200 px-3 py-2.5 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100" />
            </label>
          </div>
          <div className="rounded-lg bg-stone-50 px-4 py-3 text-sm text-stone-600">
            Estimated price <strong className="float-right text-stone-900">{formatNaira(service?.price ?? 0)}</strong>
          </div>
          {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm leading-5 text-rose-800">{error}</p>}
          <p className="text-xs leading-5 text-stone-400">New appointments start as pending. Conflicts with this barber's existing appointments are blocked.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onCancel} className="rounded-lg border border-stone-200 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">Cancel</button>
            <button type="submit" disabled={saving || !services.length || !barbers.length} className="rounded-lg bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Saving…' : 'Create appointment'}</button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default AppointmentFormDialog
