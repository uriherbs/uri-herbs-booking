// ============================================================
// src/components/legal/LegalPageLayout.tsx
// ============================================================
// Shared chrome for /terms and /privacy — both are long, numbered
// legal documents, so this handles the reading-focused layout
// (narrower column than the rest of the site, jump-list, section
// numbering) once instead of duplicating it across both pages.
//
// Content comes entirely from a LegalDoc (src/lib/legal-content.ts)
// — this component has zero legal text of its own, it's purely
// presentation. The same LegalDoc also feeds LegalModal (the
// in-checkout popup) and the PDF download, so this page and those two
// can never show different text than each other.
// ============================================================

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import type { LegalDoc } from '@/lib/legal-content';
import { otherDoc } from '@/lib/legal-content';
import { C } from './LegalTheme';
import { LegalBlocks } from './LegalBlocks';

export { C };

interface LegalPageLayoutProps {
  doc: LegalDoc;
  intro?: React.ReactNode;
}

export default function LegalPageLayout({ doc, intro }: LegalPageLayoutProps) {
  const other = otherDoc(doc.slug);

  return (
    <div style={{ background: C.parchment, minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      {/* dangerouslySetInnerHTML, not a text child — the Google Fonts
          URL has `&` in it, which React would HTML-escape as a
          literal child. <style> is a "raw text" element the browser
          never entity-decodes, so that escaped text mismatches what
          hydration writes and breaks the page (same fix already
          applied elsewhere on this branch — home page, SiteHeader,
          /book, /contact). */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url(https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap);
            * { box-sizing: border-box; }
            .legal-body a { color: ${C.sageDark}; }
            .legal-body ul { margin: 8px 0; padding-left: 22px; }
            .legal-body li { margin-bottom: 6px; }
            .legal-body p { margin: 0 0 12px; }
            .legal-body p:last-child { margin-bottom: 0; }
            .legal-jump-link { text-decoration: none; transition: color 0.15s; }
            .legal-jump-link:hover { color: ${C.sage} !important; }
          `,
        }}
      />

      <SiteHeader />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '20px 24px 80px' }}>
        <div style={{ width: 32, height: 3, background: C.gold, marginBottom: 14 }} />
        <h1 style={{ fontFamily: "'Crimson Pro'", fontSize: 'clamp(30px,5vw,42px)', fontWeight: 700, color: C.forest, margin: '0 0 8px' }}>
          {doc.title}
        </h1>
        <p style={{ fontFamily: "'DM Sans'", fontSize: 13, color: C.barkLight, margin: '0 0 6px' }}>
          Effective {doc.effectiveDate}
        </p>
        <Link href={`/${other.slug}`} className="legal-jump-link" style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600, color: C.sageDark }}>
          Also read our {other.title} →
        </Link>

        {intro && (
          <p style={{ fontFamily: "'Crimson Pro'", fontSize: 17, lineHeight: 1.6, color: C.bark, margin: '22px 0 0' }}>
            {intro}
          </p>
        )}

        {/* Jump list — genuinely useful here since the document really
            is a numbered sequence of distinct clauses a reader will
            want to skip between, not decoration. */}
        <nav aria-label="Sections" style={{
          background: C.white, border: `1px solid ${C.sand}`, borderRadius: 14,
          padding: '18px 20px', margin: '28px 0 40px',
        }}>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.barkLight, marginBottom: 10 }}>
            On This Page
          </div>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {doc.sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="legal-jump-link"
                  style={{ display: 'flex', gap: 8, fontFamily: "'DM Sans'", fontSize: 13.5, color: C.bark }}
                >
                  <span style={{ color: C.gold, fontWeight: 600, flexShrink: 0 }}>{s.number}.</span>
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
          {doc.sections.map((s) => (
            <section key={s.id} id={s.id} style={{ scrollMarginTop: 84 }}>
              <h2 style={{
                fontFamily: "'Crimson Pro'", fontSize: 21, fontWeight: 700, color: C.forest,
                margin: '0 0 10px', display: 'flex', gap: 10, alignItems: 'baseline',
              }}>
                <span style={{ color: C.gold }}>{s.number}.</span>
                {s.heading}
              </h2>
              <div className="legal-body" style={{ fontFamily: "'DM Sans'", fontSize: 15, lineHeight: 1.7, color: C.bark }}>
                <LegalBlocks blocks={s.blocks} />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
