// ============================================================
// GET /api/payments/paypal/client-id
// ============================================================
// The PayPal JS SDK needs a client ID synchronously to mount its
// buttons. PAYPAL_CLIENT_ID isn't NEXT_PUBLIC_-prefixed in Vercel, so
// rather than asking for a duplicate env var, the browser fetches it
// from here once. A client ID is meant to be public — PayPal's own
// embed snippet puts it directly in a <script src> — so serving it
// over a plain unauthenticated GET is the normal, safe way to do this
// (unlike PAYPAL_SECRET, which never leaves the server).
// ============================================================

import { NextResponse } from 'next/server';

// Without this, Next.js statically optimizes this route at BUILD
// time (nothing here reads request/cookies/searchParams), baking in
// whatever PAYPAL_CLIENT_ID happened to be set during the build.
// Force it dynamic so it always reflects the current env var.
export const dynamic = 'force-dynamic';

export async function GET() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) {
    console.error('PAYPAL_CLIENT_ID is not configured');
    return NextResponse.json({ error: 'PayPal is not available right now.' }, { status: 500 });
  }
  return NextResponse.json({ client_id: clientId });
}
