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
const SHOP_MAPS_URL = 'https://maps.google.com/?q=Uri+Herbs+Workshop+Chiang+Mai+Old+City';
const SHOP_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '66812345678'; // set NEXT_PUBLIC_WHATSAPP_NUMBER in Vercel — this fallback is a placeholder only
const SHOP_INSTAGRAM = 'https://instagram.com/uriherbsworkshop';
const SHOP_WEBSITE = 'https://www.uriherbs.com';

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
  instructorGroup: 'A' | 'B';
  totalPriceThb: number;
  takeawayDescription: string;
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
                Booking Confirmed!
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
                      ${data.numParticipants} guest${data.numParticipants > 1 ? 's' : ''} • Group ${data.instructorGroup}
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

          <!-- Pay on arrival -->
          <tr>
            <td style="padding: 8px 24px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#E7EFEA; border-radius:12px;">
                <tr><td style="padding:16px 18px;">
                  <div style="font-family: Georgia, serif; font-size:15px; font-weight:bold; color:#2D4639; margin-bottom:6px;">
                    💳 Pay When You Arrive
                  </div>
                  <div style="font-family: Arial, sans-serif; font-size:13px; color:#5C4A3D; line-height:1.6;">
                    No prepayment needed. We accept: <strong>Cash (THB)</strong>, <strong>PromptPay QR</strong>, and <strong>WeChat Pay</strong> on site.
                  </div>
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
                • Minimum age is 12+. Guests aged 12–17 must be accompanied by an adult.<br/>
                • Please arrive 10 minutes before your session start time.<br/>
                • Need to reschedule or cancel? Just reply to this email or message us on WhatsApp.
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
Total: ฿${data.totalPriceThb.toLocaleString()} (pay on arrival — Cash, PromptPay, or WeChat Pay)

Location: ${SHOP_ADDRESS}
Map: ${SHOP_MAPS_URL}

Please arrive 10 minutes early. Minimum age 12+ (12-17 must be with an adult).

Questions? Message us on WhatsApp: ${buildCustomerToShopWhatsAppLink(data.bookingRef)}

— ${SHOP_NAME}
`.trim();
}


// ────────────────────────────────────────────────────────────
// 3. CANCELLATION EMAIL
// ────────────────────────────────────────────────────────────

export function buildCancellationEmailHtml(bookingRef: string, customerName: string): string {
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
      <p style="font-size:14px; color:#5C4A3D; line-height:1.6;">
        We hope to welcome you another time! Feel free to book again anytime at
        <a href="${SHOP_WEBSITE}" style="color:#6B8F71;">${SHOP_WEBSITE}</a>.
      </p>
    </td></tr>
  </table>
</body></html>
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
