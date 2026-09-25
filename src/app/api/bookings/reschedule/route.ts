// ============================================================
// /api/bookings/reschedule — customer self-reschedule
// ============================================================
// GET  ?token=…              → booking summary for /reschedule page
// GET  ?token=…&date=Y-M-D   → start times for that date (same
//                              package, guests, private/group)
// POST { token, date, time } → moves the booking, emails both sides
//
// Same authorization as /api/bookings/cancel: the per-booking secret
// bookings.cancel_token, only ever sent to the customer's own email.
// The move itself runs in customer_reschedule_booking() (service_role
// only), which re-uses create_booking() for every capacity/cut-off
// rule, so a reschedule can never land where a new booking couldn't.
// Rule (owner, 2026-09-25): allowed until 2 hours before the CURRENT
// workshop start, unlimited times; date/time only — never workshop or
// guest count.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { sendRescheduleEmails } from '@/lib/notifications';
import { hoursUntilWorkshop } from '@/lib/cancel-policy';

const RESCHEDULE_MIN_HOURS = 2;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

async function loadBooking(token: string) {
  const db = getServiceClient();
  const { data, error } = await db
    .from('bookings')
    .select('id, booking_ref, customer_name, slot_date, start_time, end_time, num_participants, is_private, status, packages ( name, slug, calendar_type )')
    .eq('cancel_token', token)
    .maybeSingle();
  return { db, booking: error ? null : data };
}

function pkgOf(b: any) {
  return Array.isArray(b.packages) ? b.packages[0] : b.packages;
}

function summary(b: any) {
  const pkg = pkgOf(b);
  const hours = hoursUntilWorkshop(b.slot_date, b.start_time);
  return {
    booking_ref: b.booking_ref,
    first_name: String(b.customer_name || '').split(' ')[0],
    package_name: pkg?.name || 'Uri Herbs Workshop',
    package_slug: pkg?.slug || null, // public identifier, used by the site calendar
    calendar_type: pkg?.calendar_type || null,
    slot_date: b.slot_date,
    start_time: String(b.start_time).slice(0, 5),
    end_time: String(b.end_time).slice(0, 5),
    num_participants: b.num_participants,
    is_private: b.is_private,
    status: b.status,
    can_reschedule: b.status === 'confirmed' && hours > RESCHEDULE_MIN_HOURS,
    too_late: b.status === 'confirmed' && hours <= RESCHEDULE_MIN_HOURS,
  };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  const date = request.nextUrl.searchParams.get('date');
  if (!UUID_RE.test(token)) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { db, booking } = await loadBooking(token);
  if (!booking) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (!date) return NextResponse.json(summary(booking));

  if (!DATE_RE.test(date)) return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
  const pkg = pkgOf(booking);
  const { data: slots, error } = await db.rpc('get_available_slots', {
    p_date: date,
    p_package_slug: pkg?.slug,
    p_num_participants: booking.num_participants,
    p_is_private: booking.is_private,
  });
  if (error) {
    console.error(`reschedule GET slots failed for ${booking.booking_ref}:`, error.message);
    return NextResponse.json({ error: 'slots_failed' }, { status: 500 });
  }

  const current = `${booking.slot_date} ${String(booking.start_time).slice(0, 5)}`;
  const times = (slots || [])
    .map((s: any) => ({
      start_time: String(s.start_time).slice(0, 5),
      end_time: String(s.end_time).slice(0, 5),
      is_available: !!s.is_available,
    }))
    .filter((s: any) => `${date} ${s.start_time}` !== current);

  return NextResponse.json({ date, times });
}

const ERROR_MAP: [RegExp, string][] = [
  [/ALREADY_CANCELLED|NOT_RESCHEDULABLE/, 'not_reschedulable'],
  [/TOO_LATE/, 'too_late'],
  [/SAME_SLOT/, 'same_slot'],
  [/CAPACITY_FULL|SLOT_BLOCKED|SLOT_MISSING/, 'slot_full'],
  [/CUTOFF_PASSED|INVALID_DATE|DATE_BLOCKED|INVALID_TIME/, 'slot_unavailable'],
];

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
  const token = typeof body.token === 'string' ? body.token : '';
  const date = typeof body.date === 'string' ? body.date : '';
  const time = typeof body.time === 'string' ? body.time : '';
  if (!UUID_RE.test(token)) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });

  const { db, booking } = await loadBooking(token);
  if (!booking) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const previous = { date: booking.slot_date as string, startTime: String(booking.start_time) };

  const { error } = await db.rpc('customer_reschedule_booking', {
    p_token: token,
    p_new_date: date,
    p_new_time: `${time}:00`,
  });
  if (error) {
    const code = ERROR_MAP.find(([re]) => re.test(error.message))?.[1] || 'reschedule_failed';
    if (code === 'reschedule_failed') console.error(`customer_reschedule_booking failed for ${booking.booking_ref}:`, error.message);
    return NextResponse.json({ error: code }, { status: code === 'reschedule_failed' ? 500 : 409 });
  }

  await sendRescheduleEmails(db, booking.id, previous).catch((err) =>
    console.error(`sendRescheduleEmails threw for ${booking.booking_ref}:`, err?.message)
  );

  const { booking: updated } = await loadBooking(token);
  return NextResponse.json({ ...summary(updated || booking), rescheduled: true });
}
