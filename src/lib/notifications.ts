// ============================================================
// URI HERBS WORKSHOP — Notification Service
// ============================================================
// Target audience: international tourists (Europe, Americas, Asia)
// in Chiang Mai — NOT local Thai residents.
//
// Channels:
//   1. EMAIL (primary confirmation) — via Resend
//   2. WHATSAPP (chat & reminders) — click-to-chat links +
//      optional WhatsApp Business API for automated sends
//
// LINE is intentionally NOT used — it's dominant with Thai
// locals but has near-zero adoption among Western/int'l tourists,
// who default to WhatsApp.
// ============================================================

const SHOP_NAME = 'Uri Herbs Workshop';
const SHOP_ADDRESS = '44, 3 Si Phum Soi 9, Tambon Si Phum, Chiang Mai Old City, Thailand';
// Coordinate + Place ID pattern (matches src/app/contact/page.tsx and
// src/app/book/page.tsx) — a free-text query like the old
// `?q=Uri+Herbs+Workshop+...` link used to geocode to a neighboring
// business (The Moon Eatery / SALT & FIRE Rooftop Bar) instead of the
// actual location. hl=en keeps the destination page in English.
const SHOP_MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=' +
  encodeURIComponent('Uri Herbs Workshop') +
  '&query_place_id=0x30da3bb4d505e7c5:0x41cac3c3a753cc10&hl=en';
const SHOP_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '66643349890'; // real shop number (matches FloatingWhatsApp.tsx)
const SHOP_INSTAGRAM = 'https://instagram.com/uriherbsworkshop';
const SHOP_WEBSITE = 'https://www.uriherbs.com';
// Base URL for links that must reach the NEW booking site (e.g. the
// customer cancel page). Set NEXT_PUBLIC_SITE_URL=https://www.uriherbs.com
// in Vercel once the domain is switched from SimplyBook to Vercel.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://uri-herbs-booking.vercel.app').replace(/\/$/, '');

// ────────────────────────────────────────────────────────────
// 1. WHATSAPP CLICK-TO-CHAT LINKS
// ────────────────────────────────────────────────────────────
// No API needed for these — they open WhatsApp with a pre-filled
// message. Used for: "Chat with us" buttons, confirmation page,
// and admin dashboard's customer contact links.

