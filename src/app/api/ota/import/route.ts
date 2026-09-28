// ============================================================
// POST /api/ota/import — add / cancel OTA bookings from their emails
// ============================================================
// Called every minute by a small Google Apps Script in the shop's Gmail
// (see docs in the project: ota-email-import) with each new Klook /
// GetYourGuide / KKday / Trip.com / Guidestination email: { from, subject, body, messageId }.
// Auth: header "x-import-secret" must equal OTA_IMPORT_SECRET.
//
// New booking  → ota_create_booking() (paid, source 'ota', no customer
//                email), shop email "New booking", Google Calendar event.
// Cancellation → the matching booking is cancelled, seats freed, shop
//                cancellation email, calendar event removed.
// Anything the rules can't handle safely (unknown package, slot full,
// >6 guests, unreadable email) is NOT guessed: the shop gets a
// "please add manually" email instead.
//
// Always answers 200 for handled/ignored emails so the script marks the
// email done; 5xx only for temporary failures (the script retries).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { parseOtaEmail, PLATFORM_LABEL, type OtaPlatform } from '@/lib/ota-email';
import {
  sendBookingConfirmationEmails,
  sendOwnerCancellationEmail,
  sendEmailViaResend,
  OWNER_EMAIL,
} from '@/lib/notifications';
import { syncBookingToCalendar } from '@/lib/google-calendar';

function esc(s: string) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

