// ============================================================
// src/lib/lead-emails.ts
// ============================================================
// The "here are your recipes" email sent by /api/leads.
//
// Written to look like a personal note, not a newsletter (owner
// 2026-11-06: the first version landed in Gmail's Promotions tab).
// Gmail sorts by how a message looks, so this version has:
//   - plain text-style HTML: no coloured header, no buttons, no images
//   - one link (the recipe card PDF) plus the website in the signature
//   - no discount code and no "unsubscribe" wording — the coupon is
//     shown on screen right after sign-up; opt-out is a plain
//     "just reply" line (we honour it by hand)
//   - a question that invites a reply (replies teach Gmail the sender
//     is wanted); Reply-To is info@uriherbs.com
// The recipes stay in the body so the email is useful on its own.
// ============================================================

import type { LandingPageConfig } from './landing-pages';

export const LEAD_EMAIL_REPLY_TO = 'info@uriherbs.com';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildLeadGiftEmail(page: LandingPageConfig, name: string, siteUrl: string) {
  const first = name.split(/\s+/)[0] || name;
  const pdf = `${siteUrl}${page.pdfUrl}`;
  const subject = 'Your tea recipes from Uri Herbs';

  const p = (html: string) => `<p style="margin:0 0 14px;">${html}</p>`;

  const recipesHtml = page.recipes
    .map(
      (r, i) =>
        p(
          `<strong>${i + 1}. ${esc(r.name)}</strong><br/>` +
            r.ingredients.map((x) => esc(x)).join('<br/>') +
            `<br/>${esc(r.method)}`
        )
    )
    .join('');

  const html = `<!doctype html><html><body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#222;">
<div style="max-width:560px;">
${p(`Hi ${esc(first)},`)}
${p(`Thank you for stopping by! Here are the ${page.recipes.length} Thai herbal teas we promised. A printable recipe card is here: <a href="${pdf}">${pdf.replace(/^https?:\/\//, '')}</a>`)}
${recipesHtml}
${p('Which one will you try first? Just reply and tell me — I read every message.')}
${p(`Warmly,<br/>Mali<br/>Uri Herbs Workshop, Chiang Mai Old City<br/><a href="${siteUrl}">uriherbs.com</a> · WhatsApp +66 64 334 9890`)}
<p style="margin:18px 0 0;font-size:12px;color:#777;">You asked for these recipes on our website. If you'd rather not hear from us again, just reply and let us know.</p>
</div></body></html>`;

  const text = [
    `Hi ${first},`,
    '',
    `Thank you for stopping by! Here are the ${page.recipes.length} Thai herbal teas we promised.`,
    `Printable recipe card: ${pdf}`,
    '',
    ...page.recipes.flatMap((r, i) => [`${i + 1}. ${r.name}`, ...r.ingredients, r.method, '']),
    'Which one will you try first? Just reply and tell me — I read every message.',
    '',
    'Warmly,',
    'Mali',
    'Uri Herbs Workshop, Chiang Mai Old City',
    `${siteUrl} · WhatsApp +66 64 334 9890`,
    '',
    "You asked for these recipes on our website. If you'd rather not hear from us again, just reply and let us know.",
  ].join('\n');

  return { subject, html, text };
}
