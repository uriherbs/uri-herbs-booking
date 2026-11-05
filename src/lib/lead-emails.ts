// ============================================================
// src/lib/lead-emails.ts
// ============================================================
// The "here is your gift" email sent by /api/leads. Recipes are in
// the email body itself (people at an event read on their phone and
// may never open a PDF), with the PDF link and the workshop coupon.
// Same look as the booking emails: sage + parchment, inline styles,
// table layout for email clients.
// ============================================================

import type { LandingPageConfig } from './landing-pages';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildLeadGiftEmail(page: LandingPageConfig, name: string, siteUrl: string) {
  const first = name.split(/\s+/)[0] || name;
  const pdf = `${siteUrl}${page.pdfUrl}`;
  const book = `${siteUrl}${page.bookUrl}?code=${encodeURIComponent(page.couponCode)}&utm_source=lead_email&utm_medium=email&utm_campaign=${page.slug}`;
  const subject = `Your ${page.recipes.length} Thai herbal tea recipes 🌿`;

  const recipesHtml = page.recipes
    .map(
      (r) => `
      <tr><td style="padding:14px 0;border-top:1px solid #E8E2D8;">
        <div style="font-family:Georgia,serif;font-size:18px;color:#2D4639;font-weight:bold;">${esc(r.name)}</div>
        <div style="font-size:13px;color:#8A7668;font-style:italic;margin:2px 0 8px;">${esc(r.tagline)}</div>
        <div style="font-size:14px;color:#5C4A3D;line-height:1.55;">${r.ingredients.map((i) => `• ${esc(i)}`).join('<br/>')}</div>
        <div style="font-size:14px;color:#2D4639;line-height:1.6;margin-top:8px;">${esc(r.method)}</div>
      </td></tr>`
    )
    .join('');

  const html = `<!doctype html><html><body style="margin:0;background:#F8F5EF;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F5EF;"><tr><td align="center" style="padding:24px 12px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#4A7050;padding:22px 24px;color:#FFFFFF;font-size:12px;letter-spacing:3px;text-align:center;">URI HERBS WORKSHOP · CHIANG MAI</td></tr>
      <tr><td style="padding:26px 24px 6px;">
        <div style="font-family:Georgia,serif;font-size:26px;color:#2D4639;line-height:1.25;">Hi ${esc(first)}, here are your tea recipes</div>
        <div style="font-size:15px;color:#5C4A3D;line-height:1.6;margin-top:10px;">Thank you for stopping by! Below are ${page.recipes.length} simple Thai herbal teas you can make at home. You can also keep the printable recipe card.</div>
        <div style="margin:18px 0 6px;"><a href="${pdf}" style="display:inline-block;background:#4A7050;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:999px;">Download the recipe card (PDF)</a></div>
      </td></tr>
      <tr><td style="padding:6px 24px 10px;"><table width="100%" cellpadding="0" cellspacing="0">${recipesHtml}</table></td></tr>
      <tr><td style="padding:6px 24px 26px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#E7EFEA;border-radius:14px;"><tr><td style="padding:20px;text-align:center;">
          <div style="font-size:13px;color:#4A7050;letter-spacing:1px;">YOUR GIFT</div>
          <div style="font-family:Georgia,serif;font-size:20px;color:#2D4639;margin:6px 0;">${esc(page.couponText)}</div>
          <div style="font-size:26px;font-weight:bold;letter-spacing:4px;color:#2D4639;border:2px dashed #6B8F71;border-radius:10px;display:inline-block;padding:8px 18px;margin:6px 0;">${esc(page.couponCode)}</div>
          <div style="font-size:12.5px;color:#5C4A3D;margin:6px 0 14px;">${esc(page.couponValidity)}</div>
          <a href="${book}" style="display:inline-block;background:#2D4639;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:999px;">Book your tea workshop</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="padding:0 24px 24px;font-size:12px;color:#8A7668;line-height:1.6;text-align:center;">
        Uri Herbs Workshop · Chiang Mai Old City · <a href="${siteUrl}" style="color:#4A7050;">uriherbs.com</a> · WhatsApp +66 64 334 9890<br/>
        You get this email because you asked for the recipes. Reply "unsubscribe" and we will remove you.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;

  const text = [
    `Hi ${first}, here are your tea recipes`,
    '',
    ...page.recipes.flatMap((r) => [r.name.toUpperCase(), ...r.ingredients.map((i) => `- ${i}`), r.method, '']),
    `Recipe card (PDF): ${pdf}`,
    '',
    `YOUR GIFT: ${page.couponText} — code ${page.couponCode}`,
    page.couponValidity,
    `Book: ${book}`,
    '',
    'Uri Herbs Workshop · Chiang Mai Old City · uriherbs.com · WhatsApp +66 64 334 9890',
    'Reply "unsubscribe" and we will remove you.',
  ].join('\n');

  return { subject, html, text };
}