export function buildWhatsAppLink(phone: string, message: string): string {
  const cleanPhone = phone.replace(/[^\d]/g, ''); // strip +, spaces, dashes
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

// Customer → shop: "Chat with us about your booking" button
export function buildCustomerToShopWhatsAppLink(bookingRef?: string): string {
  const message = bookingRef
    ? `Hi! I have a question about my booking ${bookingRef} at Uri Herbs Workshop.`
    : `Hi! I'd like to ask about booking a workshop at Uri Herbs Workshop.`;
  return buildWhatsAppLink(SHOP_WHATSAPP_NUMBER, message);
}

// Shop → customer: used by admin dashboard to message a specific guest
export function buildShopToCustomerWhatsAppLink(
  customerPhone: string,
  customerName: string,
  bookingRef: string
): string {
  const message = `Hi ${customerName}! This is Mali from Uri Herbs Workshop 🌿 Following up on your booking ${bookingRef}.`;
  return buildWhatsAppLink(customerPhone, message);
}


// ────────────────────────────────────────────────────────────
// 2. EMAIL TEMPLATE  (HTML, for Resend)
// ────────────────────────────────────────────────────────────
// Self-contained inline-styled HTML (email clients strip <style>
// tags in many cases, so everything is inline). Boho-botanical
// theme matches the booking UI.

export interface BookingEmailData {
  bookingRef: string;
  customerName: string;
  packageName: string;
  packageIcon: string;
  date: string;           // 'YYYY-MM-DD'
  startTime: string;      // 'HH:MM'
  endTime: string;        // 'HH:MM'
  numParticipants: number;
  // null = a whole-space private booking (9+ guests) that spans both
  // instructor tables — there's no single group to name. Same
  // null-safety as slotGroupLabel() in src/app/book/page.tsx.
  instructorGroup: 'A' | 'B' | null;
  isPrivate: boolean;
  totalPriceThb: number;
  takeawayDescription: string;
  paymentMethod: string; // 'stripe' | 'paypal' | 'later' | ...
  cancelUrl?: string; // customer self-cancel page (/cancel/<cancel_token>)
  rescheduleUrl?: string; // customer self-reschedule page (/reschedule/<cancel_token>)
  headline?: string; // banner text, default "Booking Confirmed!"
}

// Mirrors the group-label logic in src/app/book/page.tsx's
// slotGroupLabel() so the email matches what the customer already
// saw on the confirmation page.
function groupLabel(instructorGroup: 'A' | 'B' | null, isPrivate: boolean): string {
  if (instructorGroup === null) return isPrivate ? 'Whole space — both instructors' : 'Whole space';
  const instructor = instructorGroup === 'A' ? 'with Mali' : 'Instructor B';
  return isPrivate ? `Private table — Group ${instructorGroup} (${instructor})` : `Group ${instructorGroup} (${instructor})`;
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime12(t: string): string {
  const h = parseInt(t.split(':')[0]);
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
}

export function buildConfirmationEmailHtml(data: BookingEmailData): string {
  const dateLong = formatDateLong(data.date);
  const startStr = formatTime12(data.startTime);
  const endStr = formatTime12(data.endTime);
  const whatsappLink = buildCustomerToShopWhatsAppLink(data.bookingRef);

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background-color:#F5F2EC; font-family: Georgia, 'Times New Roman', serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F2EC; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; max-width:480px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#2D4639; padding: 32px 24px; text-align:center;">
              <div style="font-size:28px; margin-bottom:8px;">🌿</div>
              <div style="font-family: Georgia, serif; font-size:22px; font-weight:bold; color:#ffffff;">
                ${SHOP_NAME}
              </div>
              <div style="font-family: Arial, sans-serif; font-size:13px; color:#B8CCC0; margin-top:4px;">
                Chiang Mai Old City, Thailand
              </div>
            </td>
          </tr>

          <!-- Success banner -->
          <tr>
            <td style="background-color:#6B8F71; padding: 24px; text-align:center;">
              <div style="font-family: Georgia, serif; font-size:20px; font-weight:bold; color:#ffffff; margin-bottom:6px;">
                ${data.headline || 'Booking Confirmed!'}
              </div>
              <div style="font-family: Arial, sans-serif; font-size:13px; color:#E7EFEA; margin-bottom:14px;">
                Your herbal experience is reserved
              </div>
              <div style="display:inline-block; background-color:rgba(255,255,255,0.2); border-radius:8px; padding:8px 20px; font-family: Arial, sans-serif; font-size:17px; font-weight:bold; color:#ffffff; letter-spacing:1px;">
                ${data.bookingRef}
              </div>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 24px 8px;">
              <p style="font-family: Arial, sans-serif; font-size:15px; color:#2D4639; margin:0 0 4px;">
                Dear ${data.customerName},
              </p>
              <p style="font-family: Arial, sans-serif; font-size:14px; color:#5C4A3D; line-height:1.6; margin:0;">
                Thank you for booking with us! We can't wait to share the art of Thai herbal wellness with you. Here are your booking details:
              </p>
            </td>
          </tr>

          <!-- Details card -->
          <tr>
            <td style="padding: 16px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1.5px solid #E8E2D8; border-radius:12px; overflow:hidden;">
                <tr>
                  <td style="padding:16px 18px; border-bottom:1px solid #E8E2D8;">
                    <div style="font-family: Arial, sans-serif; font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Experience</div>
                    <div style="font-family: Georgia, serif; font-size:17px; font-weight:bold; color:#2D4639;">
                      ${data.packageIcon} ${data.packageName}
                    </div>
                    <div style="font-family: Arial, sans-serif; font-size:12px; color:#8A7668; margin-top:2px;">
                      ${data.numParticipants} guest${data.numParticipants > 1 ? 's' : ''} • ${groupLabel(data.instructorGroup, data.isPrivate)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px; border-bottom:1px solid #E8E2D8;">
                    <div style="font-family: Arial, sans-serif; font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Date &amp; Time</div>
                    <div style="font-family: Arial, sans-serif; font-size:14px; color:#2D4639;">
                      ${dateLong}<br/>${startStr} – ${endStr}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px; border-bottom:1px solid #E8E2D8;">
                    <div style="font-family: Arial, sans-serif; font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Location</div>
                    <div style="font-family: Arial, sans-serif; font-size:14px; color:#2D4639; margin-bottom:6px;">
                      ${SHOP_ADDRESS}
                    </div>
                    <a href="${SHOP_MAPS_URL}" style="font-family: Arial, sans-serif; font-size:13px; color:#5B7FA6; text-decoration:none;">
                      📍 Open in Google Maps →
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 18px; background-color:#FAF7F0;">
                    <div style="display:flex; justify-content:space-between;">
                      <table width="100%"><tr>
                        <td style="font-family: Arial, sans-serif; font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px;">Total</td>
                        <td align="right" style="font-family: Georgia, serif; font-size:22px; font-weight:bold; color:#A89068;">฿${data.totalPriceThb.toLocaleString()}</td>
                      </tr></table>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Payment status -->
          <tr>
            <td style="padding: 8px 24px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#E7EFEA; border-radius:12px;">
                <tr><td style="padding:16px 18px;">
                  ${data.paymentMethod === 'later' ? `
                  <div style="font-family: Georgia, serif; font-size:15px; font-weight:bold; color:#2D4639; margin-bottom:6px;">
                    💳 Pay When You Arrive
                  </div>
                  <div style="font-family: Arial, sans-serif; font-size:13px; color:#5C4A3D; line-height:1.6;">
                    No prepayment needed. We accept: <strong>Cash (THB)</strong>, <strong>PromptPay QR</strong>, and <strong>WeChat Pay</strong> on site.
                  </div>
                  ` : `
                  <div style="font-family: Georgia, serif; font-size:15px; font-weight:bold; color:#2D4639; margin-bottom:6px;">
                    ✅ Payment Received
                  </div>
                  <div style="font-family: Arial, sans-serif; font-size:13px; color:#5C4A3D; line-height:1.6;">
                    You've already paid in full. Nothing more to pay when you arrive — just show up and enjoy!
                  </div>
                  `}
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- Takeaway -->
          <tr>
            <td style="padding: 0 24px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1.5px solid #E8E2D8; border-radius:12px;">
                <tr><td style="padding:16px 18px;">
                  <div style="font-family: Georgia, serif; font-size:15px; font-weight:bold; color:#2D4639; margin-bottom:6px;">
                    🎁 You'll Take Home
                  </div>
                  <div style="font-family: Arial, sans-serif; font-size:13px; color:#5C4A3D; line-height:1.6;">
                    ${data.takeawayDescription}
                  </div>
                </td></tr>
              </table>
            </td>
          </tr>

          <!-- Policies -->
          <tr>
            <td style="padding: 0 24px 20px;">
              <div style="font-family: Arial, sans-serif; font-size:11px; color:#8A7668; line-height:1.7; border-top:1px solid #E8E2D8; padding-top:14px;">
                <strong>Good to know:</strong><br/>
                • Families are very welcome! Children aged 12+ are welcome when accompanied by a parent or adult, and children under 12 are welcome as part of a family session. Please note that parents or adults remain responsible for their children throughout the activity.<br/>
                • Please arrive 10 minutes before your session start time.<br/>
                ${data.rescheduleUrl
                  ? `• Need to <strong>reschedule</strong>? <a href="${data.rescheduleUrl}" style="color:#2D4639; font-weight:bold; text-decoration:underline;">Change date or time</a> (same workshop and guests, up to 2 hours before your workshop).`
                  : `• Need to reschedule? Just reply to this email or message us on WhatsApp.`}<br/>
                ${data.cancelUrl
                  ? `• Want to <strong>cancel</strong>? <a href="${data.cancelUrl}" style="color:#2D4639; font-weight:bold; text-decoration:underline;">Cancel my booking</a> (free cancellation up to 48 hours before your workshop).`
                  : `• Want to <strong>cancel</strong>? Just reply to this email (free cancellation up to 48 hours before your workshop).`}
              </div>
            </td>
          </tr>

          <!-- WhatsApp CTA -->
          <tr>
            <td style="padding: 0 24px 28px; text-align:center;">
              <a href="${whatsappLink}" style="display:inline-block; background-color:#25D366; color:#ffffff; font-family: Arial, sans-serif; font-size:14px; font-weight:bold; text-decoration:none; padding:12px 28px; border-radius:24px;">
                💬 Chat with us on WhatsApp
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#2D4639; padding:20px 24px; text-align:center;">
              <div style="font-family: Arial, sans-serif; font-size:12px; color:#B8CCC0; margin-bottom:8px;">
                ${SHOP_NAME} · ${SHOP_ADDRESS}
              </div>
              <div style="font-family: Arial, sans-serif; font-size:11px; color:#8FA89A;">
                <a href="${SHOP_WEBSITE}" style="color:#8FA89A; text-decoration:none;">Website</a> ·
                <a href="${SHOP_INSTAGRAM}" style="color:#8FA89A; text-decoration:none;"> Instagram</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

export function buildConfirmationEmailText(data: BookingEmailData): string {
  return `
Booking Confirmed — ${SHOP_NAME}

Booking Reference: ${data.bookingRef}

Dear ${data.customerName},

Thank you for booking with us! Here are your details:

Experience: ${data.packageName}
Date: ${formatDateLong(data.date)}
Time: ${formatTime12(data.startTime)} – ${formatTime12(data.endTime)}
Guests: ${data.numParticipants}
Total: ฿${data.totalPriceThb.toLocaleString()}${data.paymentMethod === 'later' ? ' (pay on arrival — Cash, PromptPay, or WeChat Pay)' : ' — already paid, nothing more to pay'}

Location: ${SHOP_ADDRESS}
Map: ${SHOP_MAPS_URL}

Please arrive 10 minutes early.
Families are very welcome! Children aged 12+ are welcome when accompanied by a parent or adult, and children under 12 are welcome as part of a family session. Please note that parents or adults remain responsible for their children throughout the activity.

Need to reschedule? ${data.rescheduleUrl ? `Change date or time here: ${data.rescheduleUrl}` : 'Just reply to this email.'}
(Same workshop and guests, up to 2 hours before your workshop.)

Want to cancel? ${data.cancelUrl ? `Cancel your booking here: ${data.cancelUrl}` : 'Just reply to this email.'}
(Free cancellation up to 48 hours before your workshop.)

Questions? Message us on WhatsApp: ${buildCustomerToShopWhatsAppLink(data.bookingRef)}

— ${SHOP_NAME}
`.trim();
}


// ────────────────────────────────────────────────────────────
// 3. CANCELLATION EMAIL
// ────────────────────────────────────────────────────────────

export function buildCancellationEmailHtml(bookingRef: string, customerName: string, refundNote?: string): string {
  return `
<!DOCTYPE html>
<html><body style="margin:0; padding:24px; background-color:#F5F2EC; font-family: Arial, sans-serif;">
  <table role="presentation" width="480" cellpadding="0" cellspacing="0" align="center" style="background:#ffffff; border-radius:16px; overflow:hidden; max-width:480px;">
    <tr><td style="background-color:#2D4639; padding:28px 24px; text-align:center;">
      <div style="font-family: Georgia, serif; font-size:20px; color:#ffffff;">🌿 ${SHOP_NAME}</div>
    </td></tr>
    <tr><td style="padding:28px 24px;">
      <p style="font-size:15px; color:#2D4639;">Dear ${customerName},</p>
      <p style="font-size:14px; color:#5C4A3D; line-height:1.6;">
        Your booking <strong>${bookingRef}</strong> has been cancelled as requested. Your spot has been released.
      </p>
      ${refundNote ? `<p style="font-size:14px; color:#5C4A3D; line-height:1.6; background:#FFF8E8; border-radius:10px; padding:12px 14px;">${refundNote}</p>` : ''}
      <p style="font-size:14px; color:#5C4A3D; line-height:1.6;">
        We hope to welcome you another time! Feel free to book again anytime at
        <a href="${SHOP_WEBSITE}" style="color:#6B8F71;">${SHOP_WEBSITE}</a>.
      </p>
    </td></tr>
  </table>
</body></html>
`.trim();
}

export function buildCancellationEmailText(bookingRef: string, customerName: string, refundNote?: string): string {
  return `
Booking Cancelled — ${SHOP_NAME}

Dear ${customerName},

Your booking ${bookingRef} has been cancelled as requested. Your spot has been released.
${refundNote ? `\n${refundNote}\n` : ''}
We hope to welcome you another time! Feel free to book again anytime at ${SHOP_WEBSITE}.

— ${SHOP_NAME}
`.trim();
}


// ────────────────────────────────────────────────────────────
// 3b. OWNER NEW-BOOKING NOTIFICATION  (→ Mali's inbox)
// ────────────────────────────────────────────────────────────
// Fired alongside the customer confirmation email — see
// sendBookingConfirmationEmails() below. Plainer than the customer
// email on purpose (this is an internal alert, not a branded
// experience); leads with what Mali actually needs to act on a new
// booking: who, when, how many, and a one-tap way to reach them.

export const OWNER_EMAIL = 'uherbhouse@gmail.com';

export interface OwnerNotificationData extends BookingEmailData {
  customerEmail?: string;
  customerPhone?: string;
  paymentMethod: string; // 'stripe' | 'paypal' | 'later' | ...
  ownerHeadline?: string; // small line under the workshop name, default "New booking · URI-…"
}

function ownerPaymentLabel(method: string): string {
  if (method === 'later') return 'Pay on arrival';
  if (method === 'stripe') return 'Paid online (card)';
  if (method === 'paypal') return 'Paid online (PayPal)';
  return 'Paid (recorded by staff)';
}

// payment_status 'unpaid' (manual/pay-later) always means "pay on arrival",
// whatever payment_method says (manual bookings store 'manual' there).
function effectivePaymentMethod(b: { payment_status?: string | null; payment_method?: string | null }): string {
  if (b.payment_status === 'unpaid') return 'later';
  return b.payment_method || 'later';
}

export function buildOwnerNotificationEmailHtml(data: OwnerNotificationData): string {
  const dateLong = formatDateLong(data.date);
  const startStr = formatTime12(data.startTime);
  const endStr = formatTime12(data.endTime);
  const whatsappLink = data.customerPhone
    ? buildShopToCustomerWhatsAppLink(data.customerPhone, data.customerName, data.bookingRef)
    : null;

  return `
<!DOCTYPE html>
<html><body style="margin:0; padding:24px; background-color:#F5F2EC; font-family: Arial, sans-serif;">
  <table role="presentation" width="480" cellpadding="0" cellspacing="0" align="center" style="background:#ffffff; border-radius:16px; overflow:hidden; max-width:480px;">
    <tr><td style="background-color:#2D4639; padding:24px; text-align:center;">
      <div style="font-family: Georgia, serif; font-size:20px; color:#ffffff;">${data.packageIcon} ${data.packageName}</div>
      <div style="font-family: Arial, sans-serif; font-size:12px; color:#C9D6CC; margin-top:6px; letter-spacing:0.5px;">${data.ownerHeadline || `New booking · ${data.bookingRef}`}</div>
    </td></tr>
    <tr><td style="padding:24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #E8E2D8; border-radius:12px; overflow:hidden; margin-bottom:16px;">
        <tr><td style="padding:12px 16px; border-bottom:1px solid #E8E2D8;">
          <div style="font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px;">Experience</div>
          <div style="font-size:15px; color:#2D4639; font-weight:bold;">${data.packageIcon} ${data.packageName}</div>
          <div style="font-size:12px; color:#8A7668; margin-top:2px;">${data.numParticipants} guest${data.numParticipants > 1 ? 's' : ''} • ${groupLabel(data.instructorGroup, data.isPrivate)}</div>
        </tr></td>
        <tr><td style="padding:12px 16px; border-bottom:1px solid #E8E2D8;">
          <div style="font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px;">When</div>
          <div style="font-size:14px; color:#2D4639;">${dateLong}, ${startStr} – ${endStr}</div>
        </tr></td>
        <tr><td style="padding:12px 16px; border-bottom:1px solid #E8E2D8;">
          <div style="font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px;">Customer</div>
          <div style="font-size:14px; color:#2D4639;">${data.customerName}</div>
          ${data.customerPhone ? `<div style="font-size:13px; color:#5C4A3D;">${data.customerPhone}</div>` : ''}
          ${data.customerEmail ? `<div style="font-size:13px; color:#5C4A3D;">${data.customerEmail}</div>` : ''}
        </tr></td>
        <tr><td style="padding:12px 16px; background-color:#FAF7F0;">
          <div style="font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px;">Payment</div>
          <div style="font-size:14px; color:#2D4639;">฿${data.totalPriceThb.toLocaleString()} — ${ownerPaymentLabel(data.paymentMethod)}</div>
        </tr></td>
      </table>
      ${whatsappLink ? `<p style="text-align:center; margin:0 0 12px;"><a href="${whatsappLink}" style="display:inline-block; background:#6B8F71; color:#ffffff; text-decoration:none; padding:10px 20px; border-radius:20px; font-size:13px; font-weight:bold;">Message ${data.customerName.split(' ')[0]} on WhatsApp</a></p>` : ''}
      <p style="font-size:12px; color:#8A7668; text-align:center; margin:0;">Uri Herbs Booking Admin</p>
    </td></tr>
  </table>
</body></html>
`.trim();
}

export function buildOwnerNotificationEmailText(data: OwnerNotificationData): string {
  return `
${data.packageIcon} ${data.packageName}
${data.ownerHeadline || `New booking · ${data.bookingRef}`}

${data.numParticipants} guest${data.numParticipants > 1 ? 's' : ''} • ${groupLabel(data.instructorGroup, data.isPrivate)}
${formatDateLong(data.date)}, ${formatTime12(data.startTime)} – ${formatTime12(data.endTime)}

Customer: ${data.customerName}
${data.customerPhone ? `Phone: ${data.customerPhone}\n` : ''}${data.customerEmail ? `Email: ${data.customerEmail}\n` : ''}
Total: ฿${data.totalPriceThb.toLocaleString()} — ${ownerPaymentLabel(data.paymentMethod)}
`.trim();
}


// ────────────────────────────────────────────────────────────
// 4. RESEND API CALL  (server-side only — Edge Function / API route)
// ────────────────────────────────────────────────────────────

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string; // e.g. the contact form sender, so Mali can just hit Reply
}

export async function sendEmailViaResend(
  params: SendEmailParams,
  apiKey: string
): Promise<{ id: string }> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Uri Herbs Workshop <bookings@uriherbs.com>',
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errText}`);
  }

  return response.json();
}


// ────────────────────────────────────────────────────────────
// 4b. BOOKING CONFIRMATION — ORCHESTRATION
// ────────────────────────────────────────────────────────────
// Called from every path that can move a booking to 'confirmed': the
// Stripe webhook, both PayPal confirmation paths (capture-order AND
// the webhook backstop — see that route's own comment for why there
// are two), and the Pay Later confirm route. More than one of these
// can legitimately fire for the same booking (PayPal's two paths
// race on purpose), so this claims the send atomically via the
// existing bookings.confirmation_email_sent flag — an
// UPDATE ... WHERE confirmation_email_sent = false ... RETURNING id
// that only one caller can ever win. Never throws — a booking that's
// genuinely paid/confirmed must not fail because an email couldn't
// be sent; failures are logged loudly instead (visible in Vercel's
// function logs) so a silently-broken RESEND_API_KEY or an
// unverified sending domain doesn't go unnoticed.

// Presentation metadata (icon, takeaway copy) that doesn't live in
// the database — same source data as PACKAGE_META in
// src/app/book/page.tsx, duplicated here in minimal form since that
// file is a 'use client' component and can't be imported into
// server-only code. If a package's copy changes there, mirror it
// here too.
const PACKAGE_EMAIL_META: Record<string, { icon: string; takeaway: string }> = {
  'single-tea':            { icon: '🍵',   takeaway: '2 custom dried tea cloth bags + fresh tasting' },
  'single-inhaler':        { icon: '🌿',   takeaway: '1 personalized Ya Dom jar' },
  'single-massage-ball':   { icon: '🌾',   takeaway: '1 herbal compress ball in protective bag' },
  'combo-tea-inhaler':     { icon: '🍵🌿', takeaway: 'Tea bags + Ya Dom jar' },
  'combo-inhaler-ball':    { icon: '🌿🌾', takeaway: 'Ya Dom jar + herbal compress ball' },
  'combo-tea-ball':        { icon: '🍵🌾', takeaway: 'Tea bags + herbal compress ball' },
  'journey-full':          { icon: '✦',    takeaway: 'All 3 takeaway sets: teas, Ya Dom & compress ball' },
  'skincare-aromatherapy': { icon: '❋',    takeaway: 'Handmade skincare products to take home' },
};

// `db` is a Supabase client with service-role access (getServiceClient()
// from '@/lib/supabase') — typed loosely to avoid importing Supabase's
// types into this otherwise DB-free file.
export async function sendBookingConfirmationEmails(db: any, bookingId: string): Promise<void> {
  // Two INDEPENDENT atomic claims — one per email — so each email is
  // sent at most once no matter how many confirmation paths call this:
  //   - confirmation_email_sent → the customer confirmation. This flag
  //     is ALSO claimed by the Supabase Edge Function `send-notifications`
  //     (fired from the notifications-queue triggers on `bookings`), which
  //     usually wins the race and sends the customer email itself. When
  //     it does, this function correctly skips the customer email.
  //   - owner_email_sent → the "New booking" email to the shop. Only this
  //     function sends it. Before 2026-09-25 the owner email hid behind
  //     the customer claim, so whenever the Edge Function won, the shop
  //     was never notified.
  // Claims are taken only AFTER the API key and booking are confirmed
  // available, so a misconfiguration never marks an unsent email as sent.

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`sendBookingConfirmationEmails: RESEND_API_KEY not configured — booking ${bookingId} confirmed but no emails sent`);
    return;
  }

  const { data: booking, error: fetchError } = await db
    .from('bookings')
    .select(
      'booking_ref, customer_name, customer_email, customer_phone, slot_date, start_time, end_time, num_participants, instructor_group, is_private, total_price_thb, payment_method, payment_status, cancel_token, packages ( name, slug )'
    )
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    console.error(`sendBookingConfirmationEmails: could not fetch booking ${bookingId}:`, fetchError?.message);
    return;
  }

  const pkg = Array.isArray(booking.packages) ? booking.packages[0] : booking.packages;
  const meta = PACKAGE_EMAIL_META[pkg?.slug] || { icon: '🌿', takeaway: 'Your take-home items will be ready for you.' };
  const emailData: OwnerNotificationData = {
    bookingRef: booking.booking_ref,
    customerName: booking.customer_name,
    packageName: pkg?.name || 'Uri Herbs Workshop',
    packageIcon: meta.icon,
    date: booking.slot_date,
    startTime: String(booking.start_time).slice(0, 5),
    endTime: String(booking.end_time).slice(0, 5),
    numParticipants: booking.num_participants,
    instructorGroup: booking.instructor_group,
    isPrivate: booking.is_private,
    totalPriceThb: booking.total_price_thb,
    takeawayDescription: meta.takeaway,
    customerEmail: booking.customer_email || undefined,
    customerPhone: booking.customer_phone || undefined,
    paymentMethod: effectivePaymentMethod(booking),
    cancelUrl: booking.cancel_token ? `${SITE_URL}/cancel/${booking.cancel_token}` : undefined,
    rescheduleUrl: booking.cancel_token ? `${SITE_URL}/reschedule/${booking.cancel_token}` : undefined,
  };

  // Atomic claim helper: flips `flag` false → true for this booking and
  // reports whether THIS caller won. Only the winner sends.
  const claim = async (flag: string, flagAt: string): Promise<boolean> => {
    const { data, error } = await db
      .from('bookings')
      .update({ [flag]: true, [flagAt]: new Date().toISOString() })
      .eq('id', bookingId)
      .eq(flag, false)
      .select('id')
      .maybeSingle();
    if (error) {
      console.error(`sendBookingConfirmationEmails: ${flag} claim failed for ${booking.booking_ref}:`, error.message);
      return false;
    }
    return !!data;
  };

  // Customer confirmation — only if they gave an email (optional at
  // booking time) AND nobody (e.g. the Edge Function) sent it already.
  if (booking.customer_email && (await claim('confirmation_email_sent', 'confirmation_email_sent_at'))) {
    try {
      await sendEmailViaResend(
        {
          to: booking.customer_email,
          replyTo: OWNER_EMAIL, // "Just reply to this email" must reach the shop inbox
          subject: `Booking Confirmed — ${booking.booking_ref} · ${SHOP_NAME}`,
          html: buildConfirmationEmailHtml(emailData),
          text: buildConfirmationEmailText(emailData),
        },
        apiKey
      );
    } catch (err: any) {
      console.error(`sendBookingConfirmationEmails: customer email failed for ${booking.booking_ref}:`, err.message);
    }
  }

  // Owner notification — its own claim, independent of the customer email.
  if (await claim('owner_email_sent', 'owner_email_sent_at')) {
    try {
      await sendEmailViaResend(
        {
          to: OWNER_EMAIL,
          subject: `New booking — ${booking.booking_ref} (${booking.num_participants} guest${booking.num_participants > 1 ? 's' : ''})`,
          html: buildOwnerNotificationEmailHtml(emailData),
          text: buildOwnerNotificationEmailText(emailData),
        },
        apiKey
      );
    } catch (err: any) {
      console.error(`sendBookingConfirmationEmails: owner email failed for ${booking.booking_ref}:`, err.message);
    }
  }
}


// ────────────────────────────────────────────────────────────
// 4b-2. CUSTOMER RESCHEDULE — both emails
// ────────────────────────────────────────────────────────────
// Called by /api/bookings/reschedule right after
// customer_reschedule_booking() succeeds. Each successful reschedule
// is its own event (customers may reschedule more than once), so no
// claim flag: one call = one pair of emails. Customer gets the same
// confirmation layout with the NEW date/time and a "Booking
// Rescheduled" banner; the shop gets the owner layout with "was …".
export async function sendRescheduleEmails(
  db: any,
  bookingId: string,
  previous: { date: string; startTime: string }
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`sendRescheduleEmails: RESEND_API_KEY not configured — booking ${bookingId}`);
    return;
  }

  const { data: booking, error } = await db
    .from('bookings')
    .select(
      'booking_ref, customer_name, customer_email, customer_phone, slot_date, start_time, end_time, num_participants, instructor_group, is_private, total_price_thb, payment_method, payment_status, cancel_token, packages ( name, slug )'
    )
    .eq('id', bookingId)
    .single();
  if (error || !booking) {
    console.error(`sendRescheduleEmails: could not fetch booking ${bookingId}:`, error?.message);
    return;
  }

  const pkg = Array.isArray(booking.packages) ? booking.packages[0] : booking.packages;
  const meta = PACKAGE_EMAIL_META[pkg?.slug] || { icon: '🌿', takeaway: 'Your take-home items will be ready for you.' };
  const wasText = `${formatDateLong(previous.date)}, ${formatTime12(String(previous.startTime).slice(0, 5))}`;
  const emailData: OwnerNotificationData = {
    bookingRef: booking.booking_ref,
    customerName: booking.customer_name,
    packageName: pkg?.name || 'Uri Herbs Workshop',
    packageIcon: meta.icon,
    date: booking.slot_date,
    startTime: String(booking.start_time).slice(0, 5),
    endTime: String(booking.end_time).slice(0, 5),
    numParticipants: booking.num_participants,
    instructorGroup: booking.instructor_group,
    isPrivate: booking.is_private,
    totalPriceThb: booking.total_price_thb,
    takeawayDescription: meta.takeaway,
    customerEmail: booking.customer_email || undefined,
    customerPhone: booking.customer_phone || undefined,
    paymentMethod: effectivePaymentMethod(booking),
    cancelUrl: booking.cancel_token ? `${SITE_URL}/cancel/${booking.cancel_token}` : undefined,
    rescheduleUrl: booking.cancel_token ? `${SITE_URL}/reschedule/${booking.cancel_token}` : undefined,
    headline: 'Booking Rescheduled!',
    ownerHeadline: `Rescheduled by customer · ${booking.booking_ref} · was ${wasText}`,
  };

  const sends: Promise<unknown>[] = [];
  if (booking.customer_email) {
    sends.push(
      sendEmailViaResend(
        {
          to: booking.customer_email,
          replyTo: OWNER_EMAIL,
          subject: `Booking Rescheduled — ${booking.booking_ref} · ${SHOP_NAME}`,
          html: buildConfirmationEmailHtml(emailData),
          text: buildConfirmationEmailText(emailData).replace(/^Booking Confirmed/, 'Booking Rescheduled'),
        },
        apiKey
      ).catch((err: any) => console.error(`sendRescheduleEmails: customer email failed for ${booking.booking_ref}:`, err.message))
    );
  }
  sends.push(
    sendEmailViaResend(
      {
        to: OWNER_EMAIL,
        subject: `Booking rescheduled — ${emailData.packageName} · ${booking.booking_ref}`,
        html: buildOwnerNotificationEmailHtml(emailData),
        text: buildOwnerNotificationEmailText(emailData),
      },
      apiKey
    ).catch((err: any) => console.error(`sendRescheduleEmails: owner email failed for ${booking.booking_ref}:`, err.message))
  );
  await Promise.all(sends);
}


// ────────────────────────────────────────────────────────────
// 4b-3. 1-HOUR REMINDER — both emails
// ────────────────────────────────────────────────────────────
// Sent by /api/cron/reminders (called every 5 minutes by a Supabase
// pg_cron job) for confirmed bookings starting within the next hour.
// Claims bookings.reminder_sent atomically so each booking gets one
// reminder (a reschedule resets the flag). Owner decision 2026-09-26:
// NO reschedule/cancel links here — online changes close before this.
export async function sendReminderEmails(db: any, bookingId: string): Promise<'sent' | 'skipped'> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`sendReminderEmails: RESEND_API_KEY not configured — booking ${bookingId}`);
    return 'skipped';
  }

  const { data: claimed, error: claimError } = await db
    .from('bookings')
    .update({ reminder_sent: true })
    .eq('id', bookingId)
    .eq('reminder_sent', false)
    .eq('status', 'confirmed')
    .select('id')
    .maybeSingle();
  if (claimError) {
    console.error(`sendReminderEmails: claim failed for ${bookingId}:`, claimError.message);
    return 'skipped';
  }
  if (!claimed) return 'skipped';

  const { data: b, error } = await db
    .from('bookings')
    .select('booking_ref, customer_name, customer_email, customer_phone, slot_date, start_time, end_time, num_participants, instructor_group, is_private, total_price_thb, payment_method, payment_status, customer_notes, packages ( name, slug )')
    .eq('id', bookingId)
    .single();
  if (error || !b) {
    console.error(`sendReminderEmails: could not fetch booking ${bookingId}:`, error?.message);
    return 'skipped';
  }

  const pkg = Array.isArray(b.packages) ? b.packages[0] : b.packages;
  const icon = (PACKAGE_EMAIL_META[pkg?.slug] || { icon: '🌿' }).icon;
  const pkgName = pkg?.name || 'Uri Herbs Workshop';
  const start = formatTime12(String(b.start_time).slice(0, 5));
  const end = formatTime12(String(b.end_time).slice(0, 5));
  const guests = `${b.num_participants} guest${b.num_participants > 1 ? 's' : ''}`;
  const method = effectivePaymentMethod(b);
  const payLine = method === 'later'
    ? `Pay on arrival: ฿${Number(b.total_price_thb).toLocaleString()} (Cash, PromptPay QR or WeChat Pay)`
    : 'Already paid, nothing more to pay';
  const whatsapp = buildCustomerToShopWhatsAppLink(b.booking_ref);
  const safeName = escapeHtml(String(b.customer_name || ''));

  const customerHtml = `
<!DOCTYPE html>
<html><body style="margin:0; padding:24px; background-color:#F5F2EC; font-family: Arial, sans-serif;">
  <table role="presentation" width="480" cellpadding="0" cellspacing="0" align="center" style="background:#ffffff; border-radius:16px; overflow:hidden; max-width:480px;">
    <tr><td style="background-color:#2D4639; padding:24px; text-align:center;">
      <div style="font-family: Georgia, serif; font-size:21px; color:#ffffff;">See you soon! 🌿</div>
      <div style="font-size:13px; color:#C9D6CC; margin-top:6px;">Your workshop starts in about 1 hour</div>
    </td></tr>
    <tr><td style="padding:24px;">
      <p style="font-size:15px; color:#2D4639; margin:0 0 14px;">Dear ${safeName},</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #E8E2D8; border-radius:12px; overflow:hidden;">
        <tr><td style="padding:12px 16px; border-bottom:1px solid #E8E2D8;">
          <div style="font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px;">Workshop</div>
          <div style="font-size:15px; color:#2D4639; font-weight:bold;">${icon} ${escapeHtml(pkgName)}</div>
          <div style="font-size:12px; color:#8A7668;">${guests} · ${b.booking_ref}</div>
        </td></tr>
        <tr><td style="padding:12px 16px; border-bottom:1px solid #E8E2D8;">
          <div style="font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px;">Today</div>
          <div style="font-size:15px; color:#2D4639; font-weight:bold;">${start} – ${end}</div>
          <div style="font-size:12px; color:#5C4A3D;">Please arrive about 10 minutes early.</div>
        </td></tr>
        <tr><td style="padding:12px 16px; border-bottom:1px solid #E8E2D8;">
          <div style="font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px;">Where</div>
          <div style="font-size:14px; color:#2D4639;">${SHOP_ADDRESS}</div>
          <a href="${SHOP_MAPS_URL}" style="font-size:13px; color:#6B8F71; font-weight:bold;">📍 Open in Google Maps</a>
        </td></tr>
        <tr><td style="padding:12px 16px; background-color:#FAF7F0;">
          <div style="font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px;">Payment</div>
          <div style="font-size:14px; color:#2D4639;">${payLine}</div>
        </td></tr>
      </table>
      <p style="font-size:13px; color:#5C4A3D; line-height:1.6; margin:16px 0;">Running late or can&#39;t find us? Message us on WhatsApp and we&#39;ll help.</p>
      <p style="text-align:center; margin:0;"><a href="${whatsapp}" style="display:inline-block; background:#25D366; color:#ffffff; text-decoration:none; padding:11px 24px; border-radius:22px; font-size:14px; font-weight:bold;">💬 Message us on WhatsApp</a></p>
    </td></tr>
  </table>
</body></html>`.trim();

  const customerText = `See you soon! Your workshop starts in about 1 hour.

Dear ${b.customer_name},

${icon} ${pkgName} · ${guests} · ${b.booking_ref}
Today: ${start} – ${end} (please arrive about 10 minutes early)
Where: ${SHOP_ADDRESS}
Map: ${SHOP_MAPS_URL}
Payment: ${payLine}

Running late or can't find us? WhatsApp: ${whatsapp}

— ${SHOP_NAME}`;

  const ownerHtml = `
<!DOCTYPE html>
<html><body style="margin:0; padding:24px; background-color:#F5F2EC; font-family: Arial, sans-serif;">
  <table role="presentation" width="480" cellpadding="0" cellspacing="0" align="center" style="background:#ffffff; border-radius:16px; overflow:hidden; max-width:480px;">
    <tr><td style="background-color:#A89068; padding:22px; text-align:center;">
      <div style="font-family: Georgia, serif; font-size:20px; color:#ffffff;">${icon} ${escapeHtml(pkgName)}</div>
      <div style="font-size:12px; color:#F7EFE2; margin-top:6px; letter-spacing:0.5px;">Starts in 1 hour · ${start} · ${b.booking_ref}</div>
    </td></tr>
    <tr><td style="padding:22px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #E8E2D8; border-radius:12px; overflow:hidden;">
        <tr><td style="padding:12px 16px; border-bottom:1px solid #E8E2D8;">
          <div style="font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px;">Guests</div>
          <div style="font-size:14px; color:#2D4639;">${guests} · ${groupLabel(b.instructor_group, b.is_private)} · ${start} – ${end}</div>
        </td></tr>
        <tr><td style="padding:12px 16px; border-bottom:1px solid #E8E2D8;">
          <div style="font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px;">Customer</div>
          <div style="font-size:14px; color:#2D4639;">${safeName}</div>
          ${b.customer_phone ? `<div style="font-size:13px; color:#5C4A3D;">${escapeHtml(b.customer_phone)}</div>` : ''}
          ${b.customer_notes ? `<div style="font-size:13px; color:#8A4B3C; margin-top:4px;"><strong>Notes:</strong> ${escapeHtml(b.customer_notes)}</div>` : ''}
        </td></tr>
        <tr><td style="padding:12px 16px; background-color:${method === 'later' ? '#FFF3D6' : '#FAF7F0'};">
          <div style="font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px;">Payment</div>
          <div style="font-size:14px; color:#2D4639;${method === 'later' ? ' font-weight:bold;' : ''}">${method === 'later' ? `Collect ฿${Number(b.total_price_thb).toLocaleString()} on arrival` : ownerPaymentLabel(method)}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim();

  const ownerText = `Starts in 1 hour — ${pkgName} · ${start} · ${b.booking_ref}
${guests} · ${groupLabel(b.instructor_group, b.is_private)} · ${start} – ${end}
Customer: ${b.customer_name}${b.customer_phone ? ` · ${b.customer_phone}` : ''}${b.customer_notes ? `\nNotes: ${b.customer_notes}` : ''}
Payment: ${method === 'later' ? `Collect ฿${Number(b.total_price_thb).toLocaleString()} on arrival` : ownerPaymentLabel(method)}`;

  const sends: Promise<unknown>[] = [];
  if (b.customer_email) {
    sends.push(
      sendEmailViaResend(
        { to: b.customer_email, replyTo: OWNER_EMAIL, subject: `See you in 1 hour — ${pkgName} at ${start} · ${SHOP_NAME}`, html: customerHtml, text: customerText },
        apiKey
      ).catch((err: any) => console.error(`sendReminderEmails: customer email failed for ${b.booking_ref}:`, err.message))
    );
  }
  sends.push(
    sendEmailViaResend(
      { to: OWNER_EMAIL, subject: `Starts in 1 hour — ${pkgName} · ${start} · ${guests} · ${b.booking_ref}`, html: ownerHtml, text: ownerText },
      apiKey
    ).catch((err: any) => console.error(`sendReminderEmails: owner email failed for ${b.booking_ref}:`, err.message))
  );
  await Promise.all(sends);
  return 'sent';
}


// ────────────────────────────────────────────────────────────
// 4c. BOOKING CANCELLATION — ORCHESTRATION
// ────────────────────────────────────────────────────────────
// Called after admin_cancel_booking (see src/lib/booking-service.ts →
// cancelBookingAsAdmin) confirms a booking is 'cancelled'. Same
// atomic-claim shape as sendBookingConfirmationEmails above, just
// keyed off bookings.cancellation_email_sent instead of
// confirmation_email_sent — an
// UPDATE ... WHERE cancellation_email_sent = false ... RETURNING id
// that only one caller can ever win, so a redundant/retried call is
// safe. Never throws — a booking that's genuinely cancelled must not
// fail because an email couldn't be sent; failures are logged loudly
// instead. Customer-only (no owner copy): cancellation is always
// admin-initiated here, so Mali already knows it happened — she's the
// one who clicked Cancel.
export async function sendCancellationEmail(
  db: any,
  bookingId: string,
  opts: { byCustomer?: boolean } = {}
): Promise<void> {
  // Key check BEFORE the claim, so a misconfiguration never marks an
  // unsent email as sent.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`sendCancellationEmail: RESEND_API_KEY not configured — booking ${bookingId} cancelled but no email sent`);
    return;
  }

  const { data: claimed, error: claimError } = await db
    .from('bookings')
    .update({ cancellation_email_sent: true })
    .eq('id', bookingId)
    .eq('cancellation_email_sent', false)
    .select('id')
    .maybeSingle();

  if (claimError) {
    console.error(`sendCancellationEmail: claim failed for booking ${bookingId}:`, claimError.message);
    return;
  }
  if (!claimed) {
    // Already sent — expected, not an error.
    return;
  }

  const { data: booking, error: fetchError } = await db
    .from('bookings')
    .select('booking_ref, customer_name, customer_email, payment_method, slot_date, start_time, cancelled_at')
    .eq('id', bookingId)
    .single();

  if (fetchError || !booking) {
    console.error(`sendCancellationEmail: could not fetch booking ${bookingId}:`, fetchError?.message);
    return;
  }

  // Best-effort, only if they gave an email (it's optional at booking time).
  if (!booking.customer_email) return;

  // Refund wording only for customer self-cancellations of online
  // payments (Terms §4). Shop-initiated cancellations are handled
  // personally by the shop.
  let refundNote: string | undefined;
  if (opts.byCustomer && isPaidOnlineMethod(booking.payment_method)) {
    const cancelledAt = booking.cancelled_at ? new Date(booking.cancelled_at) : new Date();
    const hours = hoursBeforeStart(booking.slot_date, booking.start_time, cancelledAt);
    refundNote = hours >= 48
      ? 'You paid online, so your refund will go back to your original payment method. Please allow 5–10 business days for it to appear, depending on your bank.'
      : 'As this cancellation was made less than 48 hours before your workshop, it is non-refundable under our cancellation policy.';
  }

  try {
    await sendEmailViaResend(
      {
        to: booking.customer_email,
        replyTo: OWNER_EMAIL,
        subject: `Booking Cancelled — ${booking.booking_ref} · ${SHOP_NAME}`,
        html: buildCancellationEmailHtml(booking.booking_ref, booking.customer_name, refundNote),
        text: buildCancellationEmailText(booking.booking_ref, booking.customer_name, refundNote),
      },
      apiKey
    );
  } catch (err: any) {
    console.error(`sendCancellationEmail: email failed for ${booking.booking_ref}:`, err.message);
  }
}

