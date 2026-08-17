'use client';

// ============================================================
// src/components/legal/LegalModal.tsx
// ============================================================
// In-page overlay for reading /terms or /privacy without leaving the
// checkout flow. Purely self-contained: it takes `open` + `onClose`
// from its parent and never reaches back into anything else — closing
// it (X, backdrop click, or Escape) only ever calls `onClose`, which
// in /book is just `setLegalModal(null)`. It has no way to touch the
// booking form, the agreement checkbox, or any other page state.
//
// Same content as the standalone pages (LegalDoc from legal-content.ts,
// rendered through the same LegalBlocks used by LegalPageLayout) —
// this is an alternate way to view it, not a fork of it.
// ============================================================

import { useEffect, useId, useRef } from 'react';
import type { LegalDoc } from '@/lib/legal-content';
import { C } from './LegalTheme';
import { LegalBlocks } from './LegalBlocks';

interface LegalModalProps {
  doc: LegalDoc | null; // null = closed
  onClose: () => void;
}

export default function LegalModal({ doc, onClose }: LegalModalProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  // Lock background scroll while open, restore on close/unmount —
  // otherwise the /book page behind scrolls along with the modal on
  // mobile, which feels broken.
  useEffect(() => {
    if (!doc) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [doc]);

  // Escape to close.
  useEffect(() => {
    if (!doc) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [doc, onClose]);

  if (!doc) return null;

  // JS-driven scroll instead of <a href="#id"> — the jump targets
  // live inside this modal's own scrolling container, not the page,
  // and anchor-link scrolling into a nested overflow:auto element
  // isn't reliable across browsers. This also avoids writing to the
  // page's URL hash just from opening a popup.
  const jumpTo = (id: string) => {
    bodyRef.current?.querySelector(`#legal-modal-${doc.slug}-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      onClick={onClose}
      style={{
        // Higher than FloatingWhatsApp's zIndex: 1000 (src/components/
        // FloatingWhatsApp.tsx) — that button renders after {children}
        // in the root layout, so at an equal z-index it would win the
        // stacking tie and float visibly over this modal.
        position: 'fixed', inset: 0, zIndex: 1100,
        background: 'rgba(45,70,57,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* dangerouslySetInnerHTML for the same reason as every other
          <style> tag on this branch — the media query below can't be
          expressed as an inline style, and a JSX text child would get
          HTML-escaped in a way that mismatches hydration. No `&`/`'`
          in this one, but keeping the same safe pattern consistently
          rather than special-casing "this one's fine". */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .legal-modal-panel { width: 100%; max-width: 680px; max-height: 85vh; border-radius: 20px; }
            @media (max-width: 640px) {
              .legal-modal-panel { max-width: 100%; height: 100dvh; max-height: 100dvh; border-radius: 0; }
            }
            .legal-modal-close:hover { background: ${C.sand} !important; }
          `,
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        className="legal-modal-panel"
        style={{
          background: C.parchment, boxShadow: '0 20px 60px rgba(45,70,57,0.35)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        {/* Header — stays put while the body scrolls */}
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
          padding: '18px 20px', borderBottom: `1px solid ${C.sand}`, background: C.white,
        }}>
          <div>
            <h2 id={titleId} style={{ fontFamily: "'Crimson Pro'", fontSize: 22, fontWeight: 700, color: C.forest, margin: 0 }}>
              {doc.title}
            </h2>
            <p style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight, margin: '3px 0 0' }}>
              Effective {doc.effectiveDate}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            onClick={onClose}
            aria-label={`Close ${doc.title}`}
            className="legal-modal-close"
            style={{
              flexShrink: 0, width: 34, height: 34, borderRadius: '50%', border: 'none',
              background: C.mist, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: C.forest, transition: 'background 0.15s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Download PDF — same row-of-actions treatment, sits right
            under the header so it's visible without scrolling */}
        <div style={{
          flexShrink: 0, padding: '12px 20px', borderBottom: `1px solid ${C.sand}`, background: C.white,
        }}>
          <a
            href={`/api/legal/${doc.slug}/pdf`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600, color: C.sageDark,
              textDecoration: 'none', border: `1.5px solid ${C.sage}`, borderRadius: 20,
              padding: '7px 14px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
            Download as PDF
          </a>
        </div>

        {/* Jump list */}
        <div style={{ flexShrink: 0, padding: '12px 20px', borderBottom: `1px solid ${C.sand}`, background: C.goldLight }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
            {doc.sections.map((s) => (
              <button
                key={s.id}
                onClick={() => jumpTo(s.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
                  fontFamily: "'DM Sans'", fontSize: 12.5, color: C.bark, textAlign: 'left',
                }}
              >
                <span style={{ color: C.gold, fontWeight: 700 }}>{s.number}.</span> {s.heading}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content */}
        <div ref={bodyRef} style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 32px', WebkitOverflowScrolling: 'touch' }}>
          {doc.sections.map((s) => (
            <section key={s.id} id={`legal-modal-${doc.slug}-${s.id}`} style={{ marginBottom: 28, scrollMarginTop: 12 }}>
              <h3 style={{
                fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 700, color: C.forest,
                margin: '0 0 8px', display: 'flex', gap: 8, alignItems: 'baseline',
              }}>
                <span style={{ color: C.gold }}>{s.number}.</span>
                {s.heading}
              </h3>
              <div
                className="legal-body"
                style={{ fontFamily: "'DM Sans'", fontSize: 14.5, lineHeight: 1.7, color: C.bark }}
              >
                <LegalBlocks blocks={s.blocks} />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
