// ============================================================
// POST /api/trade
// ============================================================
// Backs the /trade (Trade & Groups) landing page's lead form.
// Same validate-server-side-then-email-via-Resend pattern as
// /api/contact (see that route for the reasoning) — this is a
// B2B lead inquiry, not a booking, so it doesn't touch the
// bookings/daily_slots tables at all. It just gets the agency's
// details in front of Mali's inbox with reply-to set to the
// agency's contact email.
//
// Field set matches the lead form fields discussed with the
// owner: agency/guide name, contact person, email, phone/LINE ID,
// estimated group size, tentative date(s), workshop(s) of
// interest, and free-text notes. Everything except agency name,
// email and message is optional — an agency in a hurry should be
// able to send "14 people, sometime in October" without being
// blocked by a required field they don't have an answer for yet.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { sendEmailViaResend, buildContactEmailHtml, buildContactEmailText } from '@/lib/notifications';

const LEAD_EMAIL_TO = 'uherbhouse@gmail.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const agencyName = str(body.agencyName);
  const contactPerson = str(body.contactPerson);
  const email = str(body.email);
  const phoneOrLine = str(body.phoneOrLine);
  const groupSize = str(body.groupSize);
  const dates = str(body.dates);
  const workshops: string[] = Array.isArray(body.workshops) ? body.workshops.filter((w: unknown) => typeof w === 'string') : [];
  const notes = str(body.notes);
  // Hidden honeypot field — same anti-bot approach as /api/contact.
  const honeypot = str(body.company);

  if (honeypot) {
    return NextResponse.json({ success: true });
  }

  const errors: string[] = [];
  if (!agencyName) errors.push('Agency or guide name is required.');
  if (!email || !EMAIL_RE.test(email)) errors.push('A valid email address is required.');
  if (agencyName.length > 200) errors.push('Agency name is too long.');
  if (notes.length > 5000) errors.push('Notes are too long.');

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured');
    return NextResponse.json(
      { error: 'Something went wrong on our end. Please message us on WhatsApp instead.' },
      { status: 500 }
    );
  }

  // Fold every field into one formatted message body so this can
  // reuse the existing generic contact-email template (From /
  // Email / Message) instead of maintaining a second near-duplicate
  // HTML template just for this one extra form.
  const lines = [
    `Agency / Guide: ${agencyName}`,
    contactPerson ? `Contact person: ${contactPerson}` : null,
    phoneOrLine ? `Phone / LINE ID: ${phoneOrLine}` : null,
    groupSize ? `Estimated group size: ${groupSize}` : null,
    dates ? `Tentative date(s): ${dates}` : null,
    workshops.length > 0 ? `Workshop(s) of interest: ${workshops.join(', ')}` : null,
    '', // blank separator line before the free-text notes
    notes || '(No additional notes.)',
  ].filter((line): line is string => line !== null);

  const message = lines.join('\n');

  try {
    await sendEmailViaResend(
      {
        to: LEAD_EMAIL_TO,
        subject: `New Trade & Groups inquiry — ${agencyName}`,
        html: buildContactEmailHtml({ name: `${agencyName}${contactPerson ? ` (${contactPerson})` : ''}`, email, message }),
        text: buildContactEmailText({ name: `${agencyName}${contactPerson ? ` (${contactPerson})` : ''}`, email, message }),
        replyTo: email,
      },
      apiKey
    );
  } catch (err: any) {
    console.error('Failed to send trade lead email:', err.message);
    return NextResponse.json(
      { error: "Couldn't send your details. Please try again or message us on WhatsApp." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
