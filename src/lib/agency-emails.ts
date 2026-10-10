// ============================================================
// src/lib/agency-emails.ts  (server-only)
// ============================================================
// Emails + scheduled jobs for the travel-agency (B2B) flow:
// application received, contract to sign, welcome (agency page link
// + signed contract copy), booking created, payment reminders (18 days
// before and on the due date = 14 days before), automatic cancellation
// of unpaid bookings after the due date, agency cancellations and
// transfer slips. Every send is best-effort and logged, never thrown.
// ============================================================

import {
  sendEmailViaResend, OWNER_EMAIL, SHOP_NAME, SITE_URL,
  formatDateLong, formatTime12, escapeHtml,
} from './notifications';
import { agencyDocPdf, agencyDocData, agencyDocFilename, AGENCY_DOC_SELECT, type AgencyDocKind } from './agency-docs-pdf';

const thb = (n: number) => `฿${Math.round(Number(n) || 0).toLocaleString('en-US')}`;
export const portalUrl = (token: string) => `${SITE_URL}/agency/${token}`;
export const contractUrl = (token: string) => `${SITE_URL}/agency/contract/${token}`;

function shell(title: string, body: string, cta?: { href: string; label: string }) {
  return `<!DOCTYPE html><html><body style="margin:0; background:#F8F5EF; font-family: Arial, sans-serif; color:#2D4639;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F5EF;"><tr><td align="center" style="padding:24px 12px;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #E8E2D8;">
<tr><td style="background:#2D4639; color:#ffffff; padding:18px 20px; font-family: Georgia, serif; font-size:20px; font-weight:bold;">${title}</td></tr>
<tr><td style="padding:18px 20px; font-size:14px; line-height:1.6;">${body}
${cta ? `<p style="margin:18px 0 0;"><a href="${cta.href}" style="display:inline-block; background:#6B8F71; color:#ffffff; text-decoration:none; padding:11px 20px; border-radius:20px; font-weight:bold; font-size:14px;">${cta.label}</a></p>` : ''}
</td></tr>
<tr><td style="padding:12px 20px; background:#FAF7F0; font-size:12px; color:#8A7668;">${SHOP_NAME} · Chiang Mai Old City · reply to this email or WhatsApp +66 64 334 9890</td></tr>
</table></td></tr></table></body></html>`;
}

async function send(
  to: string | null | undefined, subject: string, html: string, text: string,
  attachments?: { filename: string; content: string }[]
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !to) return false;
  try {
    await sendEmailViaResend({ to, subject, html, text, replyTo: OWNER_EMAIL, attachments }, apiKey);
    return true;
  } catch (err: any) {
    console.error(`agency email "${subject}" to ${to} failed:`, err?.message);
    return false;
  }
}

// Invoice / receipt PDF for one agency booking, as an email attachment.
// Best effort: null if anything fails (the email still goes out, and the
// agency can download the document from its agency page).
async function docAttachment(db: any, bookingId: string, kind: AgencyDocKind) {
  try {
    const { data: b } = await db.from('bookings').select(AGENCY_DOC_SELECT).eq('id', bookingId).maybeSingle();
    if (!b?.agency_id) return null;
    const pdf = await agencyDocPdf(agencyDocData(b, kind, SITE_URL));
    return { filename: agencyDocFilename(kind, b.booking_ref), content: pdf.toString('base64') };
  } catch (err: any) {
    console.error(`agency ${kind} PDF failed for ${bookingId}:`, err?.message);
    return null;
  }
}

// "1:00 PM today" style deadline in Chiang Mai time (for the 3-hour / 1-hour payment window).
function fmtDeadline(iso: string) {
  const bkk = new Date(Date.parse(iso) + 7 * 3600 * 1000);
  const h = bkk.getUTCHours(), m = bkk.getUTCMinutes();
  const time = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const day = bkk.toISOString().slice(0, 10);
  return day === today ? `${time} today` : `${time}, ${formatDateLong(day)}`;
}

function bookingLine(b: any, pkgName: string) {
  const start = formatTime12(String(b.start_time).slice(0, 5));
  return `${pkgName} · ${formatDateLong(b.slot_date)}, ${start} · ${b.num_participants} guest${b.num_participants > 1 ? 's' : ''}${b.is_private ? ' (private)' : ''}`;
}

