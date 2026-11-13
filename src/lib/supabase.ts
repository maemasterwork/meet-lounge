import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Only the public anon key belongs in the browser. Never put the admin (secret) key in a VITE_ variable.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isConfigured = Boolean(url && anon)

let client: SupabaseClient | null = null
export function supabase(): SupabaseClient {
  if (!url || !anon) throw new Error('Supabase is not configured (see .env.example)')
  client ??= createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  return client
}
