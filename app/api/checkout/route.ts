import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { DEFAULT_PRODUCTS, OrderItem } from '@/lib/store-data'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { items, customer, userId } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty.' }, { status: 400 })
    }

    const trimmedName = customer?.name?.trim()
    const trimmedPhone = customer?.phone?.trim()
    const trimmedAddress = customer?.address?.trim()
    const trimmedEmail = customer?.email?.trim() || null
    const trimmedNotes = customer?.notes?.trim() || null

    if (!trimmedName || !trimmedPhone || !trimmedAddress) {
      return NextResponse.json(
        { error: 'Please provide customer name, phone number, and delivery address.' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()

    // 1. Price Verification: Look up products from database or fallback catalog
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const itemIds = items.map((i: any) => String(i.id || i.product_id))
    const validUuids = itemIds.filter((id) => isUuid.test(id))

    let dbProductMap = new Map<string, { price: number; name: string; unit: string }>()

    if (supabase && validUuids.length > 0) {
      const { data: dbProducts } = await supabase
        .from('products')
        .select('id,name,price,unit')
        .in('id', validUuids)

      if (dbProducts) {
        for (const p of dbProducts) {
          dbProductMap.set(String(p.id), {
            price: Number(p.price),
            name: String(p.name),
            unit: String(p.unit),
          })
        }
      }
    }

    // Default products fallback map
    for (const dp of DEFAULT_PRODUCTS) {
      if (!dbProductMap.has(dp.id)) {
        dbProductMap.set(dp.id, {
          price: dp.price,
          name: dp.name,
          unit: dp.unit,
        })
      }
    }

    let subtotal = 0
    const verifiedOrderItems: OrderItem[] = items.map((item: any) => {
      const pid = String(item.id || item.product_id)
      const catalogItem = dbProductMap.get(pid)
      const unitPrice = catalogItem ? catalogItem.price : Number(item.price || item.unit_price || 0)
      const productName = catalogItem ? catalogItem.name : String(item.name || item.product_name || 'Provision')
      const unit = catalogItem ? catalogItem.unit : String(item.unit || 'item')
      const quantity = Math.max(1, Number(item.quantity || 1))

      subtotal += unitPrice * quantity

      return {
        product_id: pid,
        product_name: productName,
        unit,
        quantity,
        unit_price: unitPrice,
      }
    })

    const deliveryFee = subtotal >= 20000 || subtotal === 0 ? 0 : 1000
    const total = subtotal + deliveryFee
    const nowIso = new Date().toISOString()
    const fullAddress = trimmedNotes
      ? `${trimmedAddress} (Note: ${trimmedNotes})`
      : trimmedAddress

    let orderId = `MO-${Date.now().toString(36).toUpperCase().slice(-6)}`
    let createdAt = nowIso

    // 2. Persist to Supabase if connected
    if (supabase) {
      const { data: insertedOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          user_id: userId || null,
          customer_name: trimmedName,
          customer_email: trimmedEmail,
          customer_phone: trimmedPhone,
          customer_address: fullAddress,
          delivery_notes: trimmedNotes,
          subtotal,
          delivery_fee: deliveryFee,
          total,
          items: verifiedOrderItems,
          status: 'pending',
        })
        .select('id,created_at')
        .maybeSingle()

      if (!insertError && insertedOrder) {
        orderId = String(insertedOrder.id)
        createdAt = String(insertedOrder.created_at || nowIso)

        // Insert order_items
        const lineItems = verifiedOrderItems.map((item) => ({
          order_id: orderId,
          product_id: isUuid.test(item.product_id) ? item.product_id : null,
          product_name: item.product_name,
          unit: item.unit,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }))

        await supabase.from('order_items').insert(lineItems)
      }
    }

    // 3. Dispatch Mailgun Order Confirmation Email if keys are configured
    const mailgunApiKey = process.env.MAILGUN_API_KEY
    const mailgunDomain = process.env.MAILGUN_DOMAIN

    if (mailgunApiKey && mailgunDomain && trimmedEmail) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`api:${mailgunApiKey}`).toString('base64')
        const itemsRows = verifiedOrderItems
          .map(
            (i) =>
              `<tr>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb;">${i.quantity}x ${i.product_name} (${i.unit})</td>
                <td style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #0b5b43;">₦${(i.unit_price * i.quantity).toLocaleString('en-NG')}</td>
              </tr>`
          )
          .join('')

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5faf6; margin: 0; padding: 24px;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #d7e8dc; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(11, 91, 67, 0.06);">
              <div style="background: #0b5b43; padding: 28px 24px; text-align: center; color: #ffffff;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Mama Oche Provisions</h1>
                <p style="margin: 6px 0 0; font-size: 13px; color: #b7f2cc; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Order Confirmation #${orderId.slice(0, 8).toUpperCase()}</p>
              </div>
              <div style="padding: 28px;">
                <h2 style="color: #10231c; font-size: 20px; margin-top: 0;">Thank you, ${trimmedName}!</h2>
                <p style="color: #51665d; font-size: 14px; line-height: 1.6;">
                  We have received your order. Our dispatch desk is preparing your provisions for same-day delivery. Our rider will reach you at <strong>${trimmedPhone}</strong> upon arrival.
                </p>

                <div style="margin: 20px 0; background: #f8fcfa; border: 1px solid #e2eee8; border-radius: 12px; padding: 16px;">
                  <p style="margin: 0 0 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0b8a61; letter-spacing: 0.5px;">Delivery Location</p>
                  <p style="margin: 0; font-size: 14px; color: #19342a; line-height: 1.5;">${fullAddress}</p>
                </div>

                <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px;">
                  <thead>
                    <tr style="background: #eff9f2; text-align: left; color: #0b5b43;">
                      <th style="padding: 10px 14px; border-radius: 8px 0 0 8px;">Provision</th>
                      <th style="padding: 10px 14px; text-align: right; border-radius: 0 8px 8px 0;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsRows}
                  </tbody>
                </table>

                <div style="margin-top: 20px; border-top: 2px solid #e2eee8; padding-top: 14px; font-size: 14px;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #60736a;">
                    <span>Subtotal:</span>
                    <span>₦${subtotal.toLocaleString('en-NG')}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #60736a;">
                    <span>Delivery Fee:</span>
                    <span>${deliveryFee === 0 ? 'Free' : `₦${deliveryFee.toLocaleString('en-NG')}`}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between; font-size: 17px; font-weight: 800; color: #0b5b43; border-top: 1px solid #e2eee8; padding-top: 10px;">
                    <span>Total Due on Arrival:</span>
                    <span>₦${total.toLocaleString('en-NG')}</span>
                  </div>
                </div>

                <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid #f0f6f2; text-align: center; color: #71847b; font-size: 12px; line-height: 1.5;">
                  <p style="margin: 0;">Payment Method: <strong>Cash or Bank Transfer on Delivery</strong></p>
                  <p style="margin: 6px 0 0;">Need immediate changes? Call our dispatch line: <strong>09034006248</strong></p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `

        const formData = new FormData()
        formData.append('from', `Mama Oche Orders <orders@${mailgunDomain}>`)
        formData.append('to', trimmedEmail)
        formData.append('subject', `Order Confirmed: #${orderId.slice(0, 8).toUpperCase()}`)
        formData.append('html', emailHtml)

        await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
          method: 'POST',
          headers: { Authorization: authHeader },
          body: formData,
        })
      } catch (mailErr) {
        console.error('[API Checkout] Mailgun dispatch notification error:', mailErr)
      }
    }

    const orderRecord = {
      id: orderId,
      customer_name: trimmedName,
      customer_email: trimmedEmail,
      customer_phone: trimmedPhone,
      customer_address: fullAddress,
      delivery_notes: trimmedNotes,
      subtotal,
      delivery_fee: deliveryFee,
      total,
      items: verifiedOrderItems,
      status: 'pending' as const,
      created_at: createdAt,
    }

    return NextResponse.json({
      success: true,
      order: orderRecord,
    })
  } catch (error: any) {
    console.error('[API Checkout] Error processing order:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error processing checkout.' },
      { status: 500 }
    )
  }
}
