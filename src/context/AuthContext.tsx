import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

export type StaffRole = 'owner' | 'barber'
export type AuthBusiness = { id: string; slug: string; name: string; location: string; phone: string; timezone: string }
type AuthContextValue = {
  configured: boolean
  loading: boolean
  user: User | null
  role: StaffRole | null
  business: AuthBusiness | null
  barberId: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshMembership: () => Promise<StaffRole | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<StaffRole | null>(null)
  const [business, setBusiness] = useState<AuthBusiness | null>(null)
  const [barberId, setBarberId] = useState<string | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  async function loadMembership(currentSession: Session | null): Promise<StaffRole | null> {
    setSession(currentSession)
    if (!currentSession || !supabase) {
      setRole(null); setBusiness(null); setBarberId(null); setLoading(false)
      return null
    }
    setLoading(true)
    let { data, error } = await supabase
      .from('business_memberships')
      .select('business_id, role, businesses(id, slug, name, location, phone, timezone)')
      .eq('user_id', currentSession.user.id)
      .limit(1)
      .maybeSingle()
    if (!error && !data) {
      const { error: inviteError } = await supabase.rpc('accept_barber_invitation')
      if (!inviteError) {
        const membership = await supabase
          .from('business_memberships')
          .select('business_id, role, businesses(id, slug, name, location, phone, timezone)')
          .eq('user_id', currentSession.user.id)
          .limit(1)
          .maybeSingle()
        data = membership.data
        error = membership.error
      }
    }
    if (error || !data) {
      setRole(null); setBusiness(null); setBarberId(null); setLoading(false)
      return null
    }
    const businessRow = Array.isArray(data.businesses) ? data.businesses[0] : data.businesses
    setRole(data.role as StaffRole)
    setBusiness(businessRow as AuthBusiness)
    if (data.role === 'barber') {
      const { data: barber } = await supabase.from('barbers').select('id').eq('business_id', data.business_id).eq('user_id', currentSession.user.id).maybeSingle()
      setBarberId(barber?.id ?? null)
    } else setBarberId(null)
    setLoading(false)
    return data.role as StaffRole
  }

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data }) => { if (active) void loadMembership(data.session) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) queueMicrotask(() => { if (active) void loadMembership(nextSession) })
    })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    configured: isSupabaseConfigured,
    loading,
    user: session?.user ?? null,
    role,
    business,
    barberId,
    signIn: async (email, password) => {
      if (!supabase) throw new Error('Backend is not configured. Add the Supabase URL and publishable key to .env.local.')
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    },
    signOut: async () => {
      if (!supabase) return
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    },
    refreshMembership: async () => {
      if (!supabase) return null
      const { data } = await supabase.auth.getSession()
      return loadMembership(data.session)
    },
  }), [barberId, business, loading, role, session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
