import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { useEffect } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'

export type DayHours = { day: number; closed: boolean; opens: string; closes: string }
export type BusinessSettings = {
  businessName: string
  location: string
  phone: string
  email: string
  openingTime: string
  closingTime: string
  weeklyHours: DayHours[]
}

const defaultWeeklyHours = (): DayHours[] => Array.from({ length: 7 }, (_, day) => ({ day, closed: false, opens: '09:00', closes: '18:00' }))

const defaultSettings: BusinessSettings = {
  businessName: 'Your barbershop',
  location: '',
  phone: '',
  email: '',
  openingTime: '09:00',
  closingTime: '18:00',
  weeklyHours: defaultWeeklyHours(),
}

const storageKey = 'servicehub-business-settings'
const SettingsContext = createContext<{ settings: BusinessSettings; loading: boolean; saveSettings: (settings: BusinessSettings) => Promise<void> } | null>(null)

function getSavedSettings(): BusinessSettings {
  try {
    const saved = localStorage.getItem(storageKey)
    return saved ? { ...defaultSettings, ...JSON.parse(saved) as Partial<BusinessSettings> } : defaultSettings
  } catch {
    return defaultSettings
  }
}

export function BusinessSettingsProvider({ children }: { children: ReactNode }) {
  const { configured, business } = useAuth()
  const [settings, setSettings] = useState<BusinessSettings>(getSavedSettings)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!configured || !business || !supabase) return
    let alive = true
    setLoading(true)
    Promise.all([
      supabase.from('businesses').select('name, location, phone').eq('id', business.id).single(),
      supabase.rpc('get_owner_business_email', { p_business_id: business.id }),
      supabase.from('business_hours').select('day_of_week,opens_at,closes_at,is_closed').eq('business_id', business.id),
    ]).then(([businessResult, emailResult, hoursResult]) => {
      if (!alive) return
      if (!businessResult.error && businessResult.data) {
        const weeklyHours = defaultWeeklyHours().map(day => {
          const row = hoursResult.data?.find(hour => hour.day_of_week === day.day)
          return row ? { ...day, closed: row.is_closed, opens: row.opens_at?.slice(0, 5) ?? day.opens, closes: row.closes_at?.slice(0, 5) ?? day.closes } : day
        })
        const defaultOpenDay = weeklyHours.find(day => !day.closed) ?? weeklyHours[1]
        setSettings({
          businessName: businessResult.data.name,
          location: businessResult.data.location,
          phone: businessResult.data.phone,
          email: emailResult.data ?? '',
          openingTime: defaultOpenDay.opens,
          closingTime: defaultOpenDay.closes,
          weeklyHours,
        })
      }
      setLoading(false)
    })
    return () => { alive = false }
  }, [business, configured])
  const value = useMemo(() => ({
    settings,
    loading,
    saveSettings: async (nextSettings: BusinessSettings) => {
      if (configured && business && supabase) {
        const { error } = await supabase.from('businesses').update({ name: nextSettings.businessName, location: nextSettings.location, phone: nextSettings.phone, email: nextSettings.email }).eq('id', business.id)
        if (error) throw error
        const rows = nextSettings.weeklyHours.map(({ day, closed, opens, closes }) => ({ business_id: business.id, day_of_week: day, opens_at: closed ? null : opens, closes_at: closed ? null : closes, is_closed: closed }))
        const { error: hoursError } = await supabase.from('business_hours').upsert(rows, { onConflict: 'business_id,day_of_week' })
        if (hoursError) throw hoursError
      } else if (configured) {
        throw new Error('Sign in as the shop owner to save business settings.')
      } else {
        try { localStorage.setItem(storageKey, JSON.stringify(nextSettings)) } catch { throw new Error('Could not save settings in this browser.') }
      }
      setSettings(nextSettings)
    },
  }), [business, configured, loading, settings])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useBusinessSettings() {
  const context = useContext(SettingsContext)
  if (!context) throw new Error('useBusinessSettings must be used inside BusinessSettingsProvider')
  return context
}
