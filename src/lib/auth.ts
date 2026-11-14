import { create } from 'zustand'
import { isConfigured, supabase } from './supabase'

export type Role = 'customer' | 'staff' | 'owner'
export interface CustomerProfile { fullName: string; phone: string; seat: string }
export interface CustomerRegistration { fullName?: string; phone: string; seat?: string }
interface AuthState {
  configured: boolean
  ready: boolean
  userId: string | null
  email: string | null
  /** True for a guest session (Supabase anonymous sign-in): can order with a phone number, no email. */
  isGuest: boolean
  role: Role
  profile: CustomerProfile | null
  signInPassword(email: string, password: string): Promise<string | null>
  signUpPassword(email: string, password: string, profile: CustomerRegistration): Promise<string | null>
  updateCustomerProfile(profile: CustomerProfile): Promise<string | null>
  signOut(): Promise<void>
}

export const useAuth = create<AuthState>((set, get) => ({
  configured: isConfigured, ready: !isConfigured, userId: null, email: null, isGuest: false, role: 'customer', profile: null,
  async signInPassword(email, password) {
    const { error } = await supabase().auth.signInWithPassword({ email, password })
    return error?.message ?? null
  },
  async signUpPassword(email, password, profile) {
    // A guest who signs up keeps their coins: updateUser links the email to the same user id.
    const sb = supabase()
    const data = {
      name: profile.fullName?.trim() ?? '',
      phone: profile.phone?.trim() ?? '',
      seat: profile.seat?.trim() ?? '',
    }
    const { error } = get().isGuest
      ? await sb.auth.updateUser({ email, password, data })
      : await sb.auth.signUp({ email, password, options: { data } })
    return error?.message ?? null
  },
  async updateCustomerProfile(profile) {
    const userId = get().userId
    const phone = profile.phone.trim()
    if (!userId || get().isGuest) return 'not-authenticated'
    if (!/^\+?[0-9 ()-]{6,20}$/.test(phone)) return 'phone-required'
    const { data, error } = await supabase()
      .from('profiles')
      .update({ display_name: profile.fullName.trim() || null, phone, seat: profile.seat.trim() || null })
      .eq('id', userId)
      .select('display_name, phone, seat')
      .single()
    if (error) return error.message
    set({ profile: { fullName: data.display_name ?? '', phone: data.phone ?? '', seat: data.seat ?? '' } })
    return null
  },
  async signOut() { await supabase().auth.signOut() },
}))

async function apply(session: { user: { id: string; email?: string; is_anonymous?: boolean } } | null) {
  if (!session) { useAuth.setState({ userId: null, email: null, isGuest: false, role: 'customer', profile: null, ready: false }); return }
  const u = session.user
  let role: Role = 'customer'
  const { data } = await supabase().from('profiles').select('role, display_name, phone, seat').eq('id', u.id).maybeSingle()
  if (data?.role) role = data.role as Role
  const profile = data ? { fullName: data.display_name ?? '', phone: data.phone ?? '', seat: data.seat ?? '' } : null
  useAuth.setState({ userId: u.id, email: u.email ?? null, isGuest: !!u.is_anonymous, role, profile, ready: true })
}

/** Starts the session: restores a saved login, otherwise signs in as a guest so ordering works with no signup. */
export async function initAuth() {
  if (!isConfigured) return
  const sb = supabase()
  sb.auth.onAuthStateChange((_e, session) => { setTimeout(() => { void apply(session) }, 0) })
  const { data } = await sb.auth.getSession()
  if (data.session) { await apply(data.session); return }
  const { data: g, error } = await sb.auth.signInAnonymously()
  if (error) { useAuth.setState({ ready: true }); return }
  await apply(g.session)
}
