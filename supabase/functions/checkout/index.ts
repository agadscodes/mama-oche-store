// @ts-nocheck
// supabase/functions/checkout/index.ts
// Mama Oche Serverless Order Processing & Mailgun Dispatch Edge Function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CartItemInput {
  productId: string
  quantity: number
  unitPrice?: number
  name?: string
  unit?: string
}

interface CustomerInput {
  name: string
  phone: string
  email?: string
  address: string
  notes?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { items, customer, userId } = await req.json() as {
      items: CartItemInput[]
      customer: CustomerInput
      userId?: string | null
    }

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'Cart is empty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!customer?.name || !customer?.phone || !customer?.address) {
      return new Response(JSON.stringify({ error: 'Missing required customer details' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('NEXT_PUBLIC_SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. Fetch real product prices from database to prevent client tampering
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const validUuids = items.map((i) => i.productId).filter((id) => isUuid.test(id))

    let dbProducts: any[] = []
    if (validUuids.length > 0) {
      const { data } = await supabase.from('products').select('*').in('id', validUuids)
      dbProducts = data || []
    }

    let subtotal = 0
    const verifiedItems = items.map((cartItem) => {
      const dbProduct = dbProducts.find((p) => p.id === cartItem.productId)
      const unitPrice = dbProduct ? Number(dbProduct.price) : Number(cartItem.unitPrice || 0)
      const name = dbProduct ? dbProduct.name : (cartItem.name || 'Provision')
      const unit = dbProduct ? dbProduct.unit : (cartItem.unit || 'item')
      const quantity = Math.max(1, Number(cartItem.quantity || 1))

      subtotal += unitPrice * quantity

      return {
        product_id: isUuid.test(cartItem.productId) ? cartItem.productId : null,
        product_name: name,
        unit,
        quantity,
        unit_price: unitPrice,
      }
    })

    const deliveryFee = subtotal >= 20000 || subtotal === 0 ? 0 : 1000
    const totalAmount = subtotal + deliveryFee

    const fullAddress = customer.notes
      ? `${customer.address.trim()} (Note: ${customer.notes.trim()})`
      : customer.address.trim()

    // 2. Insert Order Record
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id: userId || null,
        customer_name: customer.name.trim(),
        customer_email: customer.email?.trim() || null,
        customer_phone: customer.phone.trim(),
        customer_address: fullAddress,
        delivery_notes: customer.notes?.trim() || null,
        subtotal,
        delivery_fee: deliveryFee,
        total: totalAmount,
        items: verifiedItems,
        status: 'pending',
      })
      .select()
      .single()

    if (orderErr) throw orderErr

    // 3. Insert Line Items
    if (order?.id) {
      const lineItems = verifiedItems.map((item) => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        unit: item.unit,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }))
      await supabase.from('order_items').insert(lineItems)
    }

    // 4. Send Order Confirmation Email via Mailgun API (if configured)
    const mailgunApiKey = Deno.env.get('MAILGUN_API_KEY')
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN')

    if (mailgunApiKey && mailgunDomain && customer.email) {
      try {
        const authHeader = 'Basic ' + btoa(`api:${mailgunApiKey}`)
        const itemsSummary = verifiedItems
          .map(
            (i) =>
              `<tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${i.quantity}x ${i.product_name} (${i.unit})</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">₦${(i.unit_price * i.quantity).toLocaleString('en-NG')}</td>
              </tr>`
          )
          .join('')

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2eee8; border-radius: 16px; overflow: hidden;">
            <div style="background: #0b5b43; padding: 24px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0; font-size: 24px;">Mama Oche Provisions</h1>
              <p style="margin: 4px 0 0; font-size: 13px; color: #d7f6e4;">Order Confirmation #${String(order.id).slice(0, 8).toUpperCase()}</p>
            </div>
            <div style="padding: 24px;">
              <h2 style="color: #10231c; font-size: 18px; margin-top: 0;">Thank you for your order, ${customer.name}!</h2>
              <p style="color: #51665d; font-size: 14px; line-height: 1.5;">We have received your order. Our dispatch rider will call you at <strong>${customer.phone}</strong> when approaching your address.</p>
              
              <div style="margin: 20px 0; background: #f8fcfa; border: 1px solid #e2eee8; border-radius: 12px; padding: 16px;">
                <p style="margin: 0 0 8px; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #0b8a61;">Delivery Address</p>
                <p style="margin: 0; font-size: 14px; color: #19342a;">${fullAddress}</p>
              </div>

              <table style="width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px;">
                <thead>
                  <tr style="background: #eff9f2; text-align: left; color: #0b5b43;">
                    <th style="padding: 8px 12px; border-radius: 6px 0 0 6px;">Item</th>
                    <th style="padding: 8px 12px; text-align: right; border-radius: 0 6px 6px 0;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsSummary}
                </tbody>
              </table>

              <div style="margin-top: 16px; border-top: 2px solid #e2eee8; padding-top: 12px; font-size: 14px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #60736a;">
                  <span>Subtotal:</span>
                  <span>₦${subtotal.toLocaleString('en-NG')}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #60736a;">
                  <span>Delivery Fee:</span>
                  <span>${deliveryFee === 0 ? 'Free' : `₦${deliveryFee.toLocaleString('en-NG')}`}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; color: #0b5b43; border-top: 1px solid #e2eee8; padding-top: 8px;">
                  <span>Total Due on Arrival:</span>
                  <span>₦${totalAmount.toLocaleString('en-NG')}</span>
                </div>
              </div>

              <p style="margin-top: 24px; font-size: 12px; color: #71847b; text-align: center;">
                Need help? Call us at +234 (0) 800 MAMA OCHE or reply to this email.
              </p>
            </div>
          </div>
        `

        const formData = new FormData()
        formData.append('from', `Mama Oche <orders@${mailgunDomain}>`)
        formData.append('to', customer.email)
        formData.append('subject', `Order Confirmed: #${String(order.id).slice(0, 8).toUpperCase()}`)
        formData.append('html', emailHtml)

        await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
          method: 'POST',
          headers: { Authorization: authHeader },
          body: formData,
        })
      } catch (emailErr) {
        console.error('Mailgun dispatch failed:', emailErr)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        created_at: order.created_at,
        total: totalAmount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
