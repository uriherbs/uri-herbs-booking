// ============================================================
// POST /api/bookings/notify-cancelled
// ============================================================
// Sends the customer cancellation email for a booking. The admin
// dashboard cancels bookings via a direct client-side call to the
// admin_cancel_booking() RPC (src/lib/hooks.ts → adminCancelBooking()),
// same as every other admin action — that RPC only flips the DB row
// (no Resend API key available client-side), so this route exists to
// do the actual emailing server-side right after, mirroring
// /api/bookings/notify-confirmed's role for the Pay Later path.
//
// Safe to call redundantly: sendBookingCancellationEmail() claims the
// send atomically via bookings.cancellation_email_sent, so a booking
// already emailed just no-ops here.
//
// Trusts the client on WHICH booking to check, not on whether it's
// actually cancelled — that's re-verified against the database below
// before anything is sent.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { sendBookingCancellationEmail } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const bookingId = typeof body.booking_id === 'string' ? body.booking_id.trim() : '';
  if (!bookingId) {
    return NextResponse.json({ error: 'booking_id is required' }, { status: 400 });
  }

  const db = getServiceClient();
  const { data: booking, error } = await db
    .from('bookings')
    .select('id, status')
    .eq('id', bookingId)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  if (booking.status !== 'cancelled') {
    // Not an error — just nothing to notify about (e.g. called before
    // the cancellation actually committed, or the RPC no-op'd).
    return NextResponse.json({ sent: false });
  }

  await sendBookingCancellationEmail(db, booking.id).catch((err) =>
    console.error(`sendBookingCancellationEmail threw for ${bookingId}:`, err?.message)
  );

  return NextResponse.json({ sent: true });
}
