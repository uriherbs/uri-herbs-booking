// ============================================================
// GET /api/calendar/ical.ics
// ============================================================
// URL format:
//   https://uriherbs.com/api/calendar/ical.ics?token=<platform-token>
//
// Optional query params:
//   ?calendar=herbal|aromatherapy   (default: both)
//   ?days=90                        (export window, default 90, max 365)
//
// Each of your 7 OTA partners gets a DIFFERENT token (see
// ical_feed_tokens table) — same endpoint, different URL per
// platform, so you can revoke or monitor one independently.
//
// This is a PULL feed, not a push. See the chat response for a
// full explanation of what "real-time" actually means here.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { buildICalFeed, bangkokToDate, type ICalEvent } from '@/lib/ical';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const token = searchParams.get('token');
  const calendarFilter = searchParams.get('calendar'); // 'herbal' | 'aromatherapy' | null
  const daysAhead = Math.min(parseInt(searchParams.get('days') || '90', 10), 365);

  if (!token) {
    return new NextResponse('Missing ?token= parameter', { status: 401 });
  }

  const supabase = getServiceClient();

  // ── 1. Validate the token (and log the fetch — who's polling, how often) ──
  const { data: tokenCheck, error: tokenError } = await supabase.rpc('validate_ical_token', {
    p_token: token,
  });

  const valid = tokenCheck?.[0]?.valid;
  const platformName = tokenCheck?.[0]?.platform_name;

  if (tokenError || !valid) {
    return new NextResponse('Invalid or revoked token', { status: 403 });
  }

  // ── 2. Compute the export window (Bangkok "today" through +N days) ──
  const today = new Date();
  const bangkokTodayStr = new Date(today.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  const startDate = bangkokTodayStr;
  const endDateObj = new Date(startDate + 'T00:00:00Z');
  endDateObj.setUTCDate(endDateObj.getUTCDate() + daysAhead);
  const endDate = endDateObj.toISOString().slice(0, 10);

  // ── 3. Make sure daily_slots rows exist across the whole window ──
  // (normally created lazily, one date at a time, only when a
  // customer's browser actually requests that date)
  await supabase.rpc('ensure_daily_slots_range', {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  // ── 4. Fetch full-day closures ──
  let blockedDatesQuery = supabase
    .from('blocked_dates')
    .select('blocked_date, calendar_type, reason')
    .gte('blocked_date', startDate)
    .lte('blocked_date', endDate);

  const { data: blockedDates } = await blockedDatesQuery;

  // ── 5. Fetch hourly blocks that are FULL or manually BLOCKED ──
  let slotsQuery = supabase
    .from('daily_slots')
    .select('slot_date, start_time, end_time, calendar_type, booked_count, max_capacity, is_blocked, blocked_reason')
    .gte('slot_date', startDate)
    .lte('slot_date', endDate)
    .order('calendar_type')
    .order('slot_date')
    .order('start_time');

  if (calendarFilter === 'herbal' || calendarFilter === 'aromatherapy') {
    slotsQuery = slotsQuery.eq('calendar_type', calendarFilter);
  }

  const { data: allSlots, error: slotsError } = await slotsQuery;

  if (slotsError) {
    return new NextResponse(`Failed to load availability: ${slotsError.message}`, { status: 500 });
  }

  const unavailableSlots = (allSlots || []).filter(
    (s) => s.is_blocked || s.booked_count >= s.max_capacity
  );

  // ── 6. Merge contiguous unavailable hourly blocks into single events ──
  // (a fully-booked 10-4 day would otherwise be 6 separate 1-hour
  // VEVENTs instead of one clean block — this keeps the feed compact
  // for partners that cap how many events they'll ingest per calendar)
  const events: ICalEvent[] = [];
  let current: { date: string; calendar: string; start: string; end: string; reasons: Set<string> } | null = null;

  for (const slot of unavailableSlots) {
    const reason = slot.is_blocked
      ? (slot.blocked_reason || 'Manually blocked')
      : 'Fully booked (12/12)';

    if (
      current &&
      current.date === slot.slot_date &&
      current.calendar === slot.calendar_type &&
      current.end === slot.start_time
    ) {
      // Extends the current run
      current.end = slot.end_time;
      current.reasons.add(reason);
    } else {
      if (current) events.push(flushSlotRun(current));
      current = {
        date: slot.slot_date,
        calendar: slot.calendar_type,
        start: slot.start_time,
        end: slot.end_time,
        reasons: new Set([reason]),
      };
    }
  }
  if (current) events.push(flushSlotRun(current));

  // ── 7. Add full-day closures as all-day events ──
  for (const bd of blockedDates || []) {
    const dayStart = new Date(bd.blocked_date + 'T00:00:00Z');
    const dayEnd = new Date(dayStart);
    dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

    const scope = bd.calendar_type
      ? (bd.calendar_type === 'herbal' ? 'Herbal Workshops' : 'Aromatherapy')
      : 'All Services';

    events.push({
      uid: `closure-${bd.blocked_date}-${bd.calendar_type || 'all'}@uriherbs.com`,
      dtstart: dayStart,
      dtend: dayEnd,
      summary: `${scope} — Closed`,
      description: bd.reason || 'Closed for the day',
      allDay: true,
    });
  }

  // ── 8. Build and return the .ics file ──
  const ics = buildICalFeed({
    calendarName: `Uri Herbs Workshop — Unavailability (${platformName})`,
    events,
    refreshIntervalMinutes: 15,
  });

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="uri-herbs-availability.ics"',
      // Short cache: OTAs poll on their own schedule regardless, but
      // this stops a burst of near-simultaneous polls (e.g. several
      // platforms happening to fetch within the same minute) from
      // each triggering a full DB re-aggregation.
      'Cache-Control': 'public, max-age=300, s-maxage=300',
    },
  });
}

function flushSlotRun(run: { date: string; calendar: string; start: string; end: string; reasons: Set<string> }): ICalEvent {
  const calendarLabel = run.calendar === 'herbal' ? 'Herbal Workshops' : 'Aromatherapy';
  const reasonList = Array.from(run.reasons).join(', ');

  return {
    uid: `slot-${run.date}-${run.start}-${run.end}-${run.calendar}@uriherbs.com`,
    dtstart: bangkokToDate(run.date, run.start),
    dtend: bangkokToDate(run.date, run.end),
    summary: `${calendarLabel} — Not Available`,
    description: reasonList,
  };
}
