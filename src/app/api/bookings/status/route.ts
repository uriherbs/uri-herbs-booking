// ============================================================
// POST /api/bookings/status
// ============================================================
// Re-fetches a booking by ref for the Stripe 3D-Secure return flow
// (src/app/book/page.tsx). A card that requires a full-page bank
// redirect (see StripeCardForm.tsx's confirmParams.return_url) reloads
// the /book tab on the way back — every in-memory wizard state (step,
// result, form) is gone. This route lets the client re-fetch just
// enough of the booking to rebuild the Confirmation screen, keyed by
// booking_ref the same way confirmPayLaterBooking/cancelBooking
// already trust it (see booking-service.ts) — the ref itself is the
// capability token here, not a public lookup-by-anything endpoint.
//
// Deliberately returns the same shape as BookingConfirmation
// (src/lib/types.ts) so the client can feed it straight into
// useCreateBooking().restore() without reshaping anything.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

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
    .select(
      'id, booking_ref, status, slot_date, start_time, end_time, num_participants, instructor_group, is_private, total_price_thb, payment_method, packages ( name )'
    )
    .eq('booking_ref', bookingRef)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  const pkgRow = Array.isArray(booking.packages) ? booking.packages[0] : booking.packages;

  return NextResponse.json({
    booking_id: booking.id,
    booking_ref: booking.booking_ref,
    package_name: pkgRow?.name || '',
    slot_date: booking.slot_date,
    start_time: String(booking.start_time).slice(0, 5),
    end_time: String(booking.end_time).slice(0, 5),
    num_participants: booking.num_participants,
    instructor_group: booking.instructor_group,
    is_private: booking.is_private,
    total_price_thb: booking.total_price_thb,
    status: booking.status,
    payment_method: booking.payment_method,
  });
}
