// ============================================================
// src/components/home/ReviewsSection.tsx
// ============================================================
// Real Google review social proof — rating, review count, and a
// few real customer quotes pulled server-side from the Google
// Places API (see src/lib/googleReviews.ts). Shown on the homepage
// and the /book page (backlog: "Google Maps integration
// (ratings/photos) — placement decided (home + booking page)").
//
// Async Server Component: fetches on the server (data cached for
// 24h via Next's fetch cache), ships plain HTML to the client — no
// third-party review-widget subscription needed.
// ============================================================

import { getGooglePlaceReviews } from '@/lib/googleReviews';
import { PillButton } from '@/components/PillButton';
import { C, FONT_DISPLAY, FONT_BODY } from '@/lib/theme';

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill={filled ? C.gold : 'none'} stroke={C.gold} strokeWidth={filled ? 0 : 1.5} aria-hidden="true">
      <path d="M12 2.5l2.9 6.3 6.9.7-5.2 4.7 1.5 6.8L12 17.6l-6.1 3.4 1.5-6.8L2.2 9.5l6.9-.7L12 2.5z" />
    </svg>
  );
}

function Stars({ rating }: { rating: number }) {
  const rounded = Math.round(rating);
  return (
    <div style={{ display: 'inline-flex', gap: 2 }} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} filled={i <= rounded} />
      ))}
    </div>
  );
}

interface ReviewsSectionProps {
  // /book page uses a slightly more compact heading than the home
  // page's full-width section.
  compact?: boolean;
}

export async function ReviewsSection({ compact = false }: ReviewsSectionProps) {
  const { rating, userRatingCount, reviews, googleMapsUri } = await getGooglePlaceReviews();
  const shown = reviews.slice(0, 3);

  return (
    <section style={{ background: compact ? C.white : C.parchment }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .reviews-grid { display: grid; gap: 20px; max-width: 1080px; margin: 0 auto; padding: ${compact ? '40px 20px' : '56px 20px'}; }
            @media (min-width: 780px) { .reviews-grid.has-reviews { grid-template-columns: repeat(3, 1fr); } }
          `,
        }}
      />

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: `${compact ? '40px' : '56px'} 20px 0`, textAlign: 'center' }}>
        <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.sageDark }}>
          Real Reviews
        </p>
        <h2 style={{ margin: '8px 0 0', fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(26px,4vw,34px)', color: C.forest }}>
          What guests are saying
        </h2>
        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Stars rating={rating} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: C.forest }}>{rating.toFixed(1)}</span>
          <span style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.bark }}>
            · {userRatingCount} Google reviews
          </span>
        </div>
      </div>

      {shown.length > 0 && (
        <div className="reviews-grid has-reviews">
          {shown.map((review, i) => (
            <div
              key={i}
              style={{
                background: C.white,
                border: `1px solid ${C.sand}`,
                borderRadius: 20,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <Stars rating={review.rating} />
              <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 14.5, lineHeight: 1.7, color: C.bark, flex: 1 }}>
                “{review.text.length > 220 ? `${review.text.slice(0, 220).trim()}…` : review.text}”
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                {review.authorPhotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={review.authorPhotoUrl}
                    alt=""
                    width={32}
                    height={32}
                    style={{ borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.sageLight }} />
                )}
                <div>
                  <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: C.forest }}>
                    {review.authorName}
                  </p>
                  <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 12, color: C.barkLight }}>
                    {review.relativeTime}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', paddingBottom: compact ? 40 : 56 }}>
        <PillButton href={googleMapsUri} variant="outline" style={{ background: C.sageLight, color: C.forest, border: `1px solid ${C.sand}` }}>
          See all reviews on Google
        </PillButton>
      </div>
    </section>
  );
}