async function notifyManual(platform: OtaPlatform, subject: string, reason: string, details: Record<string, any>) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const label = PLATFORM_LABEL[platform];
  const rows = Object.entries(details)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#7a6a5c">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(String(v))}</strong></td></tr>`)
    .join('');
  const text = [`${label} email could not be added automatically.`, `Reason: ${reason}`, `Email subject: ${subject}`,
    ...Object.entries(details).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    'Please add it in admin → New Booking.'].join('\n');
  try {
    await sendEmailViaResend({
      to: OWNER_EMAIL,
      subject: `⚠️ Please add manually — ${label} ${details['Booking ref'] || ''}`.trim(),
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#2d4639">
        <p style="font-size:16px"><strong>⚠️ This ${esc(label)} booking was NOT added automatically.</strong></p>
        <p>Reason: <strong>${esc(reason)}</strong></p>
        <table>${rows}</table>
        <p style="color:#7a6a5c">Email subject: ${esc(subject)}</p>
        <p>Please add it in the admin area → <strong>New Booking</strong>.</p></div>`,
      text,
    }, apiKey);
  } catch (err: any) {
    console.error('ota-import: manual-check email failed:', err?.message);
  }
}

function friendlyError(msg: string): string {
  if (/DUPLICATE/.test(msg)) return 'already in the system';
  if (/CAPACITY_FULL/.test(msg)) return 'not enough seats left at that time';
  if (/INVALID_PARTICIPANTS/.test(msg)) return 'too many guests for one group';
  if (/DATE_BLOCKED|SLOT_BLOCKED/.test(msg)) return 'that day/time is closed in the admin';
  if (/INVALID_DATE/.test(msg)) return 'date is in the past';
  if (/INVALID_PACKAGE/.test(msg)) return 'workshop not found';
  return 'unexpected error';
}

export async function POST(request: NextRequest) {
  const secret = process.env.OTA_IMPORT_SECRET;
  if (!secret || request.headers.get('x-import-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const email = {
    from: String(payload.from || ''),
    subject: String(payload.subject || ''),
    body: String(payload.body || '').slice(0, 200_000),
  };
  const parsed = parseOtaEmail(email);
  if (parsed.kind === 'ignore') return NextResponse.json({ result: 'ignored' });

  const db = getServiceClient();

  if (parsed.kind === 'unreadable') {
    await notifyManual(parsed.platform, email.subject, `the email layout was not recognised (${parsed.reason})`, {});
    return NextResponse.json({ result: 'manual', reason: parsed.reason });
  }

  if (parsed.kind === 'alert') {
    await notifyManual(parsed.platform, email.subject, parsed.message, { 'Booking ref': parsed.ref });
    return NextResponse.json({ result: 'alert', ref: parsed.ref });
  }

  // ── Cancellation ──
  if (parsed.kind === 'cancel') {
    const { data: b } = await db
      .from('bookings')
      .select('id, booking_ref, status, cancel_token')
      .eq('ota_platform', parsed.platform)
      .eq('ota_ref', parsed.ref)
      .neq('status', 'cancelled')
      .maybeSingle();
    if (!b) return NextResponse.json({ result: 'cancel_not_found', ref: parsed.ref });
    const { error } = await db.rpc('customer_cancel_booking', {
      p_token: b.cancel_token,
      p_reason: `Cancelled on ${PLATFORM_LABEL[parsed.platform]} (${parsed.ref})`,
    });
    if (error) {
      console.error(`ota-import: cancel failed for ${b.booking_ref}:`, error.message);
      await notifyManual(parsed.platform, email.subject, 'the cancellation could not be applied automatically — please cancel it in admin', {
        'Booking ref': parsed.ref, 'Our booking': b.booking_ref,
      });
      return NextResponse.json({ result: 'manual', reason: error.message });
    }
    await sendOwnerCancellationEmail(db, b.id, `Cancelled on ${PLATFORM_LABEL[parsed.platform]} (${parsed.ref})`).catch(() => {});
    await syncBookingToCalendar(db, b.id);
    return NextResponse.json({ result: 'cancelled', booking_ref: b.booking_ref });
  }

  // ── New booking ──
  const p = parsed;
  const details = {
    'Booking ref': p.ref, Workshop: p.packageText, Date: p.date, Time: p.time,
    Guests: p.guests, Name: p.name, Phone: p.phone, Email: p.email, Price: p.price,
  };
  if (!p.packageSlug) {
    await notifyManual(p.platform, email.subject, `could not tell which workshop "${p.packageText}" is`, details);
    return NextResponse.json({ result: 'manual', reason: 'unknown_package' });
  }

  const notes = [
    `${PLATFORM_LABEL[p.platform]} ${p.ref}`,
    `OTA package: ${p.packageText}`,
    p.price && `OTA price: ${p.price}`,
    p.email && `Email: ${p.email}`,
    p.extra,
  ].filter(Boolean).join(' · ');

  const { data, error } = await db.rpc('ota_create_booking', {
    p_package_slug: p.packageSlug,
    p_date: p.date,
    p_start_time: p.time,
    p_num_participants: p.guests,
    p_customer_name: `${p.name} (${PLATFORM_LABEL[p.platform]})`,
    p_customer_notes: notes,
    p_ota_platform: p.platform,
    p_ota_ref: p.ref,
  });
  if (error) {
    if (/DUPLICATE/.test(error.message)) return NextResponse.json({ result: 'duplicate', ref: p.ref });
    if (/INVALID_DATE/.test(error.message)) return NextResponse.json({ result: 'past', ref: p.ref });
    console.error(`ota-import: create failed for ${p.platform} ${p.ref}:`, error.message);
    const reason = friendlyError(error.message);
    if (reason === 'unexpected error') {
      return NextResponse.json({ error: 'create_failed' }, { status: 500 }); // script retries next minute
    }
    await notifyManual(p.platform, email.subject, reason, details);
    return NextResponse.json({ result: 'manual', reason });
  }
  const row = Array.isArray(data) ? data[0] : data;

  // Phone is set after insert (like the SimplyBook import) so no WhatsApp
  // message is queued to the OTA customer.
  if (p.phone) await db.from('bookings').update({ customer_phone: p.phone }).eq('id', row.booking_id);

  await sendBookingConfirmationEmails(db, row.booking_id).catch((err) =>
    console.error(`ota-import: shop email failed for ${row.booking_ref}:`, err?.message)
  );
  await syncBookingToCalendar(db, row.booking_id);
  return NextResponse.json({ result: 'created', booking_ref: row.booking_ref });
}
