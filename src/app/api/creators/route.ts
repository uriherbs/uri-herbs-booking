// ============================================================
// POST /api/creators
// ============================================================
// Backs the /creators (and /creators/zh) "Work with us" page for
// influencers. Same validate-then-email pattern as /api/contact and
// /api/trade: the application lands in the shop inbox with reply-to
// set to the creator. Nothing is written to the database; once the
// owner approves, the partner and their code are created in
// admin → Partners as today.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { sendEmailViaResend, buildContactEmailHtml, buildContactEmailText } from '@/lib/notifications';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const LEAD_EMAIL_TO = 'uherbhouse@gmail.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(v: unknown, max = 300): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

export async function POST(request: NextRequest) {
  const rate = await checkRateLimit('creators', getClientIp(request), { maxHits: 5, windowSeconds: 15 * 60 });
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many submissions. Please try again in a few minutes.' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (str(body.company)) return NextResponse.json({ success: true }); // honeypot

  const name = str(body.name, 120);
  const email = str(body.email, 200);
  const handle = str(body.handle);
  const followers = str(body.followers, 40);
  const contact = str(body.contact, 120);
  const dates = str(body.dates, 200);
  const workshop = str(body.workshop, 100);
  const notes = str(body.message, 3000);
  const lang = body.lang === 'zh' ? 'Chinese' : 'English';
  const platforms: string[] = Array.isArray(body.platforms)
    ? body.platforms.filter((p: unknown) => typeof p === 'string').slice(0, 10).map((p: string) => p.slice(0, 40))
    : [];

  const errors: string[] = [];
  if (!name) errors.push('Name is required.');
  if (!email || !EMAIL_RE.test(email)) errors.push('A valid email address is required.');
  if (!handle) errors.push('Main account is required.');
  if (!followers) errors.push('Follower count is required.');
  if (errors.length > 0) return NextResponse.json({ error: errors.join(' ') }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured');
    return NextResponse.json({ error: 'Something went wrong on our end.' }, { status: 500 });
  }

  const message = [
    `Creator application (${lang} page)`,
    '',
    `Main account: ${handle}`,
    `Followers: ${followers}`,
    platforms.length ? `Platforms: ${platforms.join(', ')}` : null,
    contact ? `WhatsApp / LINE / WeChat: ${contact}` : null,
    workshop ? `Workshop to film: ${workshop}` : null,
    dates ? `Preferred dates: ${dates}` : null,
    '',
    notes || '(No additional notes.)',
    '',
    'To approve: admin → Partners → add partner (12%) and a 10% code.',
  ].filter((l): l is string => l !== null).join('\n');

  try {
    await sendEmailViaResend(
      {
        to: LEAD_EMAIL_TO,
        subject: `New creator application — ${name} (${followers} followers)`,
        html: buildContactEmailHtml({ name, email, message }),
        text: buildContactEmailText({ name, email, message }),
        replyTo: email,
      },
      apiKey
    );
  } catch (err: any) {
    console.error('Failed to send creator application email:', err.message);
    return NextResponse.json({ error: "Couldn't send your application." }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}
