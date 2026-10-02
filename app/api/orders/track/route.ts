import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { orderId, phone } = await request.json()

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'Order reference number is required.' }, { status: 400 })
    }

    const cleanRef = orderId.trim()
    const cleanPhone = phone ? String(phone).replace(/\s+/g, '').replace(/^\+234/, '0') : ''

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({
        error: 'Database is operating in local demo mode. Search from your browser order history.',
        localOnly: true,
      })
    }

    // Try finding via RPC track_order
    const { data: rpcData, error: rpcError } = await supabase.rpc('track_order', {
      p_order_id: cleanRef,
      p_phone: cleanPhone || null,
    })

    if (!rpcError && rpcData && rpcData.length > 0) {
      return NextResponse.json({ success: true, order: rpcData[0] })
    }

    // Fallback: direct query on orders table
    let query = supabase
      .from('orders')
      .select('id,customer_name,customer_phone,customer_address,subtotal,delivery_fee,total,status,items,created_at,updated_at')

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (isUuid.test(cleanRef)) {
      query = query.eq('id', cleanRef)
    } else {
      query = query.ilike('id', `${cleanRef}%`)
    }

    const { data: orders, error: orderErr } = await query.limit(1)

    if (orderErr || !orders || orders.length === 0) {
      return NextResponse.json({ error: 'Order not found. Please check your reference code.' }, { status: 404 })
    }

    const order = orders[0]

    // Phone verification check if provided
    if (cleanPhone) {
      const orderPhoneNormalized = String(order.customer_phone || '').replace(/\s+/g, '').replace(/^\+234/, '0')
      const phoneTail = cleanPhone.slice(-8)
      if (!orderPhoneNormalized.includes(phoneTail)) {
        return NextResponse.json(
          { error: 'Phone number does not match this order reference.' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({ success: true, order })
  } catch (error: any) {
    console.error('[API Track Order] Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error looking up order.' },
      { status: 500 }
    )
  }
}
