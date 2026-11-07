// ============================================================
// src/app/tea-recipes/full/page.tsx
// ============================================================
// The recipes page the gift email links to (owner 2026-11-07):
//   - download button for the 13-recipe PDF
//   - one overview video (YouTube, loads only when tapped) and a link
//     to the full playlist — set both in RECIPE_VIDEOS
//   - the 13 recipe names with their one-line tagline
//   - a teaser for the tea recipe book (50+ recipes, coming soon)
//   - the workshop booking pitch
// Not in the sitemap and noindex: it is the reward for leaving an email.
// ============================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import { TEA_RECIPES, RECIPE_VIDEOS } from '@/lib/landing-pages';
import { C, FONT_DISPLAY, FONT_BODY, FONT_IMPORT } from '@/lib/theme';
import YouTubeLite from './YouTubeLite';

export const metadata: Metadata = {
  title: 'Your 13 Thai Herbal Tea Recipes',
  description: 'The 13 Thai herbal teas we brew at Uri Herbs Workshop, Chiang Mai: printable recipes and videos.',
  robots: { index: false, follow: false },
};

const page = TEA_RECIPES;
const bookHref = `${page.bookUrl}?utm_source=recipes-page&utm_medium=web&utm_campaign=${page.slug}`;

export default function TeaRecipesFullPage() {
  const { overviewYoutubeId, playlistUrl } = RECIPE_VIDEOS;
  return (
    <main style={{ background: C.parchment, color: C.forest, fontFamily: FONT_BODY, minHeight: '100vh' }}>
      <style>{`${FONT_IMPORT}
        .rp-wrap { max-width: 880px; margin: 0 auto; padding: 0 18px; }
        .rp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 15px 22px; border-radius: 999px; border: none; font-family: ${FONT_BODY}; font-size: 16px; font-weight: 700; cursor: pointer; text-decoration: none; box-sizing: border-box; }
        .rp-btn:focus-visible { outline: 3px solid ${C.gold}; outline-offset: 2px; }
        .rp-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; grid-template-columns: 1fr; }
        @media (min-width: 640px) { .rp-list { grid-template-columns: 1fr 1fr; } }
      `}</style>

      <div className="rp-wrap" style={{ paddingTop: 18, paddingBottom: 6 }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: C.forest }}>
          <img src="/uri-herbs-logo.jpg" alt="Uri Herbs Workshop" width={40} height={40} style={{ borderRadius: '50%' }} />
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700 }}>Uri Herbs Workshop</span>
        </Link>
      </div>

      {/* Hero + download */}
      <section className="rp-wrap" style={{ paddingTop: 18, paddingBottom: 28 }}>
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: C.sageDark, fontWeight: 600 }}>Your recipe book</div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(30px, 6.5vw, 44px)', lineHeight: 1.1, margin: '10px 0 12px' }}>
          {page.recipes.length} Thai herbal teas from our workshop
        </h1>
        <p style={{ fontSize: 16.5, lineHeight: 1.6, color: C.bark, margin: '0 0 18px', maxWidth: 620 }}>
          Every recipe has a fresh-herb version for the pot and a dried tea-bag version, with the exact amounts we use in class.
        </p>
        <a href={page.pdfUrl} download className="rp-btn" style={{ background: C.forest, color: C.white }}>
          ⬇ Download the recipes (PDF)
        </a>
      </section>

      {/* Video */}
      <section style={{ background: C.white, borderTop: `1px solid ${C.sand}`, borderBottom: `1px solid ${C.sand}` }}>
        <div className="rp-wrap" style={{ paddingTop: 30, paddingBottom: 30 }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, margin: '0 0 6px' }}>Watch how we brew them</h2>
          <p style={{ margin: '0 0 16px', fontSize: 15, color: C.barkLight, lineHeight: 1.55 }}>
            Mali shows the herbs, the cuts and the timing, so your tea tastes like the one in the workshop.
          </p>
          {overviewYoutubeId ? (
            <YouTubeLite id={overviewYoutubeId} title="Thai herbal tea recipes with Uri Herbs Workshop" />
          ) : (
            <div style={{ aspectRatio: '16/9', borderRadius: 18, background: C.sageLight, display: 'grid', placeItems: 'center', textAlign: 'center', padding: 20, color: C.bark }}>
              <div>
                <div style={{ fontSize: 36 }} aria-hidden>🎬</div>
                <div style={{ fontWeight: 700, marginTop: 6 }}>Video coming soon</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>We are filming a short video for every recipe.</div>
              </div>
            </div>
          )}
          {playlistUrl && (
            <a href={playlistUrl} target="_blank" rel="noopener noreferrer" className="rp-btn" style={{ marginTop: 14, background: 'transparent', color: C.forest, border: `1.5px solid ${C.forest}` }}>
              ▶ All recipe videos on YouTube
            </a>
          )}
        </div>
      </section>

      {/* The 13 recipes */}
      <section className="rp-wrap" style={{ paddingTop: 30, paddingBottom: 30 }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, margin: '0 0 16px' }}>Inside the book</h2>
        <ol className="rp-list">
          {page.recipes.map((r, i) => (
            <li key={r.name} style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'baseline' }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.sage, minWidth: 30 }}>{String(i + 1).padStart(2, '0')}</span>
              <span>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 16 }}>{r.name}</span>
                <span style={{ display: 'block', fontSize: 14, color: C.barkLight, marginTop: 2 }}>{r.tagline}</span>
              </span>
            </li>
          ))}
        </ol>
        <p style={{ fontSize: 13, color: C.barkLight, margin: '14px 0 0', lineHeight: 1.5 }}>
          Traditional Thai recipes, shared for enjoyment. Please read the note on each recipe if you are pregnant or take regular medication.
        </p>
      </section>

      {/* Book teaser */}
      <section className="rp-wrap" style={{ paddingBottom: 24 }}>
        <div style={{ border: `1.5px dashed ${C.gold}`, borderRadius: 20, padding: '20px 20px', background: C.white }}>
          <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: C.gold, fontWeight: 700 }}>Coming soon</div>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, margin: '6px 0 6px' }}>The Uri Herbs tea recipe book</h2>
          <p style={{ margin: 0, fontSize: 15, color: C.bark, lineHeight: 1.6 }}>
            More than 50 Thai herbal tea recipes from our kitchen, for every season and every mood. You are on our list, so we will email you as soon as it is ready.
          </p>
        </div>
      </section>

      {/* Workshop pitch */}
      <section className="rp-wrap" style={{ paddingBottom: 40 }}>
        <div style={{ background: C.sageLight, borderRadius: 22, padding: '24px 22px', display: 'grid', gap: 10 }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, margin: 0 }}>Blend your own tea with us in Chiang Mai</h2>
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: C.bark, maxWidth: 640 }}>
            Taste fresh Thai herbal tea, learn what each herb brings, and mix two bags of your own blend to take home. The personal 10% code in our email works at checkout.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
            <Link href={bookHref} className="rp-btn" style={{ background: C.forest, color: C.white }}>Book a workshop</Link>
            <Link href={page.workshopUrl} className="rp-btn" style={{ background: 'transparent', color: C.forest, border: `1.5px solid ${C.forest}` }}>About the workshop</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
