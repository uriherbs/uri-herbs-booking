// ============================================================
// POST /api/payments/stripe/webhook
// ============================================================
// Stripe calls this whenever a PaymentIntent's status changes. This
// is the AUTHORITATIVE source of truth for "a real payment
// succeeded" — the browser's own confirmPayment() result is only
// used to optimistically move the UI forward; the actual DB write
// (confirm_booking_payment, service-role only) happens here.
//
// Setup: this route's URL must be registered in the Stripe Dashboard
// (Developers → Webhooks) once the app is deployed, which is the only
// way to get a real STRIPE_WEBHOOK_SECRET — see the setup guide for
// exact steps. Until that env var is set, this route will 500 on
// every delivery (loud on purpose, not a silent no-op).
//
// Signature verification needs the RAW request body — request.text()
// below, never request.json() first (JSON.stringify(JSON.parse(x)) is
// not guaranteed byte-identical to x, which would break the HMAC).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getStripe } from '@/lib/stripe-server';
import { sendBookingConfirmationEmails } from '@/lib/notifications';

export const runtime = 'nodejs'; // Stripe's SDK needs Node, not Edge

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const rawBody = await request.text();

  let event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const db = getServiceClient();

  // Idempotency: Stripe redelivers on any non-2xx (and sometimes even
  // on 2xx, per their own docs — "at least once" delivery). Insert
  // the event id first; if it's already there, this is a duplicate
  // delivery and we skip straight to 200 without reprocessing.
  const { error: insertError } = await db.from('payment_events').insert({
    id: event.id,
    provider: 'stripe',
    event_type: event.type,
    payload: event as any,
  });
  if (insertError) {
    // Unique-violation on `id` means we've already handled this event.
    if (insertError.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('Failed to record payment_events row:', insertError.message);
    // Fall through and still try to process — better to risk a
    // duplicate confirm_booking_payment call (which is itself
    // idempotent) than to silently drop a real payment event.
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as any;
      const bookingRef = intent.metadata?.booking_ref;
      if (!bookingRef) {
        console.error('payment_intent.succeeded with no booking_ref in metadata:', intent.id);
        return NextResponse.json({ received: true });
      }

      const { data, error } = await db.rpc('confirm_booking_payment', {
        p_booking_ref: bookingRef,
        p_payment_method: 'stripe',
        p_payment_provider_ref: intent.id,
      });

      if (error) {
        // BOOKING_NOT_PAYABLE (e.g. the 30-min expiry cron already
        // cancelled it before this very late webhook arrived) needs a
        // human — a real payment succeeded but we can't honor the
        // booking. Logged loudly so it's visible in Vercel's function
        // logs; the money sits with Stripe until manually refunded.
        console.error(`confirm_booking_payment failed for ${bookingRef}:`, error.message);
      } else if (data?.[0]?.booking_id) {
        // Best-effort — a failed email must never turn a real,
        // successful payment into a webhook error (Stripe would just
        // retry, redelivering a payment we already confirmed).
        await sendBookingConfirmationEmails(db, data[0].booking_id).catch((err) =>
          console.error(`sendBookingConfirmationEmails threw for ${bookingRef}:`, err?.message)
        );
      }
    }
    // payment_intent.payment_failed and others: no DB action needed —
    // the booking stays pending_payment and the customer can retry
    // the same PaymentIntent in the UI. The payment_events row above
    // already captured it for the audit trail.
  } catch (err: any) {
    console.error('Stripe webhook handler error:', err.message);
    // Still return 200 — we've recorded the event; retrying won't
    // help if this was a bug in our handler, and Stripe's retry
    // schedule is not something to lean on as the primary fix path.
  }

  return NextResponse.json({ received: true });
}
