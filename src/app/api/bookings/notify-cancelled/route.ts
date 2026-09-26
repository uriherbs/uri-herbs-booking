// ============================================================
// POST /api/bookings/notify-cancelled
// ============================================================
// Sends the customer cancellation email for a booking. Mirrors
// /api/bookings/notify-confirmed exactly, just for the cancellation
// side: cancelBookingAsAdmin() (src/lib/booking-service.ts) calls the
// admin_cancel_booking RPC directly with the anon key (it can't send
// emails itself — RESEND_API_KEY is server-only), then hits this
// route so the actual send happens server-side with the service role
// client.
//
// Safe to call redundantly: sendCancellationEmail() claims the send
// atomically via bookings.cancellation_email_sent, so a booking
// already emailed just no-ops here.
//
// Trusts the client on WHICH booking to check, not on whether it's
// actually cancelled — that's re-verified against the database below
// before anything is sent.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { sendCancellationEmail } from '@/lib/notifications';

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

  if (booking.status !== 'cancelled') {
    // Not an error — just nothing to notify about (e.g. called before
    // the cancellation actually landed, or the booking was never
    // cancelled).
    return NextResponse.json({ sent: false });
  }

  await sendCancellationEmail(db, booking.id).catch((err) =>
    console.error(`sendCancellationEmail threw for ${bookingRef}:`, err?.message)
  );

  return NextResponse.json({ sent: true });
}
