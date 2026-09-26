// ============================================================
// src/components/ReviewsStripClient.tsx
// ============================================================
// Compact Google-rating strip for client-rendered pages that can't
// use the async Server Component (src/components/home/ReviewsSection.tsx)
// directly — right now that's just src/app/book/page.tsx, which is
// 'use client' end-to-end for its interactive checkout flow.
//
// Fetches GET /api/reviews on mount (see src/app/api/reviews/route.ts),
// which itself is cached server-side for 24h — this doesn't call
// Google on every page view.
//
// Deliberately minimal (a single line, not a full grid of review
// cards) so it reads as reassurance while picking a workshop rather
// than competing with the actual booking UI for attention.
// ============================================================

import { useEffect, useState } from 'react';

type ReviewsData = {
  rating: number;
  userRatingCount: number;
  googleMapsUri: string;
};

function Star({ filled, color }: { filled: boolean; color: string }) {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth={filled ? 0 : 1.5} aria-hidden="true">
      <path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6l-6.1 3.4 1.5-6.8L2.2 9.5l6.9-.7L12 2.5z" />
    </svg>
  );
}

interface ReviewsStripClientProps {
  gold: string;
  forest: string;
  bark: string;
}

export function ReviewsStripClient({ gold, forest, bark }: ReviewsStripClientProps) {
  const [data, setData] = useState<ReviewsData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/reviews')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        /* stay hidden on failure — this is a nice-to-have, not critical UI */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  const rounded = Math.round(data.rating);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexWrap: 'wrap', padding: '4px 16px 20px', textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', gap: 1 }} aria-label={`${data.rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} filled={i <= rounded} color={gold} />
        ))}
      </div>
      <span style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, color: forest }}>
        {data.rating.toFixed(1)}
      </span>
      <a
        href={data.googleMapsUri}
        target="_blank"
        rel="noopener noreferrer"
        style={{ fontFamily: "'DM Sans'", fontSize: 12.5, color: bark, textDecoration: 'underline', textUnderlineOffset: 2 }}
      >
        {data.userRatingCount} Google reviews
      </a>
    </div>
  );
}
