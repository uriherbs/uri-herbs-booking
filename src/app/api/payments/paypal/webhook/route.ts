// ============================================================
// POST /api/payments/paypal/webhook
// ============================================================
// Backstop for capture-order: if PayPal's capture succeeded but the
// response never reached the browser (tab closed, network drop),
// this still confirms the booking. Also the more resilient path if a
// customer somehow approves in one tab/device and the app-side
// capture call never fires.
//
// Setup: this route's URL + a PAYPAL_WEBHOOK_ID must be registered in
// the PayPal Developer Dashboard once deployed — see the setup guide.
// Until PAYPAL_WEBHOOK_ID is set, this route 500s on every delivery
// (loud on purpose).
//
// Unlike Stripe's HMAC-based signing (verifiable with pure local
// crypto), PayPal's webhook signature verification is itself a REST
// call to PayPal (POST /v1/notifications/verify-webhook-signature) —
// there's no way to check this route's correctness without live
// network access to PayPal, which this dev environment doesn't have.
// It's implemented exactly per PayPal's documented flow; the manual
// QA pass is the real test for this one.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { PAYPAL_API_BASE, getPayPalAccessToken } from '@/lib/paypal-server';

export async function POST(request: NextRequest) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error('PAYPAL_WEBHOOK_ID is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const rawBody = await request.text();
  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  try {
    const accessToken = await getPayPalAccessToken();
    const verifyRes = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        auth_algo: request.headers.get('paypal-auth-algo'),
        cert_url: request.headers.get('paypal-cert-url'),
        transmission_id: request.headers.get('paypal-transmission-id'),
        transmission_sig: request.headers.get('paypal-transmission-sig'),
        transmission_time: request.headers.get('paypal-transmission-time'),
        webhook_id: webhookId,
        webhook_event: event,
      }),
    });

    const verification = await verifyRes.json();
    if (!verifyRes.ok || verification.verification_status !== 'SUCCESS') {
      console.error('PayPal webhook signature verification failed:', JSON.stringify(verification));
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('PayPal webhook verification error:', err.message);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }

  const db = getServiceClient();

  // Idempotency, same pattern as the Stripe webhook.
  const { error: insertError } = await db.from('payment_events').insert({
    id: event.id,
    provider: 'paypal',
    event_type: event.event_type,
    payload: event,
  });
  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('Failed to record payment_events row:', insertError.message);
  }

  try {
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const resource = event.resource;
      const bookingId = resource?.custom_id;
      const orderId = resource?.supplementary_data?.related_ids?.order_id;

      let bookingRef: string | null = null;
      if (bookingId) {
        const { data: booking } = await db.from('bookings').select('booking_ref').eq('id', bookingId).single();
        bookingRef = booking?.booking_ref ?? null;
      }

      if (!bookingRef) {
        console.error('PAYMENT.CAPTURE.COMPLETED with no resolvable booking:', bookingId, orderId);
        return NextResponse.json({ received: true });
      }

      const { error } = await db.rpc('confirm_booking_payment', {
        p_booking_ref: bookingRef,
        p_payment_method: 'paypal',
        p_payment_provider_ref: orderId ?? bookingId,
      });

      if (error) {
        console.error(`confirm_booking_payment failed for ${bookingRef}:`, error.message);
      }
    }
  } catch (err: any) {
    console.error('PayPal webhook handler error:', err.message);
  }

  return NextResponse.json({ received: true });
}
