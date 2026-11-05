// ============================================================
// POST /api/leads
// ============================================================
// Backs the lead-collection landing pages (src/lib/landing-pages.ts).
// Saves the guest in the `leads` table (service role — the table has
// no public access) and emails them the gift: recipe card link +
// workshop coupon. The page shows the coupon and PDF link right away
// too, so a typo in the email address never costs the guest the gift.
//
// Rate limit is generous on purpose: at an event 100 people can share
// one Wi-Fi connection (one IP), so 60 per 15 minutes, not 5.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sendEmailViaResend, SITE_URL } from '@/lib/notifications';
import { LANDING_PAGES } from '@/lib/landing-pages';
import { buildLeadGiftEmail } from '@/lib/lead-emails';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(request: NextRequest) {
  const rate = await checkRateLimit('leads', getClientIp(request), { maxHits: 60, windowSeconds: 15 * 60 });
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many sign-ups from this connection. Please try again in a few minutes.' }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  // Honeypot: real visitors never fill this hidden field.
  if (clean(body.company)) return NextResponse.json({ success: true });

  const page = LANDING_PAGES[clean(body.landing, 60)];
  if (!page) return NextResponse.json({ error: 'Unknown page' }, { status: 400 });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 40);
  const country = clean(body.country, 80);
  const consent = body.consent === true;

  const errors: string[] = [];
  if (!name) errors.push('Please enter your name.');
  if (!email || !EMAIL_RE.test(email)) errors.push('Please enter a valid email address.');
  if (!consent) errors.push('Please tick the box so we can send you the recipes.');
  if (errors.length) return NextResponse.json({ error: errors.join(' ') }, { status: 400 });

  const db = getServiceClient();
  const row = {
    landing: page.slug,
    name,
    email,
    phone: phone || null,
    country: country || null,
    source: clean(body.src, 80) || page.defaultSource,
    utm_source: clean(body.utm_source, 80) || null,
    utm_medium: clean(body.utm_medium, 80) || null,
    utm_campaign: clean(body.utm_campaign, 80) || null,
    consent_marketing: true,
    consent_text: clean(body.consentText, 500) || null,
    coupon_code: page.couponCode,
  };

  // Same email on the same page twice = update, not a duplicate row.
  const { data, error } = await db
    .from('leads')
    .upsert(row, { onConflict: 'email,landing' })
    .select('id')
    .single();

  if (error) {
    console.error('Lead save failed:', error.message);
    return NextResponse.json({ error: "Something went wrong on our side. Please show this screen to our team and we'll add you by hand." }, { status: 500 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const mail = buildLeadGiftEmail(page, name, SITE_URL);
      await sendEmailViaResend({ to: email, subject: mail.subject, html: mail.html, text: mail.text }, apiKey);
      await db.from('leads').update({ email_sent_at: new Date().toISOString() }).eq('id', data.id);
    } catch (err: any) {
      // The lead is saved and the page already shows the gift — log only.
      console.error('Lead gift email failed:', err.message);
    }
  }

  return NextResponse.json({ success: true, couponCode: page.couponCode, pdfUrl: page.pdfUrl });
}
