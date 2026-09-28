// ============================================================
// PayPal Server Client  (server-only — never import from a
// 'use client' component)
// ============================================================
// PayPal has no first-party Node SDK for the current v2 Orders API —
// their own docs show plain REST calls, which is what this does.
// Wraps PAYPAL_CLIENT_ID/PAYPAL_SECRET in one place so every API
// route imports getPayPalAccessToken() instead of re-implementing
// OAuth.

// Sandbox and live PayPal use different API hosts, and there's no way
// to tell from the key string itself which kind is configured — so the
// host is chosen by PAYPAL_ENV, set in Vercel next to the keys:
//   PAYPAL_ENV=live     → https://api-m.paypal.com (real money)
//   anything else/unset → https://api-m.sandbox.paypal.com
// Keep PAYPAL_ENV in step with PAYPAL_CLIENT_ID / PAYPAL_SECRET /
// PAYPAL_WEBHOOK_ID: live keys against the sandbox host (or the
// reverse) fail with an auth error.
export const PAYPAL_API_BASE =
  process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

export async function getPayPalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;
  if (!clientId || !secret) {
    throw new Error('PAYPAL_CLIENT_ID / PAYPAL_SECRET are not configured');
  }

  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`PayPal auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

// THB is a standard 2-decimal currency for PayPal (unlike zero-decimal
// currencies such as JPY/KRW/VND) — amount.value is a decimal STRING,
// e.g. "1840.00", not a smallest-unit integer like Stripe uses. Worth
// eyeballing against a real sandbox test order, same as Stripe's
// satang conversion.
export function thbToPayPalValue(amountThb: number): string {
  return amountThb.toFixed(2);
}
