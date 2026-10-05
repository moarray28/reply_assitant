import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const isConfigured = (value) => Boolean(value && !value.includes('your-'))

export const supabase = isConfigured(supabaseUrl) && isConfigured(supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export const hasSupabaseConfig = Boolean(supabase)

export async function getAccessToken() {
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session?.access_token ?? null
}
