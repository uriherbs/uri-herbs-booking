// ============================================================
// src/components/reviews/GoogleReviews.tsx
// ============================================================
// Presentational only — no hooks, no data fetching — so it renders
// both from a server component (homepage, via HomeReviews) and from
// the client-side /book page (via GoogleReviewsClient).
//
// Two layouts:
//   - default: full-width homepage section (cards in a grid on
//     desktop, a swipeable row on mobile)
//   - compact: fits the /book page's 480px column — always a
//     swipeable row, smaller heading
//
// Google's Places API terms require showing each review's author
// (linked to their profile when Google gives a URI) and a visible
// Google Maps attribution when reviews are shown without a Google
// map — both are kept below; don't remove them.
// ============================================================

import type { GoogleReviewsData, GoogleReview } from '@/lib/google-reviews';
import { C, FONT_DISPLAY, FONT_BODY } from '@/lib/theme';

const STAR_PATH =
  'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z';

// Gold stars over sand-colored ones, clipped to the exact rating so
// a 4.7 average shows 4.7 stars rather than rounding.
function Stars({ value, size = 16 }: { value: number; size?: number }) {
  const row = (fill: string) => (
    <span style={{ display: 'flex', gap: 2 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={fill} aria-hidden="true" style={{ flexShrink: 0 }}>
          <path d={STAR_PATH} />
        </svg>
      ))}
    </span>
  );
  const pct = Math.max(0, Math.min(5, value)) * 20;
  return (
    <span role="img" aria-label={`${value.toFixed(1)} out of 5 stars`} style={{ position: 'relative', display: 'inline-flex' }}>
      {row(C.sand)}
      <span style={{ position: 'absolute', inset: 0, width: `${pct}%`, overflow: 'hidden' }}>{row(C.gold)}</span>
    </span>
  );
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
];

// Computed at render time from publishTime (not Google's cached
// "2 months ago" string, which would go stale inside the 12h cache).
function relativeDate(r: GoogleReview): string {
  if (r.publishTime) {
    const secs = (Date.now() - new Date(r.publishTime).getTime()) / 1000;
    if (Number.isFinite(secs)) {
      const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
      for (const [unit, size] of UNITS) {
        if (secs >= size) return rtf.format(-Math.floor(secs / size), unit);
      }
      return 'today';
    }
  }
  return r.relativeTime ?? '';
}

function ReviewCard({ review }: { review: GoogleReview }) {
  const initial = review.authorName.trim().charAt(0).toUpperCase() || '?';
  const name = review.authorUri ? (
    <a href={review.authorUri} target="_blank" rel="noopener noreferrer" style={{ color: C.forest, textDecoration: 'none' }}>
      {review.authorName}
    </a>
  ) : (
    review.authorName
  );

  return (
    <article className="gr-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {review.authorPhotoUri ? (
          <img
            src={review.authorPhotoUri}
            alt=""
            width={36}
            height={36}
            referrerPolicy="no-referrer"
            loading="lazy"
            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <span
            aria-hidden="true"
            style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: C.sageLight, color: C.sageDark,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 17,
            }}
          >
            {initial}
          </span>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: 14, color: C.forest, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.barkLight }}>{relativeDate(review)}</div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Stars value={review.rating} size={15} />
      </div>

      <p className="gr-text">{review.text}</p>

      {review.reviewUri && (
        <a
          href={review.reviewUri}
          target="_blank"
          rel="noopener noreferrer"
          style={{ marginTop: 'auto', paddingTop: 12, fontFamily: FONT_BODY, fontSize: 12.5, fontWeight: 600, color: C.sage, textDecoration: 'none' }}
        >
          Read on Google →
        </a>
      )}
    </article>
  );
}

export function GoogleReviews({ data, compact = false }: { data: GoogleReviewsData; compact?: boolean }) {
  const { rating, totalReviews, placeUri, reviews } = data;

  return (
    <section
      aria-labelledby="google-reviews-heading"
      className={compact ? 'gr gr-compact' : 'gr'}
      style={compact ? { padding: '8px 0 4px' } : { background: C.parchment, padding: '56px 0' }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .gr-inner { max-width: 1080px; margin: 0 auto; padding: 0 20px; }
            .gr-compact .gr-inner { padding: 0; }
            .gr-row { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding: 0 20px; padding: 4px 20px 12px; margin: 0 -20px; scrollbar-width: none; }
            .gr-compact .gr-row { padding: 4px 0 12px; margin: 0; scroll-padding: 0; }
            .gr-row::-webkit-scrollbar { display: none; }
            .gr-card { flex: 0 0 82%; max-width: 320px; scroll-snap-align: start; display: flex; flex-direction: column;
              background: ${C.white}; border: 1px solid ${C.sand}; border-radius: 16px; padding: 18px;
              box-shadow: 0 2px 10px rgba(45,70,57,0.05); }
            .gr-text { margin: 10px 0 0; font-family: ${FONT_BODY}; font-size: 14px; line-height: 1.65; color: ${C.bark};
              display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 6; overflow: hidden; }
            @media (min-width: 900px) {
              .gr:not(.gr-compact) .gr-row { display: grid; grid-template-columns: repeat(3, 1fr); overflow: visible; margin: 0; padding: 4px 0 0; }
              .gr:not(.gr-compact) .gr-card { max-width: none; }
            }
          `,
        }}
      />

      <div className="gr-inner">
        <div style={{ textAlign: compact ? 'left' : 'center', marginBottom: compact ? 12 : 28 }}>
          {!compact && (
            <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.gold }}>
              Guest stories
            </p>
          )}
          <h2
            id="google-reviews-heading"
            style={{
              margin: compact ? 0 : '8px 0 0',
              fontFamily: FONT_DISPLAY,
              fontWeight: compact ? 600 : 700,
              fontSize: compact ? 18 : 'clamp(28px,4vw,36px)',
              color: C.forest,
              lineHeight: 1.2,
            }}
          >
            What our guests say
          </h2>
          {rating !== null && (
            <div
              style={{
                marginTop: compact ? 6 : 12,
                display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                justifyContent: compact ? 'flex-start' : 'center',
                fontFamily: FONT_BODY, fontSize: 14, color: C.bark,
              }}
            >
              <strong style={{ fontFamily: FONT_DISPLAY, fontSize: compact ? 18 : 22, color: C.forest }}>{rating.toFixed(1)}</strong>
              <Stars value={rating} size={compact ? 15 : 18} />
              {totalReviews !== null && (
                <span style={{ color: C.barkLight }}>
                  {placeUri ? (
                    <a href={placeUri} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                      {totalReviews} reviews on Google
                    </a>
                  ) : (
                    `${totalReviews} reviews on Google`
                  )}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="gr-row">
          {reviews.map((r, i) => (
            <ReviewCard key={`${r.authorName}-${r.publishTime ?? i}`} review={r} />
          ))}
        </div>

        {/* Required Google Maps attribution — keep. */}
        <p style={{ margin: compact ? '4px 0 0' : '20px 0 0', textAlign: compact ? 'left' : 'center', fontFamily: FONT_BODY, fontSize: 11.5, color: C.barkLight }}>
          Reviews from Google Maps
        </p>
      </div>
    </section>
  );
}
