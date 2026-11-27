// ============================================================
// src/lib/lead-emails.ts
// ============================================================
// The "here are your recipes" email sent by /api/leads.
//
// Written to look like a personal note, not a newsletter (owner
// 2026-11-06: the first version landed in Gmail's Promotions tab).
// Gmail sorts by how a message looks, so this version has:
//   - plain text-style HTML: no coloured header, no buttons, no images
//   - one link (the recipes page: PDF + videos) plus the website in the signature
//   - the personal code (2026-11-07: email is now the ONLY place the
//     gift is delivered) sits in a plain-text P.S., no big coupon box;
//     no "unsubscribe" wording — opt-out is a plain "just reply" line
//   - a question that invites a reply (replies teach Gmail the sender
//     is wanted); Reply-To is info@uriherbs.com
// 2026-11-07: 13 recipes are too long for the body, so the email lists
// the names with their one-line tagline and links to the recipes page.
// ============================================================

import type { LandingPageConfig, LeadOffer } from './landing-pages';

export const LEAD_EMAIL_REPLY_TO = 'info@uriherbs.com';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export interface LeadCoupon { code: string; offer: LeadOffer; validUntil: string }

const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export function buildLeadGiftEmail(page: LandingPageConfig, name: string, siteUrl: string, coupon: LeadCoupon | null = null) {
  // Owner 2026-11-27: short and visual — big video button, PDF button, the
  // code in a box. No long recipe list. Signed by the team, not by name.
  const first = name.split(/\s+/)[0] || name;
  const n = page.recipes.length;
  const recipesUrl = `${siteUrl}${page.recipesPageUrl}`;
  const pdfUrl = `${siteUrl}${page.pdfUrl}`;
  const heroUrl = `${siteUrl}${page.heroImage}`;
  const subject = `Your ${n} tea videos are here 🍵`;
  const book = coupon ? `${siteUrl}${page.bookUrl}?code=${encodeURIComponent(coupon.code)}` : `${siteUrl}${page.bookUrl}`;

  const thumbs = page.recipes.filter((r) => r.videoFresh).slice(0, 3);
  const thumbCells = thumbs
    .map(
      (r) => `<td width="33%" style="padding:3px;vertical-align:top;"><a href="${recipesUrl}" style="text-decoration:none;color:#2D4639;"><img src="https://i.ytimg.com/vi/${r.videoFresh}/hqdefault.jpg" alt="${esc(r.name)}" width="100%" style="display:block;width:100%;height:auto;border-radius:8px;border:0;"/><span style="display:block;font-size:11px;padding-top:4px;">▶ ${esc(r.name)}</span></a></td>`
    )
    .join('');

  const btn = (href: string, label: string, primary: boolean) =>
    `<a href="${href}" style="display:block;text-align:center;text-decoration:none;font-weight:700;font-size:16px;padding:14px 12px;border-radius:12px;margin:10px 0;${
      primary ? 'background:#2D4639;color:#ffffff;' : 'background:#ffffff;color:#2D4639;border:1.5px solid #2D4639;'
    }">${label}</a>`;

  const couponHtml = coupon
    ? `<div style="background:#F8F5EF;border:1.5px dashed #A89068;border-radius:12px;padding:14px;text-align:center;margin:16px 0 6px;">
<div style="font-size:14px;color:#5a4a3f;">${coupon.offer.forFriend ? `A ${coupon.offer.percent}% code for a friend (any workshop)` : `Your ${coupon.offer.percent}% tea workshop code`}</div>
<div style="font-size:24px;font-weight:700;letter-spacing:2px;color:#2D4639;padding:4px 0;">${esc(coupon.code)}</div>
<div style="font-size:12px;color:#8A7668;">One use · valid until ${fmtDate(coupon.validUntil)}</div>
</div>${btn(book, coupon.offer.forFriend ? 'Share the booking link' : 'Book with my code', false)}`
    : '';

  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F8F5EF;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#2b2b2b;">
<div style="max-width:520px;margin:0 auto;background:#ffffff;">
<img src="${heroUrl}" alt="Thai herbal tea at Uri Herbs Workshop" width="520" style="display:block;width:100%;height:auto;border:0;"/>
<div style="padding:18px 18px 22px;">
<p style="margin:0 0 8px;">Hi ${esc(first)},</p>
<p style="margin:0 0 10px;">Here are the ${n} Thai herbal teas we brew in our workshop. Each one has a short video and its recipe card.</p>
${thumbCells ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:6px 0 4px;"><tr>${thumbCells}</tr></table>` : ''}
${btn(recipesUrl, `▶ Watch all ${n} videos`, true)}
${btn(pdfUrl, '⬇ Recipe book (PDF)', false)}
${couponHtml}
<p style="margin:14px 0 0;">Which tea will you try first? Just reply and tell us 🌿</p>
<p style="margin:16px 0 0;font-size:13px;color:#8A7668;">The Uri Herbs team · Chiang Mai Old City<br/><a href="${siteUrl}" style="color:#4A7050;">uriherbs.com</a> · Instagram @uriherbsworkshop</p>
<p style="margin:14px 0 0;font-size:11.5px;color:#999;">You asked for these recipes on our website. If you'd rather not hear from us again, just reply and let us know.</p>
</div></div></body></html>`;

  const text = [
    `Hi ${first},`,
    '',
    `Here are the ${n} Thai herbal teas we brew in our workshop. Each one has a short video and its recipe card.`,
    '',
    `Watch all ${n} videos: ${recipesUrl}`,
    `Recipe book (PDF): ${pdfUrl}`,
    ...(coupon
      ? ['', `${coupon.offer.forFriend ? `A ${coupon.offer.percent}% code for a friend` : `Your ${coupon.offer.percent}% tea workshop code`}: ${coupon.code} (one use, until ${fmtDate(coupon.validUntil)})`, `Book: ${book}`]
      : []),
    '',
    'Which tea will you try first? Just reply and tell us.',
    '',
    'The Uri Herbs team · Chiang Mai Old City',
    `${siteUrl} · Instagram @uriherbsworkshop`,
    '',
    "You asked for these recipes on our website. If you'd rather not hear from us again, just reply and let us know.",
  ].join('\n');

  return { subject, html, text };
}
