import { createClient } from '@supabase/supabase-js'
import { cleanSupabaseUrl, DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from './client'

export function getSupabaseAdmin() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY

  if (!rawUrl || !serviceRoleKey) {
    return null
  }

  const url = cleanSupabaseUrl(rawUrl)

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

