import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { getSampleAppointments, type Appointment, type AppointmentStatus, type PaymentStatus } from '../data/appointments'
import { supabase } from '../lib/supabase'

type NewAppointment = Omit<Appointment, 'id'>
type DbAppointment = { id: string; customer_id: string; barber_id: string; service_id: string; appointment_date: string; starts_at: string; price_ngn: number | string; status: string; payments?: Array<{ status: string }> }
type AppointmentContextValue = {
  appointments: Appointment[]
  loading: boolean
  error: string
  addAppointment: (appointment: NewAppointment) => Promise<Appointment>
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => Promise<void>
  updatePaymentStatus: (id: string, status: PaymentStatus) => Promise<void>
  refreshAppointments: () => Promise<void>
}

const AppointmentContext = createContext<AppointmentContextValue | undefined>(undefined)
const toDbStatus = (status: AppointmentStatus) => status.toLowerCase()
const toUiStatus = (status: string): AppointmentStatus => `${status[0].toUpperCase()}${status.slice(1)}` as AppointmentStatus
const toUiPaymentStatus = (status?: string): PaymentStatus | undefined => status ? `${status[0].toUpperCase()}${status.slice(1)}` as PaymentStatus : undefined

export function AppointmentProvider({ children }: { children: ReactNode }) {
  const { configured, business, role, barberId } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>(() => configured ? [] : getSampleAppointments())
  const [loading, setLoading] = useState(configured)
  const [error, setError] = useState('')

  const refreshAppointments = useCallback(async () => {
    if (!configured) { setAppointments(getSampleAppointments()); setLoading(false); return }
    if (!supabase || !business) { setAppointments([]); setLoading(false); return }
    setLoading(true); setError('')
    const { data, error: queryError } = await supabase.from('appointments')
      .select('id, customer_id, barber_id, service_id, appointment_date, starts_at, price_ngn, status, payments(status)')
      .eq('business_id', business.id)
      .order('appointment_date', { ascending: false })
      .order('starts_at', { ascending: false })
      .limit(500)
    if (queryError) { setError(queryError.message); setAppointments([]); setLoading(false); return }
    const rows = (data ?? []) as unknown as DbAppointment[]
    const customerIds = [...new Set(rows.map((row) => row.customer_id))]
    const barberIds = [...new Set(rows.map((row) => row.barber_id))]
    const serviceIds = [...new Set(rows.map((row) => row.service_id))]
    const [customersResult, barbersResult, servicesResult] = await Promise.all([
      customerIds.length ? supabase.from('customers').select('id,full_name,phone').in('id', customerIds) : Promise.resolve({ data: [], error: null }),
      barberIds.length ? supabase.from('barbers').select('id,display_name').in('id', barberIds) : Promise.resolve({ data: [], error: null }),
      serviceIds.length ? supabase.from('services').select('id,name').in('id', serviceIds) : Promise.resolve({ data: [], error: null }),
    ])
    if (customersResult.error || barbersResult.error || servicesResult.error) {
      setError(customersResult.error?.message ?? barbersResult.error?.message ?? servicesResult.error?.message ?? 'Could not load appointment details.')
      setAppointments([]); setLoading(false); return
    }
    const customers = new Map((customersResult.data ?? []).map((item) => [item.id, item]))
    const barbers = new Map((barbersResult.data ?? []).map((item) => [item.id, item]))
    const services = new Map((servicesResult.data ?? []).map((item) => [item.id, item]))
    setAppointments(rows.map((row) => ({
      id: row.id,
      customer: customers.get(row.customer_id)?.full_name ?? 'Customer',
      customerPhone: customers.get(row.customer_id)?.phone,
      service: services.get(row.service_id)?.name ?? 'Service',
      barber: barbers.get(row.barber_id)?.display_name ?? 'Barber',
      date: row.appointment_date,
      time: row.starts_at.slice(0, 5),
      price: Number(row.price_ngn),
      status: toUiStatus(row.status),
      paymentStatus: toUiPaymentStatus(row.payments?.[0]?.status),
    })))
    setLoading(false)
  }, [barberId, business, configured, role])

  useEffect(() => { void refreshAppointments() }, [refreshAppointments])

  const value = useMemo<AppointmentContextValue>(() => ({
    appointments,
    loading,
    error,
    refreshAppointments,
    addAppointment: async (appointment) => {
      if (!configured) {
        const created = { ...appointment, id: `appt-${Date.now()}` }
        setAppointments((current) => [...current, created])
        return created
      }
      if (!supabase || !business) throw new Error('Sign in to a shop account before creating appointments.')
      if (role !== 'owner') throw new Error('Only the shop owner can create appointments from this screen.')
      const normalizedPhone = (appointment.customerPhone ?? '').replace(/[^0-9]/g, '')
      if (normalizedPhone.length < 7) throw new Error('Add a valid customer phone number before booking.')
      const [barberResult, serviceResult] = await Promise.all([
        supabase.from('barbers').select('id').eq('business_id', business.id).eq('display_name', appointment.barber).single(),
        supabase.from('services').select('id,duration_minutes,price_ngn').eq('business_id', business.id).eq('name', appointment.service).single(),
      ])
      if (barberResult.error) throw barberResult.error
      if (serviceResult.error) throw serviceResult.error
      const { data: slots, error: availabilityError } = await supabase.rpc('get_available_booking_slots', {
        p_slug: business.slug,
        p_service_id: serviceResult.data.id,
        p_barber_id: barberResult.data.id,
        p_date: appointment.date,
      })
      if (availabilityError) throw availabilityError
      if (!(slots ?? []).some((slot: { slot_time: string }) => slot.slot_time.slice(0, 5) === appointment.time)) {
        throw new Error('That barber is not available at this time. Choose a time within their working hours and check for another booking.')
      }
      const { data: customer, error: customerError } = await supabase.from('customers').upsert({
        business_id: business.id,
        full_name: appointment.customer.trim(),
        phone: appointment.customerPhone,
        normalized_phone: normalizedPhone,
      }, { onConflict: 'business_id,normalized_phone' }).select('id').single()
      if (customerError) throw customerError
      const { data, error: insertError } = await supabase.from('appointments').insert({
        business_id: business.id,
        customer_id: customer.id,
        barber_id: barberResult.data.id,
        service_id: serviceResult.data.id,
        appointment_date: appointment.date,
        starts_at: appointment.time,
        duration_minutes: serviceResult.data.duration_minutes,
        price_ngn: serviceResult.data.price_ngn,
        status: toDbStatus(appointment.status),
      }).select('id').single()
      if (insertError) throw insertError
      const created = { ...appointment, id: data.id }
      setAppointments((current) => [created, ...current])
      return created
    },
    updateAppointmentStatus: async (id, status) => {
      if (configured) {
        if (!supabase) throw new Error('Database is not configured.')
        const { error: updateError } = await supabase.from('appointments').update({ status: toDbStatus(status) }).eq('id', id)
        if (updateError) throw updateError
      }
      setAppointments((current) => current.map((appointment) => appointment.id === id ? { ...appointment, status } : appointment))
    },
    updatePaymentStatus: async (id, status) => {
      const appointment = appointments.find((item) => item.id === id)
      if (!appointment) throw new Error('Appointment not found.')
      if (configured) {
        if (!supabase || !business) throw new Error('Database is not configured.')
        const { data: row, error: lookupError } = await supabase.from('appointments').select('business_id,price_ngn').eq('id', id).single()
        if (lookupError) throw lookupError
        const { error: updateError } = await supabase.from('payments').upsert({
          business_id: row.business_id,
          appointment_id: id,
          amount_ngn: row.price_ngn,
          status: status.toLowerCase(),
          method: status === 'Paid' ? 'cash' : null,
          paid_at: status === 'Paid' ? new Date().toISOString() : null,
        }, { onConflict: 'appointment_id' })
        if (updateError) throw updateError
      }
      setAppointments((current) => current.map((item) => item.id === id ? { ...item, paymentStatus: status } : item))
    },
  }), [appointments, business, configured, error, loading, refreshAppointments, role])

  return <AppointmentContext.Provider value={value}>{children}</AppointmentContext.Provider>
}

export function useAppointments() {
  const context = useContext(AppointmentContext)
  if (!context) throw new Error('useAppointments must be used inside AppointmentProvider')
  return context
}
