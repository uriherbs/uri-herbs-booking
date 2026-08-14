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

  try {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.create({
      amount: thbToSatang(booking.total_price_thb),
      currency: 'thb',
      description: `Uri Herbs Workshop — ${booking.booking_ref}`,
      metadata: { booking_id: booking.id, booking_ref: booking.booking_ref },
      automatic_payment_methods: { enabled: true },
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
    console.error('Stripe create-intent failed:', err.message);
    return NextResponse.json({ error: "Couldn't start card payment. Please try again." }, { status: 502 });
  }
}