// ── Application ────────────────────────────────────────────
export async function sendApplicationEmails(a: any) {
  const rows = [
    ['Company', a.company_name], ['Contact', a.contact_name], ['Email', a.email], ['Phone / WhatsApp', a.phone],
    ['Business address', a.address], ['Country', a.country], ['Website', a.website],
    ['Business licence no.', a.license_no], ['TAT licence no.', a.tat_no], ['Type', a.business_type],
    ['Groups per month', a.monthly_groups], ['Message', a.message],
  ].filter(r => r[1]);
  const table = rows.map(([k, v]) => `<tr><td style="padding:3px 8px 3px 0; color:#8A7668; vertical-align:top;">${k}</td><td style="padding:3px 0;">${escapeHtml(String(v))}</td></tr>`).join('');
  await send(OWNER_EMAIL, `New agency application — ${a.company_name}`,
    shell('New agency application', `<table style="font-size:14px;">${table}</table><p>Approve or reject it in Admin → Agencies.</p>`,
      { href: `${SITE_URL}/admin/agencies`, label: 'Open Agencies' }),
    rows.map(([k, v]) => `${k}: ${v}`).join('\n'));
  await send(a.email, `We received your agency application — ${SHOP_NAME}`,
    shell('Thank you for applying!', `<p>Hi ${escapeHtml(a.contact_name || a.company_name)},</p>
      <p>We received your application for a ${SHOP_NAME} agency account. We usually reply within 1–2 working days. Once approved, you'll receive your agency agreement to sign online, and then your personal agency page for bookings.</p>`),
    `Hi ${a.contact_name || a.company_name}, we received your application for a ${SHOP_NAME} agency account. We usually reply within 1–2 working days.`);
}

// ── Approved → contract to sign ────────────────────────────
export async function sendContractEmail(a: any) {
  const url = contractUrl(a.contract_token);
  return send(a.email, `Your agency agreement is ready to sign — ${SHOP_NAME}`,
    shell('Welcome aboard — one last step', `<p>Hi ${escapeHtml(a.contact_name || a.company_name)},</p>
      <p>Your agency application for <strong>${escapeHtml(a.company_name)}</strong> is approved. Please read and accept the agency agreement online — it takes two minutes. Right after, you'll get your personal agency page to book workshops for your clients at your agency rate (${Number(a.commission_pct)}% below retail).</p>`,
      { href: url, label: 'Read & sign the agreement' }),
    `Your application is approved. Read & sign the agency agreement: ${url}`);
}

// ── Signed → welcome with agency page + contract copy ─────
export async function sendWelcomeEmails(
  a: any, contractTextCopy: string, pdf?: { filename: string; content: string } | null
) {
  const files = pdf ? [pdf] : undefined;
  const url = portalUrl(a.portal_token);
  const pre = `<pre style="white-space:pre-wrap; font-family: Arial, sans-serif; font-size:12px; background:#FAF7F0; border:1px solid #E8E2D8; border-radius:10px; padding:12px; color:#5C4A3D;">${escapeHtml(contractTextCopy)}</pre>`;
  await send(a.email, `Your agency page is ready — ${SHOP_NAME}`,
    shell('You’re all set 🌿', `<p>Hi ${escapeHtml(a.contact_name || a.company_name)}, thank you for signing. Your personal agency page is ready — book workshops for your clients there, pay online or by bank transfer, and see all your bookings.</p>
      <p style="font-size:13px; color:#8A7668;">Keep this link private — it is your login. Lost it? Use “Get my agency link” on uriherbs.com/trade.</p>
      ${pdf ? '<p style="font-size:13px; color:#8A7668;">Your signed agreement is attached as a PDF.</p>' : ''}
      ${pre}`, { href: url, label: 'Open my agency page' }),
    `Your agency page: ${url}\n\n${contractTextCopy}`, files);
  await send(OWNER_EMAIL, `Agency signed — ${a.company_name}`,
    shell(`Agency signed: ${escapeHtml(a.company_name)}`, `<p>${escapeHtml(a.signed_name || '')} accepted the agency agreement. The agency can now book from its agency page.</p>${pre}`),
    `${a.company_name} signed.\n\n${contractTextCopy}`, files);
}

export async function sendLoginLinkEmail(a: any) {
  const url = portalUrl(a.portal_token);
  return send(a.email, `Your agency page link — ${SHOP_NAME}`,
    shell('Your agency page', `<p>Hi ${escapeHtml(a.contact_name || a.company_name)}, here is your personal agency page link for ${escapeHtml(a.company_name)}.</p>`,
      { href: url, label: 'Open my agency page' }),
    `Your agency page: ${url}`);
}