function isPaidOnlineMethod(m: string | null | undefined): boolean {
  return m === 'stripe' || m === 'paypal';
}

function hoursBeforeStart(slotDate: string, startTime: string, at: Date): number {
  const start = new Date(`${slotDate}T${String(startTime).slice(0, 5)}:00+07:00`);
  return (start.getTime() - at.getTime()) / 36e5;
}

// Shop alert for a CUSTOMER self-cancellation (from /cancel/<token>).
// Only called by /api/bookings/cancel right after customer_cancel_booking()
// succeeds — that function only succeeds once per booking, so no claim
// flag is needed. Admin cancellations don't send this (Mali clicked it).
export async function sendOwnerCancellationEmail(db: any, bookingId: string, reason: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`sendOwnerCancellationEmail: RESEND_API_KEY not configured — booking ${bookingId}`);
    return;
  }

  const { data: b, error } = await db
    .from('bookings')
    .select('booking_ref, customer_name, customer_email, customer_phone, slot_date, start_time, end_time, num_participants, total_price_thb, payment_method, cancelled_at, packages ( name, slug )')
    .eq('id', bookingId)
    .single();
  if (error || !b) {
    console.error(`sendOwnerCancellationEmail: could not fetch booking ${bookingId}:`, error?.message);
    return;
  }

  const pkg = Array.isArray(b.packages) ? b.packages[0] : b.packages;
  const icon = (PACKAGE_EMAIL_META[pkg?.slug] || { icon: '🌿' }).icon;
  const pkgName = pkg?.name || 'Uri Herbs Workshop';
  const paidOnline = isPaidOnlineMethod(b.payment_method);
  const hours = hoursBeforeStart(b.slot_date, b.start_time, b.cancelled_at ? new Date(b.cancelled_at) : new Date());
  const refundLine = !paidOnline
    ? 'Pay on arrival: nothing to refund.'
    : hours >= 48
      ? `REFUND DUE: ฿${Number(b.total_price_thb).toLocaleString()} via ${b.payment_method === 'paypal' ? 'PayPal' : 'Stripe'} (cancelled ${Math.floor(hours)}h before, 48h+ = full refund). Please refund in the ${b.payment_method === 'paypal' ? 'PayPal' : 'Stripe'} dashboard.`
      : `No refund: cancelled ${Math.max(0, Math.floor(hours))}h before the workshop (inside 48h).`;
  const when = `${formatDateLong(b.slot_date)}, ${formatTime12(String(b.start_time).slice(0, 5))} – ${formatTime12(String(b.end_time).slice(0, 5))}`;
  const safeReason = reason ? escapeHtml(reason) : '';
  const safeName = escapeHtml(String(b.customer_name || ''));

  const html = `
<!DOCTYPE html>
<html><body style="margin:0; padding:24px; background-color:#F5F2EC; font-family: Arial, sans-serif;">
  <table role="presentation" width="480" cellpadding="0" cellspacing="0" align="center" style="background:#ffffff; border-radius:16px; overflow:hidden; max-width:480px;">
    <tr><td style="background-color:#8A4B3C; padding:24px; text-align:center;">
      <div style="font-family: Georgia, serif; font-size:20px; color:#ffffff;">${icon} ${escapeHtml(pkgName)}</div>
      <div style="font-size:12px; color:#F1D9D2; margin-top:6px; letter-spacing:0.5px;">Booking cancelled by customer · ${b.booking_ref}</div>
    </td></tr>
    <tr><td style="padding:24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #E8E2D8; border-radius:12px; overflow:hidden;">
        <tr><td style="padding:12px 16px; border-bottom:1px solid #E8E2D8;">
          <div style="font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px;">When</div>
          <div style="font-size:14px; color:#2D4639;">${when} · ${b.num_participants} guest${b.num_participants > 1 ? 's' : ''}</div>
        </td></tr>
        <tr><td style="padding:12px 16px; border-bottom:1px solid #E8E2D8;">
          <div style="font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px;">Customer</div>
          <div style="font-size:14px; color:#2D4639;">${safeName}</div>
          ${b.customer_phone ? `<div style="font-size:13px; color:#5C4A3D;">${escapeHtml(b.customer_phone)}</div>` : ''}
          ${b.customer_email ? `<div style="font-size:13px; color:#5C4A3D;">${escapeHtml(b.customer_email)}</div>` : ''}
        </td></tr>
        <tr><td style="padding:12px 16px; border-bottom:1px solid #E8E2D8;">
          <div style="font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px;">Reason</div>
          <div style="font-size:14px; color:#2D4639;">${safeReason || '<span style="color:#8A7668;">(no reason given)</span>'}</div>
        </td></tr>
        <tr><td style="padding:12px 16px; background-color:${paidOnline && hours >= 48 ? '#FFF3D6' : '#FAF7F0'};">
          <div style="font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px;">Payment</div>
          <div style="font-size:14px; color:#2D4639;${paidOnline && hours >= 48 ? ' font-weight:bold;' : ''}">${escapeHtml(refundLine)}</div>
        </td></tr>
      </table>
      <p style="font-size:12px; color:#8A7668; text-align:center; margin:16px 0 0;">The spot has been released automatically. Uri Herbs Booking Admin</p>
    </td></tr>
  </table>
</body></html>`.trim();

  const text = `Booking cancelled by customer — ${b.booking_ref}

${icon} ${pkgName}
${when} · ${b.num_participants} guest${b.num_participants > 1 ? 's' : ''}
Customer: ${b.customer_name}${b.customer_phone ? ` · ${b.customer_phone}` : ''}${b.customer_email ? ` · ${b.customer_email}` : ''}
Reason: ${reason || '(no reason given)'}
Payment: ${refundLine}

The spot has been released automatically.`;

  try {
    await sendEmailViaResend(
      {
        to: OWNER_EMAIL,
        subject: `Booking cancelled — ${pkgName} · ${b.booking_ref}${paidOnline && hours >= 48 ? ' · REFUND DUE' : ''}`,
        html,
        text,
      },
      apiKey
    );
  } catch (err: any) {
    console.error(`sendOwnerCancellationEmail: email failed for ${b.booking_ref}:`, err.message);
  }
}


