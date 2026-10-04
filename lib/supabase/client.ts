import { createBrowserClient } from '@supabase/ssr'

export const DEFAULT_SUPABASE_URL = 'https://uwmjtqxrvngwwpkugeaw.supabase.co'
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3bWp0cXhydm5nd3dwa3VnZWF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3OTE1ODUsImV4cCI6MjEwNjM2NzU4NX0.4_UH2cSBIqXGDSQuXHkcgP856mZApWvM11iw-wyYByA'

export function cleanSupabaseUrl(url?: string | null): string {
  if (!url) return ''
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '')
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY
  return Boolean(url && key)
}

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY

  if (!rawUrl || !key) {
    return null
  }

  const url = cleanSupabaseUrl(rawUrl)
  return createBrowserClient(url, key)
}
