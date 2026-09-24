'use client';

// ============================================================
// src/components/reviews/GoogleReviewsClient.tsx
// ============================================================
// Client-side wrapper for pages that are themselves client
// components (/book). Fetches /api/reviews once on mount and renders
// GoogleReviews in its compact layout. Renders nothing while loading
// or if there's nothing to show (no key yet, Google error, network
// error), so the page is never affected by a reviews problem.
// ============================================================

import { useEffect, useState } from 'react';
import type { GoogleReviewsData } from '@/lib/google-reviews';
import { GoogleReviews } from './GoogleReviews';

export function GoogleReviewsClient() {
  const [data, setData] = useState<GoogleReviewsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/reviews')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled && json?.data?.reviews?.length) setData(json.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;
  return <GoogleReviews data={data} compact />;
}
