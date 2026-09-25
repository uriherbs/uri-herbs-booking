// ============================================================
// /api/bookings/cancel — customer self-cancellation
// ============================================================
// GET  ?token=<cancel_token>  → booking summary for the /cancel page
// POST { token, reason }      → cancels the booking, frees the slot,
//                               emails the customer AND the shop
//
// Authorization is the per-booking secret `bookings.cancel_token`
// (random UUID, only ever sent to the customer's own email). The
// actual cancel runs in the customer_cancel_booking() SQL function,
// which is executable by service_role only — the public anon key
// cannot call it.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { sendCancellationEmail, sendOwnerCancellationEmail } from '@/lib/notifications';
import { hoursUntilWorkshop, isPaidOnline, refundStatus } from '@/lib/cancel-policy';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadBooking(token: string) {
  const db = getServiceClient();
  const { data, error } = await db
    .from('bookings')
    .select('id, booking_ref, customer_name, slot_date, start_time, end_time, num_participants, total_price_thb, payment_method, status, packages ( name )')
    .eq('cancel_token', token)
    .maybeSingle();
  return { db, booking: error ? null : data };
}

function summary(b: any) {
  const pkg = Array.isArray(b.packages) ? b.packages[0] : b.packages;
  const hours = hoursUntilWorkshop(b.slot_date, b.start_time);
  return {
    booking_ref: b.booking_ref,
    first_name: String(b.customer_name || '').split(' ')[0],
    package_name: pkg?.name || 'Uri Herbs Workshop',
    slot_date: b.slot_date,
    start_time: String(b.start_time).slice(0, 5),
    end_time: String(b.end_time).slice(0, 5),
    num_participants: b.num_participants,
    total_price_thb: b.total_price_thb,
    status: b.status,
    paid_online: isPaidOnline(b.payment_method),
    refund_status: refundStatus(b.payment_method, hours),
    already_started: hours <= 0,
  };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  if (!UUID_RE.test(token)) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { booking } = await loadBooking(token);
  if (!booking) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return NextResponse.json(summary(booking));
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  const token = typeof body.token === 'string' ? body.token : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) : '';
  if (!UUID_RE.test(token)) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { db, booking } = await loadBooking(token);
  if (!booking) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (booking.status === 'cancelled') return NextResponse.json({ error: 'already_cancelled' }, { status: 409 });
  if (booking.status !== 'confirmed') return NextResponse.json({ error: 'not_cancellable' }, { status: 409 });
  if (hoursUntilWorkshop(booking.slot_date, booking.start_time) <= 0) {
    return NextResponse.json({ error: 'already_started' }, { status: 409 });
  }

  const { error: cancelError } = await db.rpc('customer_cancel_booking', {
    p_token: token,
    p_reason: reason || null,
  });
  if (cancelError) {
    console.error(`customer_cancel_booking failed for ${booking.booking_ref}:`, cancelError.message);
    const code = /ALREADY_CANCELLED/.test(cancelError.message) ? 'already_cancelled'
      : /ALREADY_STARTED/.test(cancelError.message) ? 'already_started'
      : 'cancel_failed';
    return NextResponse.json({ error: code }, { status: code === 'cancel_failed' ? 500 : 409 });
  }

  // Emails never block the result — the booking is already cancelled.
  await Promise.allSettled([
    sendCancellationEmail(db, booking.id, { byCustomer: true }),
    sendOwnerCancellationEmail(db, booking.id, reason),
  ]);

  return NextResponse.json({ ...summary({ ...booking, status: 'cancelled' }), cancelled: true });
}
