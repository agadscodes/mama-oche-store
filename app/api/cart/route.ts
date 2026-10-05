import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { CartItem } from '@/lib/store-data'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ items: [] })
    }

    const { data, error } = await supabase
      .from('carts')
      .select('items, updated_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching cart:', error)
      return NextResponse.json({ items: [] })
    }

    const items: CartItem[] = Array.isArray(data?.items) ? data.items : []
    return NextResponse.json({ items, updatedAt: data?.updated_at || null })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch cart'
    return NextResponse.json({ error: message, items: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, items } = body

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items must be an array' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ success: true, offline: true })
    }

    const { error } = await supabase
      .from('carts')
      .upsert(
        {
          user_id: userId,
          items,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('Error saving cart to Supabase:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: items.length })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save cart'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({ success: true })
    }

    const { error } = await supabase
      .from('carts')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('Error clearing cart:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to clear cart'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

