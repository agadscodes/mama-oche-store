import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, cleanSupabaseUrl } from '@/lib/supabase/client'

async function getSupabaseOrderClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = getSupabaseAdmin()
    if (admin) return admin
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_ANON_KEY

  if (!rawUrl || !supabaseKey) return null
  const supabaseUrl = cleanSupabaseUrl(rawUrl)
  try {
    const cookieStore = await cookies()
    return createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    })
  } catch {
    return getSupabaseAdmin()
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const supabase = await getSupabaseOrderClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database client unavailable' }, { status: 500 })
    }

    // Delete associated order items first to satisfy any foreign key constraints
    await supabase.from('order_items').delete().eq('order_id', id)

    // Delete the order record
    const { error } = await supabase.from('orders').delete().eq('id', id)

    if (error) {
      console.error('Error deleting order from Supabase:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete order'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
