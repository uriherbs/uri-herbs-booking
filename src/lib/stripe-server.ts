// ============================================================
// Stripe Server Client  (server-only — never import from a
// 'use client' component)
// ============================================================
// Wraps STRIPE_SECRET_KEY in one place. Every API route that talks to
// Stripe imports getStripe() from here instead of constructing its
// own client, so there's exactly one spot that touches the secret key.

import Stripe from 'stripe';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }
  cached = new Stripe(secretKey, {
    // Pinned to the installed SDK's own default (node_modules/stripe's
    // apiVersion.js) so a future Stripe account-level API version
    // change doesn't silently alter this app's behavior. Bump this
    // only alongside a deliberate `npm install stripe@latest`.
    apiVersion: '2026-07-29.dahlia',
  });
  return cached;
}

// THB is a standard 2-decimal currency for Stripe (it is NOT on
// Stripe's zero-decimal currency list — that list is things like
// JPY/KRW/VND). Stripe amounts are always in the smallest unit, so
// ฿1,840 must be sent as 184000 (satang). Getting this wrong charges
// either 100x too much or 100x too little — this is the one line in
// this whole feature most worth double-checking against a real test
// payment's amount in the Stripe dashboard.
export function thbToSatang(amountThb: number): number {
  return Math.round(amountThb * 100);
}
