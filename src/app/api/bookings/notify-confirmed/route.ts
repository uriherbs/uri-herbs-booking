// ============================================================
// POST /api/bookings/notify-confirmed
// ============================================================
// Sends the customer confirmation + owner notification emails for a
// booking. Every OTHER confirmation path (Stripe webhook, PayPal
// capture-order, PayPal webhook) already triggers
// sendBookingConfirmationEmails() itself, server-side, right where it
// confirms the booking — this route exists only for the Pay Later
// path, which confirms bookings via a direct client-side call to the
// confirm_pay_later_booking() RPC (src/lib/booking-service.ts →
// confirmPayLaterBooking()) rather than through a server route, so
// there's nowhere else server-side to hook this in.
//
// Safe to call redundantly, or even speculatively from any
// confirmation path: sendBookingConfirmationEmails() itself claims
// the send atomically via bookings.confirmation_email_sent, so a
// booking already emailed through one of the payment webhooks just
// no-ops here.
//
// Trusts the client on WHICH booking to check, not on whether it's
// actually confirmed — that's re-verified against the database below
// before anything is sent, same principle as capture-order's
// server-side amount check.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { sendBookingConfirmationEmails } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const bookingRef = typeof body.booking_ref === 'string' ? body.booking_ref.trim().toUpperCase() : '';
  if (!bookingRef) {
    return NextResponse.json({ error: 'booking_ref is required' }, { status: 400 });
  }

  const db = getServiceClient();
  const { data: booking, error } = await db
    .from('bookings')
    .select('id, status')
    .eq('booking_ref', bookingRef)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.status !== 'confirmed') {
    // Not an error — just nothing to notify about yet (e.g. called
    // too early, or the booking was never confirmed).
    return NextResponse.json({ sent: false });
  }

  await sendBookingConfirmationEmails(db, booking.id).catch((err) =>
    console.error(`sendBookingConfirmationEmails threw for ${bookingRef}:`, err?.message)
  );

  return NextResponse.json({ sent: true });
}
