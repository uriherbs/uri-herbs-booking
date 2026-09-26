// ============================================================
// src/lib/google-reviews.ts
// ============================================================
// SERVER-ONLY. Fetches the shop's rating + up to 5 reviews from
// Google Places API (New) — Place Details — using
// GOOGLE_PLACES_API_KEY and GOOGLE_PLACE_ID. The key never leaves
// the server: the homepage calls getGoogleReviews() directly from a
// server component, and the (client-side) /book page goes through
// /api/reviews, which calls the same function.
//
// Caching: wrapped in unstable_cache (Next's data cache) with a 12h
// revalidate, so Google is hit at most ~2×/day per deployment no
// matter how much traffic the site gets. unstable_cache rather than
// fetch()'s own `next: { revalidate }` because the homepage is
// `force-dynamic` (it reads live workshops), and force-dynamic
// turns every fetch() on the page into no-store — unstable_cache
// isn't affected by that.
//
// Failure handling: the cached function THROWS on any error, which
// unstable_cache never stores — so a transient Google failure isn't
// frozen in the cache for 12h. The public getGoogleReviews() catches
// everything and returns null; callers render nothing on null.
// No key / no place ID configured → null without calling Google.
// ============================================================

import { unstable_cache } from 'next/cache';

export const REVIEWS_REVALIDATE_SECONDS = 60 * 60 * 12; // 12h

export type GoogleReview = {
  authorName: string;
  authorUri: string | null;
  authorPhotoUri: string | null;
  rating: number;
  text: string;
  publishTime: string | null; // ISO 8601
  relativeTime: string | null; // Google's own "2 months ago" (fallback only)
  reviewUri: string | null;
};

export type GoogleReviewsData = {
  rating: number | null;
  totalReviews: number | null;
  placeUri: string | null;
  reviews: GoogleReview[];
};

// Only the fields we render — Places API (New) bills by field mask.
const FIELD_MASK = ['rating', 'userRatingCount', 'googleMapsUri', 'reviews'].join(',');

// Takes only the place ID — the key is read inside, so it never
// becomes part of the data-cache key.
async function fetchFromGoogle(placeId: string): Promise<GoogleReviewsData> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_PLACES_API_KEY missing');
  const url =
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}` +
    `?languageCode=en`;

  const res = await fetch(url, {
    headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': FIELD_MASK },
    cache: 'no-store', // caching is done by unstable_cache below
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    // Don't include the response body — Google echoes request
    // details in some errors; status is enough to debug from logs.
    throw new Error(`Places API responded ${res.status}`);
  }
  const json = await res.json();

  const reviews: GoogleReview[] = (Array.isArray(json.reviews) ? json.reviews : [])
    .map((r: any): GoogleReview => ({
      authorName: r?.authorAttribution?.displayName || 'Google user',
      authorUri: r?.authorAttribution?.uri || null,
      authorPhotoUri: r?.authorAttribution?.photoUri || null,
      rating: typeof r?.rating === 'number' ? r.rating : 0,
      text: (r?.text?.text || r?.originalText?.text || '').trim(),
      publishTime: r?.publishTime || null,
      relativeTime: r?.relativePublishTimeDescription || null,
      reviewUri: r?.googleMapsUri || null,
    }))
    // A star-only review makes an empty card — skip those.
    .filter((r: GoogleReview) => r.text.length > 0)
    .slice(0, 5);

  return {
    rating: typeof json.rating === 'number' ? json.rating : null,
    totalReviews: typeof json.userRatingCount === 'number' ? json.userRatingCount : null,
    placeUri: json.googleMapsUri || null,
    reviews,
  };
}

const cachedFetch = unstable_cache(fetchFromGoogle, ['google-place-reviews-v1'], {
  revalidate: REVIEWS_REVALIDATE_SECONDS,
  tags: ['google-reviews'],
});

/** Returns null when unconfigured, on any error, or when there's nothing to show. */
export async function getGoogleReviews(): Promise<GoogleReviewsData | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!apiKey || !placeId) return null;

  try {
    const data = await cachedFetch(placeId);
    return data.reviews.length > 0 ? data : null;
  } catch (err) {
    console.error('[google-reviews]', err instanceof Error ? err.message : err);
    return null;
  }
}
