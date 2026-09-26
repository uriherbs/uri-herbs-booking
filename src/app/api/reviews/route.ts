// ============================================================
// src/app/api/reviews/route.ts
// ============================================================
// GET /api/reviews — Google rating + up to 5 reviews for the /book
// page (a client component, so it can't call the server-only
// getGoogleReviews() directly). The Google API key stays on the
// server; this returns only the public review data.
//
// Google is actually called at most every 12h (unstable_cache in
// src/lib/google-reviews.ts). The Cache-Control header additionally
// lets Vercel's CDN answer repeat requests without invoking the
// function at all.
//
// Always 200: `{ data: null }` means "nothing to show" (no key yet,
// Google error, no reviews) and the client just hides the section.
// ============================================================

import { NextResponse } from 'next/server';
import { getGoogleReviews } from '@/lib/google-reviews';

// Run per request (cheap: served from the data cache) instead of
// being pre-rendered at build time, when the env vars may not exist.
export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await getGoogleReviews();
  return NextResponse.json(
    { data },
    {
      headers: {
        // Success: CDN-cache 1h, serve stale up to a day while it
        // refreshes. Failure: only 5 min, so a fix shows up quickly.
        'Cache-Control': data
          ? 'public, s-maxage=3600, stale-while-revalidate=86400'
          : 'public, s-maxage=300',
      },
    },
  );
}
