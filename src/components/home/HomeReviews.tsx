// ============================================================
// src/components/home/HomeReviews.tsx
// ============================================================
// Async server component: reads the cached Google reviews directly
// (no round-trip through /api/reviews) and renders them into the
// homepage HTML — so they're there on first paint and visible to
// search engines. Returns null (no section at all) when reviews are
// unavailable. See src/lib/google-reviews.ts for caching.
// ============================================================

import { getGoogleReviews } from '@/lib/google-reviews';
import { GoogleReviews } from '@/components/reviews/GoogleReviews';

export async function HomeReviews() {
  const data = await getGoogleReviews();
  if (!data) return null;
  return <GoogleReviews data={data} />;
}
