// ============================================================
// POST /api/payments/paypal/create-order
// ============================================================
// Called from the PayPal Buttons' createOrder callback. Creates a
// PayPal Order for the booking's ALREADY-COMPUTED price
// (bookings.total_price_thb — never a client-supplied amount).
// PAYPAL_SECRET never leaves this server-side route.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { PAYPAL_API_BASE, getPayPalAccessToken, thbToPayPalValue } from '@/lib/paypal-server';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const bookingId = typeof body.booking_id === 'string' ? body.booking_id : '';
  if (!bookingId) {
    return NextResponse.json({ error: 'booking_id is required' }, { status: 400 });
  }

  const db = getServiceClient();
  const { data: booking, error: fetchError } = await db
    .from('bookings')
    .select('id, booking_ref, status, total_price_thb')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.status !== 'pending_payment') {
    return NextResponse.json(
      { error: 'This booking is no longer awaiting payment. Please start a new booking.' },
      { status: 409 }
    );
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: booking.booking_ref,
            custom_id: booking.id,
            description: `Uri Herbs Workshop — ${booking.booking_ref}`,
            amount: {
              currency_code: 'THB',
              value: thbToPayPalValue(booking.total_price_thb),
            },
          },
        ],
        // This is a service booking, not a shipped good — without this,
        // PayPal's hosted checkout defaults to collecting a shipping
        // address, which is both irrelevant here and one more thing
        // that can interact with its risk/compliance evaluation of the
        // order. brand_name/user_action are minor UX polish (shows our
        // name instead of a blank one; skips an extra "Continue" step).
        application_context: {
          shipping_preference: 'NO_SHIPPING',
          brand_name: 'Uri Herbs Workshop',
          user_action: 'PAY_NOW',
        },
      }),
    });

    const order = await res.json();
    if (!res.ok) {
      console.error('PayPal create-order failed:', JSON.stringify(order));
      // `detail` surfaces PayPal's actual error body (name, message,
      // debug_id, details[]) instead of forcing every failure through
      // the same generic message — same fix applied to the Stripe
      // create-intent route. Safe to return: this is PayPal's own
      // error payload, never contains PAYPAL_SECRET or other server
      // config, only order-specific diagnostic info.
      return NextResponse.json(
        { error: "Couldn't start PayPal payment. Please try again.", detail: order },
        { status: 502 }
      );
    }
    // Order creation itself succeeding is not the whole story for this
    // bug — Bug 2's COMPLIANCE_VIOLATION happens on PayPal's OWN hosted
    // checkout page, after this call already returned an order id. Log
    // the created order's id/status regardless, so a support request to
    // PayPal (or a look at the Sandbox dashboard's order activity) has
    // something concrete to reference.
    console.log(`PayPal order created: ${order.id} (status: ${order.status}) for booking ${booking.booking_ref}`);

    // Same bookkeeping as the Stripe route: record which order
    // belongs to this booking (checked again in capture-order below)
    // — not a "paid" write, just linkage.
    await db
      .from('bookings')
      .update({ payment_method: 'paypal', payment_provider_ref: order.id })
      .eq('id', booking.id)
      .eq('status', 'pending_payment');

    return NextResponse.json({ order_id: order.id });
  } catch (err: any) {
    console.error('PayPal create-order error:', err.message);
    return NextResponse.json(
      { error: "Couldn't start PayPal payment. Please try again.", detail: { message: err.message } },
      { status: 502 }
    );
  }
}