// ── Booking created ────────────────────────────────────────
export async function sendAgencyBookingCreatedEmails(db: any, bookingId: string) {
  const { data: b } = await db.from('bookings')
    .select('booking_ref, slot_date, start_time, num_participants, is_private, customer_name, customer_notes, status, payment_status, total_price_thb, retail_price_thb, payment_due_date, agency_pay_deadline, agencies ( company_name, contact_name, email, portal_token ), packages ( name )')
    .eq('id', bookingId).maybeSingle();
  if (!b) return;
  const a = Array.isArray(b.agencies) ? b.agencies[0] : b.agencies;
  const pkg = (Array.isArray(b.packages) ? b.packages[0] : b.packages)?.name || 'Workshop';
  const line = bookingLine(b, pkg);
  const payNow = b.status === 'pending_payment';
  const due = b.payment_due_date ? formatDateLong(b.payment_due_date) : '';
  const deadline = b.agency_pay_deadline ? fmtDeadline(b.agency_pay_deadline) : '';
  const hours = b.agency_pay_deadline && b.slot_date === new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10) ? 1 : 3;
  if (deadline) {
    // Less than 14 days ahead: pay within 3 hours (1 hour same day) or it is cancelled.
    const invoice = await docAttachment(db, bookingId, 'invoice');
    await send(a?.email, `Booking ${b.booking_ref} reserved — pay ${thb(b.total_price_thb)} by ${deadline}`,
      shell('Booking reserved — please pay now', `<p><strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p>
        <p>Amount to pay: <strong>${thb(b.total_price_thb)}</strong> (retail ${thb(b.retail_price_thb)}).<br>
        This workshop is less than 14 days away, so please pay within ${hours} hour${hours > 1 ? 's' : ''}: by <strong>${escapeHtml(deadline)}</strong> — online, or by bank transfer with the slip uploaded on your agency page.
        <strong>If it is not paid (or no slip is uploaded) by then, the booking is cancelled automatically.</strong></p>
        ${invoice ? '<p style="font-size:13px; color:#8A7668;">Your invoice is attached as a PDF.</p>' : ''}`,
        a ? { href: portalUrl(a.portal_token), label: 'Pay on my agency page' } : undefined),
      `${b.customer_name}\n${line}\nPay ${thb(b.total_price_thb)} by ${deadline} on your agency page, or the booking is cancelled automatically.`,
      invoice ? [invoice] : undefined);
  } else if (!payNow) {
    const invoice = await docAttachment(db, bookingId, 'invoice');
    await send(a?.email, `Booking ${b.booking_ref} reserved — pay ${thb(b.total_price_thb)} by ${due}`,
      shell('Booking reserved', `<p><strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p>
        <p>Amount to pay: <strong>${thb(b.total_price_thb)}</strong> (retail ${thb(b.retail_price_thb)}).<br>
        Payment due by <strong>${due}</strong> — online or by bank transfer on your agency page. Unpaid bookings are cancelled automatically after this date.</p>
        ${invoice ? '<p style="font-size:13px; color:#8A7668;">Your invoice is attached as a PDF.</p>' : ''}`,
        a ? { href: portalUrl(a.portal_token), label: 'Pay on my agency page' } : undefined),
      `${b.customer_name}\n${line}\nPay ${thb(b.total_price_thb)} by ${due} on your agency page.`,
      invoice ? [invoice] : undefined);
  }
  await send(OWNER_EMAIL, `Agency booking — ${b.booking_ref} · ${a?.company_name || ''} (${b.num_participants} guests)`,
    shell(`Agency booking · ${escapeHtml(a?.company_name || '')}`, `<p><strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p>
      ${b.customer_notes ? `<p><strong>Notes:</strong> ${escapeHtml(b.customer_notes)}</p>` : ''}
      <p>Net ${thb(b.total_price_thb)} (retail ${thb(b.retail_price_thb)}) · ${deadline ? `unpaid — must pay within ${hours} h, by ${escapeHtml(deadline)} (otherwise cancelled automatically)` : payNow ? 'paying now (30-minute hold)' : `unpaid — due ${due}`}</p>`),
    `${b.customer_name}\n${line}\nNet ${thb(b.total_price_thb)} · ${deadline ? `pay by ${deadline}` : payNow ? 'paying now' : `due ${due}`}`);
}

