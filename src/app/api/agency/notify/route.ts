// POST /api/agency/notify — server-side emails for the agency flow.
// The browser says WHICH agency/booking changed; the current state is
// re-read from the database before anything is sent (same pattern as
// /api/bookings/notify-cancelled).
//   { event: 'approved', agency_id }         → contract-to-sign email
//   { event: 'booking_created', booking_id } → agency + shop emails
//   { event: 'booking_cancelled', booking_ref } → agency + shop emails
//   { event: 'paid', booking_id }            → after an online payment
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { sendContractEmail, sendAgencyBookingCreatedEmails, sendAgencyCancellationEmails, sendAgencyPaidEmail } from '@/lib/agency-emails';

export async function POST(request: NextRequest) {
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  const db = getServiceClient();

  if (body.event === 'approved' && typeof body.agency_id === 'string') {
    const { data: a } = await db.from('agencies').select('*').eq('id', body.agency_id).maybeSingle();
    if (!a || a.status !== 'approved') return NextResponse.json({ sent: false });
    const sent = await sendContractEmail(a);
    return NextResponse.json({ sent });
  }
  if (body.event === 'booking_created' && typeof body.booking_id === 'string') {
    const { data: b } = await db.from('bookings').select('id, agency_id, created_at').eq('id', body.booking_id).maybeSingle();
    // Only for agency bookings made in the last 10 minutes (no replays).
    if (!b?.agency_id || Date.now() - new Date(b.created_at).getTime() > 10 * 60_000) return NextResponse.json({ sent: false });
    await sendAgencyBookingCreatedEmails(db, b.id);
    return NextResponse.json({ sent: true });
  }
  if (body.event === 'booking_cancelled' && typeof body.booking_ref === 'string') {
    await sendAgencyCancellationEmails(db, body.booking_ref.trim().toUpperCase());
    return NextResponse.json({ sent: true });
  }
  if (body.event === 'paid' && typeof body.booking_id === 'string') {
    // Re-checked inside: only a booking actually paid in the last 15 minutes.
    await sendAgencyPaidEmail(db, body.booking_id);
    return NextResponse.json({ sent: true });
  }
  return NextResponse.json({ error: 'Unknown event' }, { status: 400 });
}
