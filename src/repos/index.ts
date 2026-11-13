import { createMockRepos } from './mock'
import { createSupabaseRepos } from './supabase'
import { isConfigured, supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Repos } from './types'

/** The one place that chooses the data source: Supabase when VITE_SUPABASE_* are set, the in-memory demo otherwise. */
export const repos: Repos = isConfigured ? createSupabaseRepos(supabase(), () => useAuth.getState().userId) : createMockRepos()
export * from './types'