// ── Agency cancelled ───────────────────────────────────────
export async function sendAgencyCancellationEmails(db: any, bookingRef: string) {
  const { data: b } = await db.from('bookings')
    .select('booking_ref, slot_date, start_time, num_participants, is_private, customer_name, status, cancelled_by, cancel_reason, payment_status, total_price_thb, agencies ( company_name, email, portal_token ), packages ( name )')
    .eq('booking_ref', bookingRef).maybeSingle();
  if (!b || b.status !== 'cancelled' || b.cancelled_by !== 'agency') return;
  const a = Array.isArray(b.agencies) ? b.agencies[0] : b.agencies;
  const pkg = (Array.isArray(b.packages) ? b.packages[0] : b.packages)?.name || 'Workshop';
  const line = bookingLine(b, pkg);
  await send(a?.email, `Booking ${b.booking_ref} cancelled`,
    shell('Booking cancelled', `<p><strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p><p>${escapeHtml(b.cancel_reason || '')}</p>`),
    `${b.customer_name}\n${line}\n${b.cancel_reason || ''}`);
  await send(OWNER_EMAIL, `Agency cancelled — ${b.booking_ref} · ${a?.company_name || ''}`,
    shell('Agency cancellation', `<p><strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p>
      <p>${escapeHtml(b.cancel_reason || '')}${b.payment_status === 'paid' ? '<br><strong>Refund due — please process it.</strong>' : ''}</p>`),
    `${b.customer_name}\n${line}\n${b.cancel_reason || ''}`);
}

export async function sendSlipReceivedEmail(db: any, bookingId: string) {
  const { data: b } = await db.from('bookings')
    .select('booking_ref, customer_name, total_price_thb, agency_pay_deadline, slot_date, agencies ( company_name )').eq('id', bookingId).maybeSingle();
  if (!b) return;
  const a = Array.isArray(b.agencies) ? b.agencies[0] : b.agencies;
  const urgent = b.agency_pay_deadline ? ` — last-minute booking for ${formatDateLong(b.slot_date)}, please check now` : '';
  await send(OWNER_EMAIL, `Transfer slip uploaded — ${b.booking_ref} · ${thb(b.total_price_thb)}${urgent}`,
    shell('Transfer slip received', `<p>${escapeHtml(a?.company_name || '')} uploaded a bank-transfer slip for <strong>${escapeHtml(b.booking_ref)}</strong> (${escapeHtml(b.customer_name)}) — ${thb(b.total_price_thb)}.</p><p>Check it and mark the booking paid in Admin → Agencies.</p>`,
      { href: `${SITE_URL}/admin/agencies`, label: 'Open Agencies' }),
    `${a?.company_name} uploaded a transfer slip for ${b.booking_ref} — ${thb(b.total_price_thb)}.`);
}

