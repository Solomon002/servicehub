import { createClient } from 'npm:@supabase/supabase-js@2'

const siteUrl = Deno.env.get('SITE_URL') ?? 'http://localhost:5173'
const corsHeaders = {
  'Access-Control-Allow-Origin': siteUrl,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  const projectUrl = Deno.env.get('SUPABASE_URL')
  const publishableKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<string, string>
  const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? publishableKeys.default
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? secretKeys.default
  if (!authorization || !projectUrl || !anonKey || !serviceKey) return json({ error: 'Server configuration is incomplete' }, 500)

  const userClient = createClient(projectUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData.user) return json({ error: 'Sign in is required' }, 401)

  let payload: { businessId?: string; barberId?: string; email?: string }
  try { payload = await request.json() } catch { return json({ error: 'Invalid JSON request' }, 400) }
  const email = payload.email?.trim().toLowerCase()
  if (!payload.businessId || !payload.barberId || !email || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Business, barber, and valid email are required' }, 400)

  const { data: membership, error: membershipError } = await userClient.from('business_memberships')
    .select('role').eq('business_id', payload.businessId).eq('user_id', authData.user.id).maybeSingle()
  if (membershipError || membership?.role !== 'owner') return json({ error: 'Only a shop owner can invite barbers' }, 403)

  const admin = createClient(projectUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: barber, error: barberError } = await admin.from('barbers').select('id,display_name,user_id')
    .eq('id', payload.barberId).eq('business_id', payload.businessId).single()
  if (barberError || !barber || barber.user_id) return json({ error: 'Barber record not found or already linked to an account' }, 404)

  const { error: invitationRecordError } = await admin.from('barber_invitations').insert({
    business_id: payload.businessId,
    barber_id: barber.id,
    email,
    created_by: authData.user.id,
  })
  if (invitationRecordError) return json({ error: 'Could not prepare the barber invitation' }, 500)

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${siteUrl}/barber/accept-invitation`,
    data: { servicehub_role: 'barber', business_id: payload.businessId, barber_id: barber.id, full_name: barber.display_name },
  })
  if (inviteError) {
    if (/already (?:been )?registered|already exists/i.test(inviteError.message)) {
      return json({ invited: false, existingAccount: true })
    }
    await admin.from('barber_invitations').delete().eq('business_id', payload.businessId).eq('barber_id', barber.id).eq('email', email).is('accepted_user_id', null)
    return json({ error: inviteError.message }, 400)
  }
  return json({ invited: true, existingAccount: false })

  function json(body: Record<string, unknown>, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
