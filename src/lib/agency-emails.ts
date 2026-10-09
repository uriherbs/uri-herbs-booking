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
    .select('booking_ref, slot_date, start_time, num_participants, is_private, customer_name, customer_notes, status, payment_status, total_price_thb, retail_price_thb, payment_due_date, agencies ( company_name, contact_name, email, portal_token ), packages ( name )')
    .eq('id', bookingId).maybeSingle();
  if (!b) return;
  const a = Array.isArray(b.agencies) ? b.agencies[0] : b.agencies;
  const pkg = (Array.isArray(b.packages) ? b.packages[0] : b.packages)?.name || 'Workshop';
  const line = bookingLine(b, pkg);
  const payNow = b.status === 'pending_payment';
  const due = b.payment_due_date ? formatDateLong(b.payment_due_date) : '';
  if (!payNow) {
    await send(a?.email, `Booking ${b.booking_ref} reserved — pay ${thb(b.total_price_thb)} by ${due}`,
      shell('Booking reserved', `<p><strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p>
        <p>Amount to pay: <strong>${thb(b.total_price_thb)}</strong> (retail ${thb(b.retail_price_thb)}).<br>
        Payment due by <strong>${due}</strong> — online or by bank transfer on your agency page. Unpaid bookings are cancelled automatically after this date.</p>`,
        a ? { href: portalUrl(a.portal_token), label: 'Pay on my agency page' } : undefined),
      `${b.customer_name}\n${line}\nPay ${thb(b.total_price_thb)} by ${due} on your agency page.`);
  }
  await send(OWNER_EMAIL, `Agency booking — ${b.booking_ref} · ${a?.company_name || ''} (${b.num_participants} guests)`,
    shell(`Agency booking · ${escapeHtml(a?.company_name || '')}`, `<p><strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p>
      ${b.customer_notes ? `<p><strong>Notes:</strong> ${escapeHtml(b.customer_notes)}</p>` : ''}
      <p>Net ${thb(b.total_price_thb)} (retail ${thb(b.retail_price_thb)}) · ${payNow ? 'paying now (30-minute hold)' : `unpaid — due ${due}`}</p>`),
    `${b.customer_name}\n${line}\nNet ${thb(b.total_price_thb)} · ${payNow ? 'paying now' : `due ${due}`}`);
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
    .select('booking_ref, customer_name, total_price_thb, agencies ( company_name )').eq('id', bookingId).maybeSingle();
  if (!b) return;
  const a = Array.isArray(b.agencies) ? b.agencies[0] : b.agencies;
  await send(OWNER_EMAIL, `Transfer slip uploaded — ${b.booking_ref} · ${thb(b.total_price_thb)}`,
    shell('Transfer slip received', `<p>${escapeHtml(a?.company_name || '')} uploaded a bank-transfer slip for <strong>${escapeHtml(b.booking_ref)}</strong> (${escapeHtml(b.customer_name)}) — ${thb(b.total_price_thb)}.</p><p>Check it and mark the booking paid in Admin → Agencies.</p>`,
      { href: `${SITE_URL}/admin/agencies`, label: 'Open Agencies' }),
    `${a?.company_name} uploaded a transfer slip for ${b.booking_ref} — ${thb(b.total_price_thb)}.`);
}