// ── Daily payment job (called from /api/cron/reminders) ────
// Agency bookings confirmed but unpaid:
//   due date − 4 days (= 18 days before the workshop) → reminder
//   on the due date (14 days before)                   → last-day reminder
//   after the due date                                 → cancelled, places released
// Daily agency payment job (runs from the 5-minute reminders cron, from
// 09:00 Chiang Mai time). Payment is due 14 days before the workshop.
//
//   18 days before (4 days before due) → agency: payment reminder
//   due date                           → agency: "last day to pay" (unless a slip is uploaded)
//                                        shop:   "due today" summary for that booking
//   day after due, NO slip             → cancelled automatically, agency + shop emailed
//   day after due, slip uploaded       → NOT cancelled (owner decision 2026-10-10); no more
//                                        agency reminders; shop gets "slip waiting — please
//                                        check and Mark paid", once a day until marked paid
// Every email is claimed with a column first, so overlapping cron runs never double-send.
export async function processAgencyPayments(db: any): Promise<{ reminded: number; cancelled: number; shop: number }> {
  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const nowH = new Date(Date.now() + 7 * 3600 * 1000).getUTCHours();
  let reminded = 0; let cancelled = 0; let shop = 0;

  // ── Bookings < 14 days ahead: pay within 3 h (1 h same day) of booking ──
  // Checked on every run (any hour): past the deadline, unpaid and NO slip →
  // cancelled. A booking with an uploaded slip is kept (owner checks it; the
  // daily "slip waiting" reminder below covers it from the next day).
  const { data: late } = await db.from('bookings')
    .select('id, booking_ref, slot_date, start_time, num_participants, is_private, customer_name, total_price_thb, agency_pay_deadline, agencies ( company_name, email, portal_token ), packages ( name )')
    .not('agency_id', 'is', null).eq('status', 'confirmed').eq('payment_status', 'unpaid')
    .is('payment_proof_at', null).not('agency_pay_deadline', 'is', null).lt('agency_pay_deadline', new Date().toISOString());
  for (const b of late || []) {
    const { data: claimed } = await db.from('bookings')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'system', cancel_reason: `Not paid by ${fmtDeadline(b.agency_pay_deadline)}` })
      .eq('id', b.id).eq('status', 'confirmed').eq('payment_status', 'unpaid').is('payment_proof_at', null)
      .select('id').maybeSingle();
    if (!claimed) continue;
    await db.from('booking_slots').delete().eq('booking_id', b.id);
    cancelled++;
    const a = Array.isArray(b.agencies) ? b.agencies[0] : b.agencies;
    const pkg = (Array.isArray(b.packages) ? b.packages[0] : b.packages)?.name || 'Workshop';
    const line = bookingLine(b, pkg);
    const page = a ? portalUrl(a.portal_token) : SITE_URL;
    await send(a?.email, `Booking ${b.booking_ref} cancelled — not paid in time`,
      shell('Booking cancelled (unpaid)', `<p><strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p>
        <p>This booking was not paid (and no transfer slip was uploaded) by ${escapeHtml(fmtDeadline(b.agency_pay_deadline))}, so it has been cancelled and the places released. If you still need it, book again on your agency page (subject to availability).</p>`,
        { href: page, label: 'Open my agency page' }),
      `${b.booking_ref} was not paid by ${fmtDeadline(b.agency_pay_deadline)} and has been cancelled. ${line}`);
    await send(OWNER_EMAIL, `Auto-cancelled unpaid last-minute agency booking — ${b.booking_ref} · ${a?.company_name || ''}`,
      shell('Unpaid agency booking cancelled', `<p>${escapeHtml(a?.company_name || '')} · <strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p><p>${thb(b.total_price_thb)} was not paid and no slip uploaded by ${escapeHtml(fmtDeadline(b.agency_pay_deadline))}. Places released.</p>`),
      `${b.booking_ref} auto-cancelled (not paid by ${fmtDeadline(b.agency_pay_deadline)}).`);
  }

  if (nowH < 9) return { reminded, cancelled, shop }; // the emails below go out in Chiang Mai daytime

  const { data: rows } = await db.from('bookings')
    .select('id, booking_ref, slot_date, start_time, num_participants, is_private, customer_name, total_price_thb, payment_due_date, payment_proof_at, agency_pay_deadline, agency_reminder18_at, agency_reminder_last_at, agency_shop_due_at, agency_slip_reminded_on, agencies ( company_name, contact_name, email, portal_token ), packages ( name )')
    .not('agency_id', 'is', null).eq('status', 'confirmed').eq('payment_status', 'unpaid')
    .not('payment_due_date', 'is', null).lte('payment_due_date', new Date(Date.parse(today) + 4 * 86400000).toISOString().slice(0, 10));

  for (const b of rows || []) {
    const a = Array.isArray(b.agencies) ? b.agencies[0] : b.agencies;
    const pkg = (Array.isArray(b.packages) ? b.packages[0] : b.packages)?.name || 'Workshop';
    const line = bookingLine(b, pkg);
    const due = b.payment_due_date as string;
    const page = a ? portalUrl(a.portal_token) : SITE_URL;
    const hasSlip = !!b.payment_proof_at;
    const slipWhen = hasSlip ? new Date(b.payment_proof_at).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    const adminLink = { href: `${SITE_URL}/admin/agencies`, label: 'Open Agencies' };

    if (today > due) {
      if (hasSlip) {
        // Slip uploaded → never auto-cancel. Remind the shop once a day until Mark paid.
        if (b.agency_slip_reminded_on && b.agency_slip_reminded_on >= today) continue;
        const { data: claimed } = await db.from('bookings').update({ agency_slip_reminded_on: today })
          .eq('id', b.id).eq('payment_status', 'unpaid')
          .or(`agency_slip_reminded_on.is.null,agency_slip_reminded_on.lt.${today}`)
          .select('id').maybeSingle();
        if (!claimed) continue;
        shop++;
        await send(OWNER_EMAIL, `Slip waiting — please check and Mark paid · ${b.booking_ref} · ${thb(b.total_price_thb)}`,
          shell('Bank slip waiting for you', `<p>${escapeHtml(a?.company_name || '')} · <strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p>
            <p>Payment was due <strong>${formatDateLong(due)}</strong>. The agency uploaded a bank-transfer slip on ${escapeHtml(slipWhen)}, so the booking was <strong>not</strong> cancelled.</p>
            <p>Please check that <strong>${thb(b.total_price_thb)}</strong> arrived in the bank account, then click <strong>Mark paid</strong> in Admin → Agencies (the agency then gets the receipt). This reminder repeats every day until it is marked paid.</p>`, adminLink),
          `${b.booking_ref}: slip uploaded ${slipWhen}, due ${due}. Check ${thb(b.total_price_thb)} arrived and Mark paid in Admin → Agencies.`);
        continue;
      }
      // Unpaid after the due date and no slip → cancel and release the places.
      const { data: claimed } = await db.from('bookings')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'system', cancel_reason: `Not paid by the due date (${due})` })
        .eq('id', b.id).eq('status', 'confirmed').eq('payment_status', 'unpaid').is('payment_proof_at', null)
        .select('id').maybeSingle();
      if (!claimed) continue;
      await db.from('booking_slots').delete().eq('booking_id', b.id);
      cancelled++;
      await send(a?.email, `Booking ${b.booking_ref} cancelled — not paid by ${formatDateLong(due)}`,
        shell('Booking cancelled (unpaid)', `<p><strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p>
          <p>This booking was not paid by the due date, so it has been cancelled and the places released. If you still need it, book again on your agency page (subject to availability).</p>`,
          { href: page, label: 'Open my agency page' }),
        `${b.booking_ref} was not paid by ${due} and has been cancelled. ${line}`);
      await send(OWNER_EMAIL, `Auto-cancelled unpaid agency booking — ${b.booking_ref} · ${a?.company_name || ''}`,
        shell('Unpaid agency booking cancelled', `<p>${escapeHtml(a?.company_name || '')} · <strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p><p>Due ${formatDateLong(due)} — ${thb(b.total_price_thb)} unpaid, no transfer slip. Places released.</p>`),
        `${b.booking_ref} auto-cancelled (unpaid, due ${due}).`);
      continue;
    }

    // Last-minute bookings (3 h / 1 h window) have their own deadline handling above —
    // no 18-day / last-day / due-today emails for them.
    if (b.agency_pay_deadline) continue;

    const isLastDay = today === due;

    // Shop: "due today" for every agency booking still unpaid on its due date.
    if (isLastDay && !b.agency_shop_due_at) {
      const { data: claimed } = await db.from('bookings').update({ agency_shop_due_at: new Date().toISOString() })
        .eq('id', b.id).is('agency_shop_due_at', null).select('id').maybeSingle();
      if (claimed) {
        shop++;
        await send(OWNER_EMAIL,
          hasSlip ? `Due today, slip uploaded — please check · ${b.booking_ref} · ${thb(b.total_price_thb)}`
                  : `Due today, unpaid — ${b.booking_ref} · ${a?.company_name || ''} · ${thb(b.total_price_thb)}`,
          shell(hasSlip ? 'Agency payment due today — slip uploaded' : 'Agency payment due today', `<p>${escapeHtml(a?.company_name || '')} · <strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p>
            ${hasSlip
              ? `<p>The agency uploaded a bank-transfer slip on ${escapeHtml(slipWhen)}. Please check that <strong>${thb(b.total_price_thb)}</strong> arrived, then click <strong>Mark paid</strong>. A booking with a slip is never cancelled automatically.</p>`
              : `<p><strong>${thb(b.total_price_thb)}</strong> is still unpaid and due today. If it is not paid (and no slip is uploaded), it will be <strong>cancelled automatically tomorrow at 9:00</strong>.</p>`}`, adminLink),
          `${b.booking_ref} (${a?.company_name || ''}) — ${thb(b.total_price_thb)} due today${hasSlip ? `, slip uploaded ${slipWhen}` : ', unpaid — auto-cancel tomorrow 9:00 if still unpaid'}.`);
      }
    }

    // Agency reminders stop once a slip is uploaded.
    if (hasSlip) continue;
    const flag = isLastDay ? 'agency_reminder_last_at' : 'agency_reminder18_at';
    if (b[flag]) continue;
    const { data: claimed } = await db.from('bookings').update({ [flag]: new Date().toISOString() })
      .eq('id', b.id).is(flag, null).select('id').maybeSingle();
    if (!claimed) continue;
    reminded++;
    await send(a?.email,
      isLastDay ? `Last day to pay — booking ${b.booking_ref} (${thb(b.total_price_thb)})` : `Payment reminder — booking ${b.booking_ref} due ${formatDateLong(due)}`,
      shell(isLastDay ? 'Today is the last day to pay' : 'Payment reminder', `<p><strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p>
        <p>Amount: <strong>${thb(b.total_price_thb)}</strong> · due <strong>${formatDateLong(due)}</strong>.
        ${isLastDay ? 'If it is not paid today, the booking will be cancelled automatically tomorrow.' : 'Unpaid bookings are cancelled automatically after the due date.'}</p>
        <p style="font-size:13px; color:#8A7668;">Paid by bank transfer? Upload the slip on your agency page and the booking will not be cancelled while we check it.</p>`,
        { href: page, label: 'Pay now' }),
      `${b.booking_ref}: pay ${thb(b.total_price_thb)} by ${due}. ${page}`);
  }
  return { reminded, cancelled, shop };
}

