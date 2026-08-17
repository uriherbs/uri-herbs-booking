// ============================================================
// POST /api/payments/stripe/create-intent
// ============================================================
// Called from the Payment step the moment the customer picks "Pay
// with Card". Creates a Stripe PaymentIntent for the booking's
// ALREADY-COMPUTED price (bookings.total_price_thb, set atomically by
// create_booking() — this route never accepts or trusts an amount
// from the client) and returns what the browser needs to mount the
// embedded Payment Element.
//
// Security: uses the service-role Supabase client (bypasses RLS) to
// read the booking, since the anon client has no special reason to
// be able to read arbitrary bookings by id. STRIPE_SECRET_KEY never
// leaves this server-side route.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { getStripe, thbToSatang } from '@/lib/stripe-server';

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

  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!publishableKey || !process.env.STRIPE_SECRET_KEY) {
    console.error('Stripe env vars are not configured');
    return NextResponse.json({ error: 'Card payment is not available right now.' }, { status: 500 });
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

  if (booking.status !== 'pending_payment') {
    return NextResponse.json(
      { error: 'This booking is no longer awaiting payment. Please start a new booking.' },
      { status: 409 }
    );
  }

  if (!booking.total_price_thb || booking.total_price_thb <= 0) {
    console.error(`Booking ${booking.booking_ref} has an invalid price:`, booking.total_price_thb);
    return NextResponse.json({ error: 'This booking has an invalid price. Please contact us.' }, { status: 500 });
  }

  try {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.create({
      amount: thbToSatang(booking.total_price_thb),
      currency: 'thb',
      description: `Uri Herbs Workshop — ${booking.booking_ref}`,
      metadata: { booking_id: booking.id, booking_ref: booking.booking_ref },
      // Explicit 'card' instead of automatic_payment_methods: the UI
      // button already says "Pay with Card" specifically, and
      // automatic_payment_methods resolves its set dynamically from
      // what's enabled for THB in the Stripe Dashboard — on an account
      // that hasn't explicitly turned on THB-compatible methods beyond
      // cards, that resolution can come back empty and the create()
      // call fails outright. 'card' is available on every Stripe
      // account regardless of Dashboard configuration, so this removes
      // that whole failure mode rather than just working around it.
      payment_method_types: ['card'],
    });

    // Record which PaymentIntent belongs to this booking so the
    // webhook can look the booking up, and so capture-order's sibling
    // check pattern is consistent across both providers. This is NOT
    // the "paid" write — only confirm_booking_payment() sets
    // payment_status='paid', and only on real confirmed payment.
    await db
      .from('bookings')
      .update({ payment_method: 'stripe', payment_provider_ref: intent.id })
      .eq('id', booking.id)
      .eq('status', 'pending_payment');

    return NextResponse.json({
      client_secret: intent.client_secret,
      publishable_key: publishableKey,
    });
  } catch (err: any) {
    // Stripe errors carry structured detail beyond .message (type,
    // code, the specific param that was rejected) — logging only the
    // message on a previous version of this route is exactly why Bug
    // 1's root cause wasn't visible from Vercel's logs alone. Logging
    // the full shape here means the next failure (if any) is
    // diagnosable without another guess-and-redeploy round.
    console.error('Stripe create-intent failed:', {
      message: err?.message,
      type: err?.type,
      code: err?.code,
      param: err?.param,
      statusCode: err?.statusCode,
      requestId: err?.requestId,
    });
    return NextResponse.json({ error: "Couldn't start card payment. Please try again." }, { status: 502 });
  }
}
