import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { startingBarbers, type Barber } from '../data/barbers'
import { appointmentServices } from '../data/appointments'
import { supabase } from '../lib/supabase'

export type ServiceRecord = { id: string; name: string; description: string; duration: number; price: number }
type CatalogContextValue = {
  services: ServiceRecord[]
  barbers: Barber[]
  loading: boolean
  error: string
  saveService: (service: Omit<ServiceRecord, 'id'> & { id?: string }) => Promise<ServiceRecord>
  archiveService: (id: string) => Promise<void>
  addBarber: (barber: Omit<Barber, 'id' | 'appointmentsToday'>, email?: string) => Promise<Barber & { accountLink?: 'invited' | 'existing' }>
  setBarberActive: (id: string, active: boolean) => Promise<void>
}
const CatalogContext = createContext<CatalogContextValue | null>(null)
const demoServices: ServiceRecord[] = appointmentServices.map((item) => ({ ...item, id: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') }))

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { configured, business } = useAuth()
  const [services, setServices] = useState<ServiceRecord[]>(configured ? [] : demoServices)
  const [barbers, setBarbers] = useState<Barber[]>(configured ? [] : startingBarbers)
  const [loading, setLoading] = useState(configured)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!configured) { setServices(demoServices); setBarbers(startingBarbers); setLoading(false); return }
    if (!business || !supabase) { setServices([]); setBarbers([]); setLoading(false); return }
    setLoading(true); setError('')
    const [serviceResult, barberResult, assignmentResult] = await Promise.all([
      supabase.from('services').select('id,name,description,duration_minutes,price_ngn,is_active').eq('business_id', business.id).order('name'),
      supabase.from('barbers').select('id,display_name,phone,is_active').eq('business_id', business.id).order('display_name'),
      supabase.from('barber_services').select('barber_id,service_id').eq('business_id', business.id),
    ])
    const fetchError = serviceResult.error ?? barberResult.error ?? assignmentResult.error
    if (fetchError) { setError(fetchError.message); setServices([]); setBarbers([]); setLoading(false); return }
    const serviceRows = serviceResult.data ?? []
    const serviceNames = new Map(serviceRows.map((row) => [row.id, row.name]))
    setServices(serviceRows.filter((row) => row.is_active).map((row) => ({ id: row.id, name: row.name, description: row.description ?? '', duration: row.duration_minutes, price: Number(row.price_ngn) })))
    setBarbers((barberResult.data ?? []).map((row) => ({ id: row.id, name: row.display_name, phone: row.phone, active: row.is_active, appointmentsToday: 0, services: (assignmentResult.data ?? []).filter((assignment) => assignment.barber_id === row.id).map((assignment) => serviceNames.get(assignment.service_id)).filter((name): name is string => Boolean(name)) })))
    setLoading(false)
  }, [business, configured])
  useEffect(() => { void refresh() }, [refresh])

  const value = useMemo<CatalogContextValue>(() => ({
    services, barbers, loading, error,
    saveService: async (service) => {
      if (!configured) {
        const saved = { ...service, id: service.id ?? `service-${Date.now()}` }
        setServices((current) => service.id ? current.map((item) => item.id === service.id ? saved : item) : [...current, saved])
        return saved
      }
      if (!supabase || !business) throw new Error('Shop database is not ready.')
      const payload = { business_id: business.id, name: service.name.trim(), description: service.description.trim(), duration_minutes: service.duration, price_ngn: service.price, is_active: true }
      const query = service.id
        ? supabase.from('services').update(payload).eq('id', service.id).select('id,name,description,duration_minutes,price_ngn').single()
        : supabase.from('services').insert(payload).select('id,name,description,duration_minutes,price_ngn').single()
      const { data, error: saveError } = await query
      if (saveError) throw saveError
      const saved = { id: data.id, name: data.name, description: data.description ?? '', duration: data.duration_minutes, price: Number(data.price_ngn) }
      setServices((current) => service.id ? current.map((item) => item.id === service.id ? saved : item) : [...current, saved])
      return saved
    },
    archiveService: async (id) => {
      if (configured) {
        if (!supabase) throw new Error('Database is not configured.')
        const { error: archiveError } = await supabase.from('services').update({ is_active: false }).eq('id', id)
        if (archiveError) throw archiveError
      }
      setServices((current) => current.filter((item) => item.id !== id))
    },
    addBarber: async (barber, email) => {
      if (!configured) {
        const created = { ...barber, id: `barber-${Date.now()}`, appointmentsToday: 0 }
        setBarbers((current) => [...current, created])
        return created
      }
      if (!supabase || !business) throw new Error('Shop database is not ready.')
      const { data, error: insertError } = await supabase.from('barbers').insert({ business_id: business.id, display_name: barber.name.trim(), phone: barber.phone, is_active: barber.active }).select('id').single()
      if (insertError) throw insertError
      if (barber.services.length) {
        const serviceIds = services.filter((service) => barber.services.includes(service.name)).map((service) => service.id)
        const { error: assignmentError } = await supabase.from('barber_services').insert(serviceIds.map((service_id) => ({ business_id: business.id, barber_id: data.id, service_id })))
        if (assignmentError) { await supabase.from('barbers').delete().eq('id', data.id); throw assignmentError }
      }
      const created = { ...barber, id: data.id, appointmentsToday: 0 }
      setBarbers((current) => [...current, created])
      let accountLink: 'invited' | 'existing' = 'invited'
      if (email) {
        const { data: inviteResult, error: inviteError } = await supabase.functions.invoke('invite-barber', { body: { businessId: business.id, barberId: data.id, email } })
        if (inviteError) { setError(`Barber saved, but the invite failed: ${inviteError.message}`); throw inviteError }
        if (inviteResult?.existingAccount) accountLink = 'existing'
      }
      return { ...created, accountLink }
    },
    setBarberActive: async (id, active) => {
      if (configured) {
        if (!supabase) throw new Error('Database is not configured.')
        const { error: updateError } = await supabase.from('barbers').update({ is_active: active }).eq('id', id)
        if (updateError) throw updateError
      }
      setBarbers((current) => current.map((barber) => barber.id === id ? { ...barber, active } : barber))
    },
  }), [barbers, business, configured, error, loading, services])

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const context = useContext(CatalogContext)
  if (!context) throw new Error('useCatalog must be used inside CatalogProvider')
  return context
}
