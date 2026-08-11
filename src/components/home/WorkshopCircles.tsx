// ============================================================
// src/components/home/WorkshopCircles.tsx
// ============================================================
// "Our Workshops" grid on the homepage. Layout/copy ported from
// the uri-herbs-v0-design mockup (components/home/workshop-circles.tsx),
// which listed a hardcoded WORKSHOPS array. That mockup's booking
// system is a separate, unrelated project — this version instead
// pulls the real, live workshop list from Supabase via
// getActiveWorkshopSummaries() (src/lib/workshop-content-service.ts),
// the same source that already powers /workshops/[slug], so the
// cards here can never drift from what that page actually shows.
//
// Server Component — no 'use client' needed, matches the async
// pattern already used by src/app/workshops/[slug]/page.tsx.
// ============================================================

import Link from 'next/link';
import { getActiveWorkshopSummaries } from '@/lib/workshop-content-service';
import { C, FONT_DISPLAY, FONT_BODY } from '@/lib/theme';

// Uses `stroke="currentColor"` so the CSS hover rule below (which
// can't win against an inline `style` override) can recolor it via
// the parent's `color` instead.
const ArrowUpRightSVG = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L17 7M7 7h10v10" />
  </svg>
);

export async function WorkshopCircles() {
  // Degrade gracefully instead of crashing the whole homepage (no
  // error.tsx boundary sits between this and the root layout) if
  // Supabase is briefly unreachable — the rest of the page (hero,
  // intro, contact CTA) should still render fine without it.
  let workshops: Awaited<ReturnType<typeof getActiveWorkshopSummaries>> = [];
  try {
    workshops = await getActiveWorkshopSummaries();
  } catch (err) {
    console.error('WorkshopCircles: failed to load workshops', err);
    return null;
  }

  if (workshops.length === 0) return null;

  return (
    <section style={{ maxWidth: 1080, margin: '0 auto', padding: '56px 20px' }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .home-workshop-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
            @media (min-width: 620px) { .home-workshop-grid { grid-template-columns: 1fr 1fr; } }
            @media (min-width: 980px) { .home-workshop-grid { grid-template-columns: repeat(${workshops.length}, 1fr); } }
            .workshop-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
            .workshop-card:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(45,70,57,0.14); }
            .workshop-card-arrow { background: ${C.sageLight}; color: ${C.sage}; transition: background 0.2s ease, color 0.2s ease; }
            .workshop-card:hover .workshop-card-arrow { background: ${C.sageDark}; color: #fff; }
          `,
        }}
      />

      <div style={{ maxWidth: 520, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.gold }}>
          Our Workshops
        </p>
        <h2 style={{ margin: '8px 0 0', fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(26px,4vw,34px)', color: C.forest }}>
          Ways to make something by hand
        </h2>
      </div>

      <div className="home-workshop-grid" style={{ marginTop: 40 }}>
        {workshops.map((w) => (
          <Link
            key={w.id}
            href={`/workshops/${w.slug}`}
            className="workshop-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: 20,
              border: `1px solid ${C.sand}`,
              background: C.white,
              textDecoration: 'none',
            }}
          >
            <div style={{ position: 'relative', aspectRatio: '4 / 3', overflow: 'hidden' }}>
              {w.hero_image_url ? (
                <img
                  src={w.hero_image_url}
                  alt={`${w.name} workshop`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: `linear-gradient(135deg, ${C.sageLight} 0%, ${C.sage} 100%)`,
                  }}
                />
              )}
            </div>

            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <h3 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 19, color: C.forest }}>
                  {w.name}
                </h3>
                <span
                  className="workshop-card-arrow"
                  style={{
                    marginTop: 2,
                    display: 'flex',
                    width: 30,
                    height: 30,
                    flexShrink: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                  }}
                >
                  <ArrowUpRightSVG />
                </span>
              </div>
              {w.description && (
                <p style={{ margin: '8px 0 0', fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.6, color: C.bark }}>
                  {w.description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
