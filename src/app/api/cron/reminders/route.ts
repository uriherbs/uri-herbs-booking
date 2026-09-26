// ============================================================
// /api/cron/reminders — 1-hour workshop reminders
// ============================================================
// Called every 5 minutes by the Supabase pg_cron job
// "send-workshop-reminders" (net.http_post with
// Authorization: Bearer <CRON_SECRET>). Vercel Hobby cron can only run
// once a day, which can't do "1 hour before", hence Supabase.
//
// Picks confirmed bookings whose workshop starts within the next 60
// minutes (Chiang Mai time) and hasn't had a reminder yet, then sends
// the customer + shop reminder (sendReminderEmails claims
// bookings.reminder_sent, so repeats/overlaps are harmless).
// Bookings created less than 15 minutes ago (e.g. a walk-in booked on
// the spot) are marked done without a reminder — they just got the
// confirmation email.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { sendReminderEmails } from '@/lib/notifications';

const WINDOW_MINUTES = 60;
const SKIP_IF_CREATED_WITHIN_MINUTES = 15;

function bangkokParts(d: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || '00';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${hour}:${get('minute')}:${get('second')}` };
}

async function run(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const from = bangkokParts(now);
  const to = bangkokParts(new Date(now.getTime() + WINDOW_MINUTES * 60_000));
  // Workshops run in the daytime; if the window crosses midnight, stop at end of day.
  const toTime = to.date === from.date ? to.time : '23:59:59';

  const db = getServiceClient();
  const { data: due, error } = await db
    .from('bookings')
    .select('id, booking_ref, created_at')
    .eq('status', 'confirmed')
    .eq('reminder_sent', false)
    .eq('slot_date', from.date)
    .gt('start_time', from.time)
    .lte('start_time', toTime);

  if (error) {
    console.error('cron/reminders: query failed:', error.message);
    return NextResponse.json({ error: 'query_failed' }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  for (const b of due || []) {
    const ageMin = (now.getTime() - new Date(b.created_at).getTime()) / 60_000;
    if (ageMin < SKIP_IF_CREATED_WITHIN_MINUTES) {
      await db.from('bookings').update({ reminder_sent: true }).eq('id', b.id).eq('reminder_sent', false);
      skipped++;
      continue;
    }
    const r = await sendReminderEmails(db, b.id).catch((err) => {
      console.error(`cron/reminders: failed for ${b.booking_ref}:`, err?.message);
      return 'skipped' as const;
    });
    if (r === 'sent') sent++; else skipped++;
  }

  return NextResponse.json({ checked: (due || []).length, sent, skipped, window: `${from.date} ${from.time}–${toTime}` });
}

export async function POST(request: NextRequest) {
  return run(request);
}

export async function GET(request: NextRequest) {
  return run(request);
}
