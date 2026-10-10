// ============================================================
// POST /api/bookings/notify-cancelled
// ============================================================
// Sends the customer cancellation email for a booking, plus a shop copy
// ("Booking cancelled by staff (admin)") so admin cancellations leave a
// record in the shop inbox like customer/platform ones do. Mirrors
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
import { sendCancellationEmail, sendOwnerCancellationEmail } from '@/lib/notifications';
import { syncBookingToCalendar } from '@/lib/google-calendar';
import { sendAgencyShopCancelledEmail } from '@/lib/agency-emails';

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
    .select('id, status, agency_id, cancelled_by')
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

  // Agency bookings cancelled by the agency itself or by the payment
  // deadline have their own emails (agency-emails.ts) — only a shop/admin
  // cancellation (cancelled_by = 'staff', set by admin_cancel_booking) is
  // handled here, so this public route can't send a wrong "cancelled by
  // the shop" email for them.
  if (booking.agency_id && booking.cancelled_by !== 'staff') {
    return NextResponse.json({ sent: false });
  }

  // Only the call that wins the claim sends the shop copy too, so a
  // retried/duplicate request never emails the shop twice.
  const firstSend = await sendCancellationEmail(db, booking.id).catch((err) => {
    console.error(`sendCancellationEmail threw for ${bookingRef}:`, err?.message);
    return false;
  });
  if (firstSend) {
    await sendOwnerCancellationEmail(db, booking.id, 'Cancelled in the admin area', 'staff').catch((err) =>
      console.error(`sendOwnerCancellationEmail threw for ${bookingRef}:`, err?.message)
    );
    // Agency booking: tell the agency too (once — inside the same claim).
    if (booking.agency_id) {
      await sendAgencyShopCancelledEmail(db, booking.id).catch((err) =>
        console.error(`sendAgencyShopCancelledEmail threw for ${bookingRef}:`, err?.message)
      );
    }
  }
  await syncBookingToCalendar(db, booking.id);

  return NextResponse.json({ sent: true });
}