// Payment received → "thank you" email with the receipt PDF.
// Called after admin "Mark paid" (bank transfer) and after an online
// card/PayPal payment (agency page + payment webhooks). Sent ONCE per
// booking: `agency_receipt_sent_at` is claimed atomically, so the several
// callers of an online payment can't double-send. Only for a payment
// recorded in the last 15 minutes (the notify route is public).
export async function sendAgencyPaidEmail(db: any, bookingId: string) {
  const { data: b } = await db.from('bookings')
    .select('id, booking_ref, slot_date, start_time, num_participants, is_private, customer_name, total_price_thb, payment_status, payment_method, paid_at, agency_id, agencies ( company_name, contact_name, email ), packages ( name )')
    .eq('id', bookingId).maybeSingle();
  if (!b?.agency_id || b.payment_status !== 'paid' || !b.paid_at || Date.now() - new Date(b.paid_at).getTime() > 15 * 60_000) return;
  const { data: claimed } = await db.from('bookings').update({ agency_receipt_sent_at: new Date().toISOString() })
    .eq('id', b.id).is('agency_receipt_sent_at', null).select('id').maybeSingle();
  if (!claimed) return; // already sent
  const a = Array.isArray(b.agencies) ? b.agencies[0] : b.agencies;
  const pkg = (Array.isArray(b.packages) ? b.packages[0] : b.packages)?.name || 'Workshop';
  const line = bookingLine(b, pkg);
  const receipt = await docAttachment(db, b.id, 'receipt');
  await send(a?.email, `Thank you — payment received for ${b.booking_ref}`,
    shell('Thank you — payment received ✓', `<p>Hi ${escapeHtml(a?.contact_name || a?.company_name || '')},</p>
      <p>Thank you! We received your payment of <strong>${thb(b.total_price_thb)}</strong>. The booking is confirmed:</p>
      <p><strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p>
      ${receipt ? '<p>Here is the receipt for your order (PDF attached).</p>' : ''}
      <p>See you in Chiang Mai!</p>`),
    `Thank you — we received ${thb(b.total_price_thb)} for ${b.booking_ref}. The booking is confirmed. ${line}`,
    receipt ? [receipt] : undefined);
  // The shop only needs to hear about ONLINE payments (Mark paid is done by the shop itself).
  if (b.payment_method === 'stripe' || b.payment_method === 'paypal') {
    await send(OWNER_EMAIL, `Agency paid online — ${b.booking_ref} · ${thb(b.total_price_thb)} · ${a?.company_name || ''}`,
      shell('Agency payment received', `<p>${escapeHtml(a?.company_name || '')} · <strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p><p>${thb(b.total_price_thb)} paid online (${escapeHtml(b.payment_method || '')}). The receipt was emailed to the agency.</p>`),
      `${a?.company_name} paid ${thb(b.total_price_thb)} for ${b.booking_ref}.`);
  }
}
