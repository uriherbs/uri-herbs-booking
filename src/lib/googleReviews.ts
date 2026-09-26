// ============================================================
// src/lib/googleReviews.ts
// ============================================================
// Server-side helper that pulls Uri Herbs Workshop's real rating,
// review count, and top reviews from the Google Places API (New),
// so the site never needs a paid third-party review widget.
//
// Requires GOOGLE_PLACES_API_KEY (server-side only — never expose
// this to the client) and a working billing account linked to the
// Google Cloud project the key belongs to. See README for setup.
//
// The Google Cloud Places API has a free monthly usage credit, but
// every call still costs money past it, so results are cached via
// Next.js's fetch data cache (`next: { revalidate }`) rather than
// re-fetched on every page view. Reviews change slowly — a
// once-a-day refresh is more than enough.
// ============================================================

const PLACE_ID = 'ChIJxecF1bQ72jAREMxTp8PDykE'; // Uri Herbs Workshop, confirmed via Google Places search (44, 3 Si Phum Soi 9, Old City)
const REVALIDATE_SECONDS = 60 * 60 * 24; // 24h — reviews don't need to be real-time

export type GoogleReview = {
  authorName: string;
  authorPhotoUrl: string | null;
  rating: number;
  relativeTime: string;
  text: string;
};

export type GooglePlaceReviews = {
  rating: number;
  userRatingCount: number;
  googleMapsUri: string;
  reviews: GoogleReview[];
};

// A safe fallback so the site still renders something reasonable
// (and never crashes a page) if the API key isn't set up yet, or
// Google's API has a hiccup. Numbers here match the real listing as
// of 2026-09-26 — update if they drift noticeably out of date.
const FALLBACK: GooglePlaceReviews = {
  rating: 5.0,
  userRatingCount: 61,
  googleMapsUri: `https://www.google.com/maps/place/?q=place_id:${PLACE_ID}`,
  reviews: [],
};

export async function getGooglePlaceReviews(): Promise<GooglePlaceReviews> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    // Not configured yet — fail quietly with the fallback rather
    // than breaking the homepage for every visitor.
    return FALLBACK;
  }

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${PLACE_ID}`,
      {
        headers: {
          'X-Goog-Api-Key': apiKey,
          // Field mask keeps the request to only what we use — Places
          // API (New) bills by which fields you request.
          'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,reviews',
        },
        next: { revalidate: REVALIDATE_SECONDS },
      }
    );

    if (!res.ok) {
      console.error('Google Places API error', res.status, await res.text());
      return FALLBACK;
    }

    const data = await res.json();

    const reviews: GoogleReview[] = (data.reviews ?? []).map((r: any) => ({
      authorName: r.authorAttribution?.displayName ?? 'Google user',
      authorPhotoUrl: r.authorAttribution?.photoUri ?? null,
      rating: r.rating ?? 0,
      relativeTime: r.relativePublishTimeDescription ?? '',
      text: r.text?.text ?? r.originalText?.text ?? '',
    }));

    return {
      rating: data.rating ?? FALLBACK.rating,
      userRatingCount: data.userRatingCount ?? FALLBACK.userRatingCount,
      googleMapsUri: data.googleMapsUri ?? FALLBACK.googleMapsUri,
      reviews,
    };
  } catch (err) {
    console.error('Failed to fetch Google reviews', err);
    return FALLBACK;
  }
}
