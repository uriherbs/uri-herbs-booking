// ============================================================
// POST /api/payments/paypal/capture-order
// ============================================================
// Called from the PayPal Buttons' onApprove callback. This — not the
// client-side "approved" event — is what actually captures the money
// and is the primary place confirm_booking_payment() gets called for
// PayPal (the PayPal webhook, task #12's other route, is a backstop
// for the case where the capture below succeeds on PayPal's side but
// the response never makes it back to this browser tab).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { PAYPAL_API_BASE, getPayPalAccessToken } from '@/lib/paypal-server';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const bookingId = typeof body.booking_id === 'string' ? body.booking_id : '';
  const orderId = typeof body.order_id === 'string' ? body.order_id : '';
  if (!bookingId || !orderId) {
    return NextResponse.json({ error: 'booking_id and order_id are required' }, { status: 400 });
  }

  const db = getServiceClient();
  const { data: booking, error: fetchError } = await db
    .from('bookings')
    .select('id, booking_ref, status, total_price_thb, payment_provider_ref')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  // The order being captured must be the one WE created for THIS
  // booking (set in create-order) — never trust a client-supplied
  // order_id blindly, even though capturing a stranger's order
  // wouldn't move money into our account either way. Defense in depth.
  if (booking.payment_provider_ref !== orderId) {
    return NextResponse.json({ error: 'Order does not match this booking.' }, { status: 400 });
  }

  if (booking.status === 'confirmed') {
    // Already confirmed (e.g. the webhook beat this request there) —
    // idempotent success, not an error.
    return NextResponse.json({ booking_ref: booking.booking_ref, status: 'confirmed' });
  }

  if (booking.status !== 'pending_payment') {
    return NextResponse.json(
      { error: 'This booking is no longer awaiting payment. Please start a new booking.' },
      { status: 409 }
    );
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const res = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const capture = await res.json();
    if (!res.ok) {
      console.error('PayPal capture failed:', JSON.stringify(capture));
      return NextResponse.json({ error: "Payment couldn't be completed. Please try again." }, { status: 502 });
    }

    const captureUnit = capture.purchase_units?.[0]?.payments?.captures?.[0];
    const captureStatus = captureUnit?.status;
    if (capture.status !== 'COMPLETED' || captureStatus !== 'COMPLETED') {
      console.error('PayPal order captured but not COMPLETED:', JSON.stringify(capture));
      return NextResponse.json({ error: 'Payment was not completed.' }, { status: 402 });
    }

    // Defense-in-depth amount check — the amount was already fixed
    // server-side at order-creation time, but re-verifying the actual
    // captured amount against the booking's price is cheap insurance.
    const capturedValue = parseFloat(captureUnit?.amount?.value ?? '0');
    if (Math.abs(capturedValue - booking.total_price_thb) > 0.01) {
      console.error(
        `PayPal captured amount mismatch for ${booking.booking_ref}: captured ${capturedValue}, expected ${booking.total_price_thb}`
      );
      return NextResponse.json({ error: 'Payment amount mismatch — please contact us.' }, { status: 500 });
    }

    const { error: confirmError } = await db.rpc('confirm_booking_payment', {
      p_booking_ref: booking.booking_ref,
      p_payment_method: 'paypal',
      p_payment_provider_ref: orderId,
    });

    if (confirmError) {
      console.error(`confirm_booking_payment failed for ${booking.booking_ref}:`, confirmError.message);
      return NextResponse.json(
        { error: 'Payment succeeded but the booking could not be confirmed. Please contact us with your reference.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ booking_ref: booking.booking_ref, status: 'confirmed' });
  } catch (err: any) {
    console.error('PayPal capture-order error:', err.message);
    return NextResponse.json({ error: "Payment couldn't be completed. Please try again." }, { status: 502 });
  }
}
