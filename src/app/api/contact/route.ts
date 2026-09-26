// ============================================================
// POST /api/contact
// ============================================================
// Backs the /contact page's form. Validates the submission
// server-side (never trust the client), then emails it to Mali
// via Resend with reply-to set to the sender — she can just hit
// Reply in her inbox instead of copying the address out.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { sendEmailViaResend, buildContactEmailHtml, buildContactEmailText } from '@/lib/notifications';

const CONTACT_EMAIL_TO = 'uherbhouse@gmail.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  // Hidden honeypot field — real visitors never fill this in, only bots
  // that auto-fill every input. Any value here means silently "succeed"
  // without actually sending anything.
  const honeypot = typeof body.company === 'string' ? body.company.trim() : '';

  if (honeypot) {
    return NextResponse.json({ success: true });
  }

  const errors: string[] = [];
  if (!name) errors.push('Name is required.');
  if (!email || !EMAIL_RE.test(email)) errors.push('A valid email address is required.');
  if (!message || message.length < 5) errors.push('Please write a short message.');
  if (message.length > 5000) errors.push('Message is too long.');

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured');
    return NextResponse.json(
      { error: "Something went wrong on our end. Please message us on WhatsApp instead." },
      { status: 500 }
    );
  }

  try {
    await sendEmailViaResend(
      {
        to: CONTACT_EMAIL_TO,
        subject: `New message from ${name} — Uri Herbs Contact Form`,
        html: buildContactEmailHtml({ name, email, message }),
        text: buildContactEmailText({ name, email, message }),
        replyTo: email,
      },
      apiKey
    );
  } catch (err: any) {
    console.error('Failed to send contact email:', err.message);
    return NextResponse.json(
      { error: "Couldn't send your message. Please try again or message us on WhatsApp." },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
