// ============================================================
// src/lib/google-calendar.ts — one-way booking → Google Calendar sync
// ============================================================
// Every confirmed booking gets an event in the shop's Google Calendar;
// a reschedule moves it, a cancellation removes it. Server-only.
//
// Setup (Vercel env vars, Production):
//   GOOGLE_SERVICE_ACCOUNT_JSON  – the whole JSON key file of a Google
//                                  Cloud service account (Calendar API on)
//   GOOGLE_CALENDAR_ID           – the calendar to write to, e.g.
//                                  uherbhouse@gmail.com. That calendar must
//                                  be shared with the service account's
//                                  email with "Make changes to events".
// If either is missing, every function here silently does nothing, so
// bookings never fail because of the calendar.
//
// Event IDs are derived from the booking UUID (hex digits are valid
// Google event-ID characters), so no extra DB column is needed and
// repeated calls simply update the same event.
// ============================================================

import crypto from 'crypto';

const TZ = 'Asia/Bangkok';
const API = 'https://www.googleapis.com/calendar/v3';

let cachedToken: { token: string; exp: number } | null = null;

function config() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!raw || !calendarId) return null;
  try {
    const key = JSON.parse(raw);
    if (!key.client_email || !key.private_key) return null;
    return { email: key.client_email as string, privateKey: key.private_key as string, calendarId };
  } catch {
    console.error('google-calendar: GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON');
    return null;
  }
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function accessToken(cfg: { email: string; privateKey: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.exp - 60 > now) return cachedToken.token;
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: cfg.email,
    scope: 'https://www.googleapis.com/auth/calendar.events',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const signature = crypto.createSign('RSA-SHA256').update(`${header}.${claim}`).sign(cfg.privateKey);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claim}.${b64url(signature)}`,
    }),
  });
  const json: any = await res.json();
  if (!res.ok || !json.access_token) throw new Error(`token request failed: ${res.status} ${JSON.stringify(json)}`);
  cachedToken = { token: json.access_token, exp: now + (json.expires_in || 3600) };
  return json.access_token;
}

function eventIdFor(bookingId: string) {
  return 'uri' + bookingId.replace(/-/g, '').toLowerCase(); // "u","r","i" + hex: valid base32hex
}

function hhmm(t: string) {
  return String(t).slice(0, 5);
}

function buildEvent(b: any) {
  const pkg = Array.isArray(b.packages) ? b.packages[0] : b.packages;
  const pkgName = pkg?.name || 'Workshop';
  const icon = pkg?.calendar_type === 'aromatherapy' ? '❋' : '🌿';
  const guests = `${b.num_participants} guest${b.num_participants === 1 ? '' : 's'}`;
  const unpaid = b.payment_status !== 'paid';
  const amount = `฿${Number(b.total_price_thb).toLocaleString()}`;
  const paidVia = b.payment_method === 'stripe' ? ' (card)' : b.payment_method === 'paypal' ? ' (PayPal)' : b.payment_method === 'transfer' ? ' (bank transfer)' : '';
  // Agency booking: the AGENCY pays the shop (online / bank transfer) —
  // staff must not collect money from the guests.
  const ag = b.agency_id ? (Array.isArray(b.agencies) ? b.agencies[0] : b.agencies) : null;
  const agencyName: string = ag?.company_name || '';
  const agencyDue = b.agency_pay_deadline
    ? new Date(b.agency_pay_deadline).toLocaleString('en-GB', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : b.payment_due_date || '';
  const money = b.agency_id
    ? (unpaid
      ? `Agency has NOT paid yet: ${amount}${agencyDue ? ` (due ${agencyDue})` : ''} — the agency pays us, do not collect from the guests`
      : `Agency paid ${amount}${paidVia} — do not collect from the guests`)
    : unpaid
      ? `Collect ${amount} on arrival`
      : `Paid ${amount}${paidVia}`;
  // Agency bookings store the guest as "Guest name (Agency name)".
  let guestName: string = b.customer_name || '';
  if (agencyName && guestName.endsWith(` (${agencyName})`)) guestName = guestName.slice(0, -(agencyName.length + 3));
  const who = b.agency_id ? `${agencyName || 'Agency'} (agency)${guestName ? ` · ${guestName}` : ''}` : b.customer_name;
  const group = b.is_private ? 'Private session' : 'Group';
  const lines = [
    `Booking: ${b.booking_ref}`,
    b.agency_id && `Agency: ${agencyName}${ag?.contact_name ? ` · ${ag.contact_name}` : ''}${ag?.phone ? ` · ${ag.phone}` : ''}${ag?.email ? ` · ${ag.email}` : ''}`,
    b.agency_id && guestName && `Guest: ${guestName}`,
    `Workshop: ${pkgName}${b.is_private ? ' (private)' : ''}`,
    `Guests: ${b.num_participants}${b.has_minors ? ' (includes under-18s)' : ''}`,
    group && `Type: ${group}`,
    money,
    b.customer_phone && `Phone: ${b.customer_phone}`,
    b.customer_email && `Email: ${b.customer_email}`,
    b.customer_notes && `Notes: ${b.customer_notes}`,
    b.booking_source && `Source: ${b.booking_source}`,
  ].filter(Boolean);
  return {
    summary: `${icon} ${pkgName} · ${who} · ${guests}${unpaid ? ' · 💵' : ' · ✅'}`,
    description: lines.join('\n'),
    location: 'Uri Herbs Workshop, 44/3 Si Phum Soi 9, Chiang Mai',
    start: { dateTime: `${b.slot_date}T${hhmm(b.start_time)}:00`, timeZone: TZ },
    end: { dateTime: `${b.slot_date}T${hhmm(b.end_time)}:00`, timeZone: TZ },
    colorId: pkg?.calendar_type === 'aromatherapy' ? '3' : '2', // grape / sage
    status: 'confirmed',
  };
}

/**
 * Bring Google Calendar in line with the booking's current state:
 * confirmed → create/update the event, cancelled → delete it.
 * Never throws; safe to call as often as you like.
 */
export async function syncBookingToCalendar(db: any, bookingId: string): Promise<void> {
  const cfg = config();
  if (!cfg) return;
  try {
    const { data: b, error } = await db
      .from('bookings')
      .select('id, booking_ref, status, customer_name, customer_email, customer_phone, customer_notes, slot_date, start_time, end_time, num_participants, instructor_group, is_private, has_minors, total_price_thb, payment_status, payment_method, booking_source, agency_id, agency_pay_deadline, payment_due_date, agencies ( company_name, contact_name, email, phone ), packages ( name, calendar_type )')
      .eq('id', bookingId)
      .single();
    if (error || !b) {
      console.error(`google-calendar: could not load booking ${bookingId}:`, error?.message);
      return;
    }

    const token = await accessToken(cfg);
    const cal = encodeURIComponent(cfg.calendarId);
    const id = eventIdFor(b.id);
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    if (b.status === 'cancelled') {
      const res = await fetch(`${API}/calendars/${cal}/events/${id}`, { method: 'DELETE', headers });
      if (!res.ok && res.status !== 404 && res.status !== 410) {
        console.error(`google-calendar: delete failed for ${b.booking_ref}: ${res.status} ${await res.text()}`);
      }
      return;
    }
    if (b.status !== 'confirmed') return; // pending payment etc. — not on the calendar yet

    const body = JSON.stringify({ id, ...buildEvent(b) });
    // Update if it exists (also revives a previously deleted event), otherwise insert.
    let res = await fetch(`${API}/calendars/${cal}/events/${id}`, { method: 'PUT', headers, body });
    if (res.status === 404) {
      res = await fetch(`${API}/calendars/${cal}/events`, { method: 'POST', headers, body });
    }
    if (!res.ok) {
      console.error(`google-calendar: upsert failed for ${b.booking_ref}: ${res.status} ${await res.text()}`);
    }
  } catch (err: any) {
    console.error(`google-calendar: sync failed for booking ${bookingId}:`, err?.message);
  }
}
