// ============================================================
// POST /api/leads
// ============================================================
// Backs the lead-collection landing pages (src/lib/landing-pages.ts).
//
// Owner decisions 2026-11-07:
//   - one page for every traffic source; the link/QR carries ?src=
//     (event-<name>, shop, shop-cn, instagram, fb-ads…) and the offer is
//     picked from it (pickOffer)
//   - every guest gets a PERSONAL code: 10%, one use, valid 90 days,
//     created here as its own row in `coupons`
//   - the gift (recipe PDF + code) goes ONLY by email, so a fake address
//     gets nothing; the address is checked first (format, typo, throw-away
//     domain, domain that can't receive mail)
//   - the lead is tagged by source (leads.tags) for Admin → Leads and the
//     monthly report
//
// Rate limit is generous on purpose: at an event 100 people can share
// one Wi-Fi connection (one IP), so 60 per 15 minutes, not 5.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { promises as dns } from 'dns';
import { getServiceClient } from '@/lib/supabase';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sendEmailViaResend, SITE_URL } from '@/lib/notifications';
import { LANDING_PAGES, pickOffer } from '@/lib/landing-pages';
import { buildLeadGiftEmail, LEAD_EMAIL_REPLY_TO } from '@/lib/lead-emails';
import { EMAIL_RE, DISPOSABLE_DOMAINS, suggestEmail } from '@/lib/email-typos';

export const runtime = 'nodejs';

const clean = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O/1/I/L

function randomCode(prefix: string) {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `${prefix}-${s}`;
}

function bangkokDate(addDays = 0) {
  const d = new Date(Date.now() + 7 * 3600_000 + addDays * 86400_000);
  return d.toISOString().slice(0, 10);
}

/** true = domain can receive mail; unknown DNS problems count as OK (never block a real guest). */
async function domainReceivesMail(domain: string): Promise<boolean> {
  try {
    const mx = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
    ]);
    return Array.isArray(mx) && mx.length > 0;
  } catch (err: any) {
    if (err?.code === 'ENOTFOUND' || err?.code === 'ENODATA') {
      try { await dns.resolve4(domain); return true; } catch { return false; } // no MX but has A = may still receive
    }
    return true;
  }
}

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
  if (clean(body.company)) return NextResponse.json({ success: true, email: clean(body.email) });

  const page = LANDING_PAGES[clean(body.landing, 60)];
  if (!page) return NextResponse.json({ error: 'Unknown page' }, { status: 400 });

  const name = clean(body.name, 120);
  const email = clean(body.email, 200).toLowerCase();
  const phone = clean(body.phone, 40);
  const country = clean(body.country, 80);
  const consent = body.consent === true;

  if (!name) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  const suggestion = suggestEmail(email);
  if (suggestion && body.confirmEmail !== true) {
    return NextResponse.json({ error: `Did you mean ${suggestion}?`, suggestion }, { status: 400 });
  }
  const domain = email.split('@')[1];
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return NextResponse.json({ error: 'Please use your own email address — temporary inboxes cannot receive the recipes.' }, { status: 400 });
  }
  if (!(await domainReceivesMail(domain))) {
    return NextResponse.json({ error: `We can't send email to "${domain}". Please check the address.` }, { status: 400 });
  }
  if (!consent) return NextResponse.json({ error: 'Please tick the box so we can send you the recipes.' }, { status: 400 });

  const src = clean(body.src, 80).toLowerCase() || page.defaultSource;
  const offer = pickOffer(page, src);
  const db = getServiceClient();

  // Same email on the same page again: keep their existing personal code.
  const { data: existing } = await db
    .from('leads')
    .select('id, coupon_code, tags')
    .eq('email', email)
    .eq('landing', page.slug)
    .maybeSingle();

  let couponCode: string | null = existing?.coupon_code && existing.coupon_code !== 'TEA10' ? existing.coupon_code : null;
  const validUntil = bangkokDate(offer.validDays);

  if (!couponCode) {
    for (let attempt = 0; attempt < 5 && !couponCode; attempt++) {
      const code = randomCode(offer.couponPrefix);
      const { error } = await db.from('coupons').insert({
        code,
        note: `Lead code · ${page.slug} · ${src}${offer.forFriend ? ' · for a friend' : ''}`,
        discount_type: 'percent',
        discount_value: offer.percent,
        valid_from: bangkokDate(0),
        valid_until: validUntil,
        max_uses: 1,
        package_slugs: offer.packageSlugs,
        allow_private: true,
        prepay_only: false,
        is_active: true,
      });
      if (!error) couponCode = code;
      else if (!/duplicate|unique/i.test(error.message)) {
        console.error('Lead coupon create failed:', error.message);
        break;
      }
    }
  }

  const tags = Array.from(new Set([...(existing?.tags || []), offer.tag, `src:${src}`]));
  const row = {
    landing: page.slug,
    name,
    email,
    phone: phone || null,
    country: country || null,
    source: src,
    tags,
    utm_source: clean(body.utm_source, 80) || null,
    utm_medium: clean(body.utm_medium, 80) || null,
    utm_campaign: clean(body.utm_campaign, 80) || null,
    consent_marketing: true,
    consent_text: clean(body.consentText, 500) || null,
    coupon_code: couponCode,
  };

  const { data, error } = await db.from('leads').upsert(row, { onConflict: 'email,landing' }).select('id').single();
  if (error) {
    console.error('Lead save failed:', error.message);
    return NextResponse.json({ error: "Something went wrong on our side. Please show this screen to our team and we'll add you by hand." }, { status: 500 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const mail = buildLeadGiftEmail(page, name, SITE_URL, couponCode ? { code: couponCode, offer, validUntil } : null);
      await sendEmailViaResend({ to: email, subject: mail.subject, html: mail.html, text: mail.text, replyTo: LEAD_EMAIL_REPLY_TO }, apiKey);
      await db.from('leads').update({ email_sent_at: new Date().toISOString() }).eq('id', data.id);
    } catch (err: any) {
      console.error('Lead gift email failed:', err.message);
    }
  }

  // The gift itself is NOT returned — it only travels by email.
  return NextResponse.json({ success: true, email });
}
