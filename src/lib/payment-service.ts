// ============================================================
// URI HERBS WORKSHOP — Payment Service (client-side)
// ============================================================
// Thin wrappers around our own Next.js API routes (NOT direct calls
// to Stripe/PayPal — those only ever happen server-side, using the
// secret keys, in src/app/api/payments/**). This file never sees
// STRIPE_SECRET_KEY or PAYPAL_SECRET; it only talks to our own
// server, which talks to the payment providers.
//
// The amount charged is ALWAYS read server-side from the booking row
// (bookings.total_price_thb, computed atomically by create_booking())
// — nothing here sends an amount to the server. See each route's
// comments for how it resolves the amount.
// ============================================================

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // `detail` (when the server route includes it) is the raw
    // provider error body — logged to the console for debugging, not
    // shown in the UI, so a support/QA session can open devtools and
    // see PayPal/Stripe's actual error instead of just the generic
    // user-facing message below.
    if (data.detail) {
      console.error(`${url} failed (${res.status}):`, data.detail);
    }
    throw new Error(data.error || `Request to ${url} failed (${res.status})`);
  }
  return data as T;
}

// ── Stripe ──

export interface StripeIntentResult {
  clientSecret: string;
  publishableKey: string;
}

// Creates (or re-creates) a Stripe PaymentIntent for a pending_payment
// booking and returns what the client needs to mount the embedded
// Payment Element. STRIPE_SECRET_KEY never leaves the server.
export async function createStripePaymentIntent(bookingId: string): Promise<StripeIntentResult> {
  const data = await postJson<{ client_secret: string; publishable_key: string }>(
    '/api/payments/stripe/create-intent',
    { booking_id: bookingId }
  );
  return { clientSecret: data.client_secret, publishableKey: data.publishable_key };
}

// ── PayPal ──

// The PayPal JS SDK script needs a client ID synchronously to mount —
// PAYPAL_CLIENT_ID isn't NEXT_PUBLIC_-prefixed (it wasn't set up that
// way in Vercel), so we fetch it once from our own server instead of
// requiring a duplicate NEXT_PUBLIC_ env var. A client ID is meant to
// be public (PayPal's own embed snippet puts it directly in a <script
// src>), so serving it over a plain GET is fine.
export async function getPayPalClientId(): Promise<string> {
  const res = await fetch('/api/payments/paypal/client-id');
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.client_id) {
    throw new Error(data.error || 'Could not load PayPal');
  }
  return data.client_id as string;
}

// Creates a PayPal Order for a pending_payment booking. Called from
// the PayPal Buttons' createOrder callback.
export async function createPayPalOrder(bookingId: string): Promise<string> {
  const data = await postJson<{ order_id: string }>(
    '/api/payments/paypal/create-order',
    { booking_id: bookingId }
  );
  return data.order_id;
}

// Captures an approved PayPal order server-side and, on success,
// confirms the booking. Called from the PayPal Buttons' onApprove
// callback. This — not the client-side "approved" event — is what
// actually moves money and confirms the booking; the webhook (task
// #12) is a backstop in case this call succeeds on PayPal's side but
// the response never reaches the browser.
export async function capturePayPalOrder(
  bookingId: string,
  orderId: string
): Promise<{ bookingRef: string; status: string }> {
  const data = await postJson<{ booking_ref: string; status: string }>(
    '/api/payments/paypal/capture-order',
    { booking_id: bookingId, order_id: orderId }
  );
  return { bookingRef: data.booking_ref, status: data.status };
}