// ────────────────────────────────────────────────────────────
// 5. CONTACT FORM EMAIL  (site's /contact page → Mali's inbox)
// ───────────────────────────────────────────────────────────

export interface ContactMessageData {
  name: string;
  email: string;
  message: string;
}

// Minimal HTML-escaping — this data comes straight from an
// anonymous public form, so it must not be interpolated raw into
// the email's HTML body.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildContactEmailHtml(data: ContactMessageData): string {
  const safeName = escapeHtml(data.name);
  const safeEmail = escapeHtml(data.email);
  const safeMessage = escapeHtml(data.message).replace(/\n/g, '<br/>');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background-color:#F5F2EC; font-family: Georgia, 'Times New Roman', serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F2EC; padding: 24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; max-width:480px; width:100%;">

          <tr>
            <td style="background-color:#2D4639; padding: 28px 24px; text-align:center;">
              <div style="font-size:26px; margin-bottom:6px;">🌿</div>
              <div style="font-family: Georgia, serif; font-size:20px; font-weight:bold; color:#ffffff;">
                ${SHOP_NAME}
              </div>
              <div style="font-family: Arial, sans-serif; font-size:12px; color:#B8CCC0; margin-top:4px;">
                New message from the Contact page
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1.5px solid #E8E2D8; border-radius:12px; overflow:hidden; margin-bottom: 18px;">
                <tr>
                  <td style="padding:14px 18px; border-bottom:1px solid #E8E2D8;">
                    <div style="font-family: Arial, sans-serif; font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">From</div>
                    <div style="font-family: Arial, sans-serif; font-size:14px; color:#2D4639;">${safeName}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 18px;">
                    <div style="font-family: Arial, sans-serif; font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px;">Email</div>
                    <a href="mailto:${safeEmail}" style="font-family: Arial, sans-serif; font-size:14px; color:#5B7FA6; text-decoration:none;">${safeEmail}</a>
                  </td>
                </tr>
              </table>

              <div style="font-family: Arial, sans-serif; font-size:10px; color:#8A7668; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">Message</div>
              <p style="font-family: Arial, sans-serif; font-size:14px; color:#5C4A3D; line-height:1.7; margin:0; white-space:pre-wrap;">${safeMessage}</p>
            </td>
          </tr>

          <tr>
            <td style="background-color:#FAF7F0; padding:16px 24px; text-align:center;">
              <div style="font-family: Arial, sans-serif; font-size:11px; color:#8A7668;">
                Reply directly to this email to respond to ${safeName}.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

export function buildContactEmailText(data: ContactMessageData): string {
  return `
New message from the Contact page — ${SHOP_NAME}

From: ${data.name}
Email: ${data.email}

Message:
${data.message}
`.trim();
}
