// ============================================================
// src/app/api/reviews/route.ts
// ============================================================
// Thin JSON endpoint over src/lib/googleReviews.ts, so the /book
// page (a 'use client' checkout flow) can pull real Google reviews
// without turning the whole flow into a Server Component. The
// homepage doesn't need this — it renders <ReviewsSection /> (an
// async Server Component) directly.
//
// `revalidate` here controls Next's Route Handler cache the same
// way `next: { revalidate }` does for a plain fetch — keeps this
// endpoint (and the Google Places calls behind it) cheap.
// ============================================================

import { NextResponse } from 'next/server';
import { getGooglePlaceReviews } from '@/lib/googleReviews';

export const revalidate = 60 * 60 * 24; // 24h

export async function GET() {
  const data = await getGooglePlaceReviews();
  return NextResponse.json(data);
}
