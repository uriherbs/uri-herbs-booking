// ============================================================
// src/app/workshops/[slug]/page.tsx
// ============================================================
// Single workshop content page — hero, intro, alternating content
// blocks, "you'll take home" callout, gallery, price + booking CTA.
//
// This is a visual/layout upgrade only. All data wiring is
// unchanged: still getWorkshopPageData(slug) from
// workshop-content-service.ts (real hero/intro/content_blocks/
// gallery/price from Supabase), still notFound() on a bad slug.
// Previously written with React.createElement (an `E` helper) —
// rewritten here as plain JSX, matching every other page in the
// project; behavior is identical, only the authoring style changed.
//
// Layout/typography ported from the closest analog in the
// uri-herbs-v0-design mockup: it has no dedicated workshop page, but
// its blog post page (app/blog/[slug]/page.tsx +
// components/blog/post-content.tsx) is the same shape — a single
// centered column with a "back" link, an eyebrow label + serif
// title, a LeafFrame-wrapped hero image, and flowing body content —
// so that page's visual language is what's reused here.
// ============================================================

import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getWorkshopPageData } from '@/lib/workshop-content-service';
import { getPlaceholderWorkshopImage } from '@/lib/workshop-placeholder-images';
import SiteHeader from '@/components/SiteHeader';
import { LeafFrame } from '@/components/LeafFrame';
import { PillButton } from '@/components/PillButton';
import { C, FONT_DISPLAY, FONT_BODY, FONT_IMPORT } from '@/lib/theme';

const ArrowLeftSVG = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const w = await getWorkshopPageData(params.slug);
  if (!w) return {};
  return {
    title: `${w.name} — Uri Herbs Workshop`,
    description: w.intro_paragraph || w.description || undefined,
  };
}

export default async function WorkshopPage({ params }: { params: { slug: string } }) {
  const w = await getWorkshopPageData(params.slug);
  if (!w) notFound();

  const heroImage = w.hero_image_url || getPlaceholderWorkshopImage(w.slug, 0);

  return (
    <div style={{ background: C.parchment, minHeight: '100vh' }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            ${FONT_IMPORT}
            * { box-sizing: border-box; }
            .wblock { display: grid; gap: 24px; margin-bottom: 40px; align-items: center; }
            @media (min-width: 700px) {
              .wblock { grid-template-columns: 1fr 1fr; gap: 40px; }
              .wblock.rev .wblock-img { order: 2; }
            }
            .gallery-item { border-radius: 14px; overflow: hidden; aspect-ratio: 1; }
          `,
        }}
      />

      <SiteHeader />

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '40px 20px 80px' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: FONT_BODY,
            fontSize: 14,
            fontWeight: 600,
            color: C.barkLight,
            textDecoration: 'none',
          }}
        >
          <ArrowLeftSVG /> Back to Workshops
        </Link>

        <div style={{ marginTop: 24 }}>
          <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.gold }}>
            Our Workshops
          </p>
          <h1 style={{ margin: '8px 0 0', fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(30px,5vw,44px)', color: C.forest, lineHeight: 1.1 }}>
            {w.name}
          </h1>
          {w.duration_minutes && (
            <p style={{ margin: '10px 0 0', fontFamily: FONT_BODY, fontSize: 14, color: C.barkLight }}>
              {w.duration_minutes}-minute workshop
            </p>
          )}
        </div>

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center' }}>
          {/* Real hero_image_url from the DB when this workshop has
              one; an AI-generated placeholder (see
              src/lib/workshop-placeholder-images.ts) only if it's
              null. No code change needed here once every workshop has
              a real photo — the placeholder just stops being used. */}
          <LeafFrame>
            <img
              src={heroImage}
              alt={w.name}
              style={{ display: 'block', width: 640, maxWidth: '82vw', aspectRatio: '16 / 10', objectFit: 'cover' }}
            />
          </LeafFrame>
        </div>

        {w.intro_paragraph && (
          <p
            style={{
              margin: '40px auto 0',
              maxWidth: 640,
              fontFamily: FONT_DISPLAY,
              fontStyle: 'italic',
              fontWeight: 500,
              fontSize: 'clamp(19px,2.4vw,23px)',
              lineHeight: 1.6,
              color: C.forest,
              textAlign: 'center',
            }}
          >
            {w.intro_paragraph}
          </p>
        )}

        {w.content_blocks.length > 0 && (
          <div style={{ marginTop: 56 }}>
            {w.content_blocks.map((b, i) => (
              <div key={b.id} className={`wblock ${i % 2 ? 'rev' : ''}`}>
                {b.image_url && (
                  <div className="wblock-img" style={{ borderRadius: 20, overflow: 'hidden', aspectRatio: '4 / 3' }}>
                    <img src={b.image_url} alt={b.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div>
                  <div style={{ width: 32, height: 3, background: C.gold, marginBottom: 14 }} />
                  <h2 style={{ margin: '0 0 12px', fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: C.forest }}>
                    {b.title}
                  </h2>
                  <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.75, color: C.bark }}>
                    {b.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {w.takeaway_description && (
          <div
            style={{
              background: C.sageLight,
              borderRadius: 18,
              padding: '24px 26px',
              borderLeft: `4px solid ${C.sage}`,
            }}
          >
            <p style={{ margin: '0 0 6px', fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.sageDark }}>
              You&rsquo;ll take home
            </p>
            <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.6, color: C.forest }}>
              {w.takeaway_description}
            </p>
          </div>
        )}

        {w.gallery.length > 0 && (
          <div style={{ marginTop: 44 }}>
            <h2 style={{ margin: '0 0 18px', fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 22, color: C.forest }}>
              Gallery
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
              {w.gallery.map((g) => (
                <div key={g.id} className="gallery-item">
                  {g.media_type === 'video' ? (
                    <video src={g.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted loop playsInline />
                  ) : (
                    <img src={g.media_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 48,
            paddingTop: 28,
            borderTop: `1px solid ${C.sand}`,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          {w.price_thb != null ? (
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 30, color: C.forest }}>
              ฿{w.price_thb.toLocaleString()}
              <span style={{ marginLeft: 8, fontFamily: FONT_BODY, fontWeight: 400, fontSize: 14, color: C.barkLight }}>
                per person{w.duration_minutes ? `, ${w.duration_minutes} min` : ''}
              </span>
            </div>
          ) : (
            <div />
          )}
          <PillButton href="/book" size="lg">
            Book This Workshop
          </PillButton>
        </div>
      </main>
    </div>
  );
}