// ── Daily payment job (called from /api/cron/reminders) ────
// Agency bookings confirmed but unpaid:
//   due date − 4 days (= 18 days before the workshop) → reminder
//   on the due date (14 days before)                   → last-day reminder
//   after the due date                                 → cancelled, places released
export async function processAgencyPayments(db: any): Promise<{ reminded: number; cancelled: number }> {
  const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  const nowH = new Date(Date.now() + 7 * 3600 * 1000).getUTCHours();
  let reminded = 0; let cancelled = 0;
  if (nowH < 9) return { reminded, cancelled }; // send in Chiang Mai daytime

  const { data: rows } = await db.from('bookings')
    .select('id, booking_ref, slot_date, start_time, num_participants, is_private, customer_name, total_price_thb, payment_due_date, agency_reminder18_at, agency_reminder_last_at, agencies ( company_name, contact_name, email, portal_token ), packages ( name )')
    .not('agency_id', 'is', null).eq('status', 'confirmed').eq('payment_status', 'unpaid')
    .not('payment_due_date', 'is', null).lte('payment_due_date', new Date(Date.parse(today) + 4 * 86400000).toISOString().slice(0, 10));

  for (const b of rows || []) {
    const a = Array.isArray(b.agencies) ? b.agencies[0] : b.agencies;
    const pkg = (Array.isArray(b.packages) ? b.packages[0] : b.packages)?.name || 'Workshop';
    const line = bookingLine(b, pkg);
    const due = b.payment_due_date as string;
    const page = a ? portalUrl(a.portal_token) : SITE_URL;

    if (today > due) {
      // Unpaid after the due date → cancel and release the places.
      const { data: claimed } = await db.from('bookings')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'system', cancel_reason: `Not paid by the due date (${due})` })
        .eq('id', b.id).eq('status', 'confirmed').eq('payment_status', 'unpaid').select('id').maybeSingle();
      if (!claimed) continue;
      await db.from('booking_slots').delete().eq('booking_id', b.id);
      cancelled++;
      await send(a?.email, `Booking ${b.booking_ref} cancelled — not paid by ${formatDateLong(due)}`,
        shell('Booking cancelled (unpaid)', `<p><strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p>
          <p>This booking was not paid by the due date, so it has been cancelled and the places released. If you still need it, book again on your agency page (subject to availability).</p>`,
          { href: page, label: 'Open my agency page' }),
        `${b.booking_ref} was not paid by ${due} and has been cancelled. ${line}`);
      await send(OWNER_EMAIL, `Auto-cancelled unpaid agency booking — ${b.booking_ref} · ${a?.company_name || ''}`,
        shell('Unpaid agency booking cancelled', `<p>${escapeHtml(a?.company_name || '')} · <strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p><p>Due ${formatDateLong(due)} — ${thb(b.total_price_thb)} unpaid. Places released.</p>`),
        `${b.booking_ref} auto-cancelled (unpaid, due ${due}).`);
      continue;
    }

    const isLastDay = today === due;
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
        ${isLastDay ? 'If it is not paid today, the booking will be cancelled automatically tomorrow.' : 'Unpaid bookings are cancelled automatically after the due date.'}</p>`,
        { href: page, label: 'Pay now' }),
      `${b.booking_ref}: pay ${thb(b.total_price_thb)} by ${due}. ${page}`);
  }
  return { reminded, cancelled };
}

export async function sendAgencyPaidEmail(db: any, bookingId: string) {
  const { data: b } = await db.from('bookings')
    .select('booking_ref, slot_date, start_time, num_participants, is_private, customer_name, total_price_thb, payment_method, paid_at, agencies ( company_name, email ), packages ( name )')
    .eq('id', bookingId).maybeSingle();
  if (!b || !b.paid_at || Date.now() - new Date(b.paid_at).getTime() > 15 * 60_000) return;
  const a = Array.isArray(b.agencies) ? b.agencies[0] : b.agencies;
  const pkg = (Array.isArray(b.packages) ? b.packages[0] : b.packages)?.name || 'Workshop';
  const line = bookingLine(b, pkg);
  await send(a?.email, `Payment received — booking ${b.booking_ref} confirmed`,
    shell('Payment received ✓', `<p><strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p><p>We received ${thb(b.total_price_thb)}. The booking is confirmed — see you in Chiang Mai!</p>`),
    `Payment of ${thb(b.total_price_thb)} received — ${b.booking_ref} confirmed. ${line}`);
  await send(OWNER_EMAIL, `Agency paid online — ${b.booking_ref} · ${thb(b.total_price_thb)} · ${a?.company_name || ''}`,
    shell('Agency payment received', `<p>${escapeHtml(a?.company_name || '')} · <strong>${escapeHtml(b.customer_name)}</strong><br>${escapeHtml(line)}</p><p>${thb(b.total_price_thb)} paid online (${escapeHtml(b.payment_method || '')}).</p>`),
    `${a?.company_name} paid ${thb(b.total_price_thb)} for ${b.booking_ref}.`);
}
