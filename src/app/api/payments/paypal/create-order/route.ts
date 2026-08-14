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
      }),
    });

    const order = await res.json();
    if (!res.ok) {
      console.error('PayPal create-order failed:', JSON.stringify(order));
      return NextResponse.json({ error: "Couldn't start PayPal payment. Please try again." }, { status: 502 });
    }

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
    return NextResponse.json({ error: "Couldn't start PayPal payment. Please try again." }, { status: 502 });
  }
}
