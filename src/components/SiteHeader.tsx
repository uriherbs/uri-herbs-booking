// ============================================================
// src/components/SiteHeader.tsx
// ============================================================
// Shared top nav for the public marketing pages (Home, /contact,
// /workshops/[slug], /blog). Mobile-first: the link row is hidden
// by default and a hamburger button reveals a stacked panel; a
// min-width media query swaps that for a normal horizontal row on
// larger screens.
//
// Deliberately NOT used on /book or /admin/*:
//   - /book already has its own compact step-wizard header (Back
//     button + centered logo) — a "Book a Workshop" link pointing
//     at the page you're already on, next to a hamburger competing
//     with the wizard's Back button, would only add noise there.
//   - /admin/* is a separate internal tool with its own header and
//     staff-only nav (see AdminDashboard.tsx) — a marketing nav
//     with a "Book a Workshop" CTA has no place in the booking
//     management UI itself.
// ============================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PillButton } from '@/components/PillButton';

const C = {
  sage: '#6B8F71',
  forest: '#2D4639',
  white: '#FFFFFF',
  bark: '#5C4A3D',
  sand: '#E8E2D8',
};

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/contact', label: 'Contact' },
  { href: '/blog', label: 'Blog' },
];

const MenuSVG = ({ color = C.forest }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M3 6h18M3 12h18M3 18h18" />
  </svg>
);

const CloseSVG = ({ color = C.forest }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname?.startsWith(href));

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${C.sand}`,
      }}
    >
      {/* dangerouslySetInnerHTML, not a text child — the Google
          Fonts URL has `&` in it, which React would HTML-escape as
          a literal child. <style> is a "raw text" element the
          browser never entity-decodes, so that escaped text would
          mismatch what hydration writes and break the page. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url(https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@700&family=DM+Sans:wght@500;600;700&display=swap);
            .site-nav-desktop { display: none; }
            .site-nav-hamburger-btn { display: flex; }
            .site-nav-link { text-decoration: none; transition: color 0.15s; }
            .site-nav-link:hover { color: ${C.sage} !important; }
            @media (min-width: 761px) {
              .site-nav-desktop { display: flex; }
              .site-nav-hamburger-btn { display: none; }
              .site-nav-mobile-panel { display: none !important; }
            }
          `,
        }}
      />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" onClick={() => setOpen(false)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: "'Crimson Pro'", fontSize: 19, fontWeight: 700, color: C.forest, textDecoration: 'none',
        }}>
          {/* TODO(design): logo file carried over as-is from the
              uri-herbs-v0-design mockup (public/uri-herbs-logo.jpg
              there) — confirm with the studio whether this is the
              real brand logo or another AI-generated placeholder
              before launch, and replace public/uri-herbs-logo.jpg if
              so. Was a plain leaf icon before this change. */}
          <img
            src="/uri-herbs-logo.jpg"
            alt="Uri Herbs Workshop logo"
            style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }}
          />
          Uri Herbs Workshop
        </Link>

        {/* Desktop nav */}
        <nav className="site-nav-desktop" style={{ alignItems: 'center', gap: 28 }}>
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="site-nav-link"
              style={{ fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, color: isActive(l.href) ? C.sage : C.bark }}
            >
              {l.label}
            </Link>
          ))}
          <PillButton href="/book">Book a Workshop</PillButton>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="site-nav-hamburger-btn"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6, alignItems: 'center', justifyContent: 'center' }}
        >
          {open ? <CloseSVG /> : <MenuSVG />}
        </button>
      </div>

      {/* Mobile stacked panel */}
      {open && (
        <nav className="site-nav-mobile-panel" style={{ borderTop: `1px solid ${C.sand}`, padding: '10px 24px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 600,
                color: isActive(l.href) ? C.sage : C.forest,
                padding: '12px 4px', borderBottom: `1px solid ${C.sand}`, textDecoration: 'none',
              }}
            >
              {l.label}
            </Link>
          ))}
          <div style={{ paddingTop: 14 }} onClick={() => setOpen(false)}>
            <PillButton href="/book" style={{ width: '100%' }}>
              Book a Workshop
            </PillButton>
          </div>
        </nav>
      )}
    </header>
  );
}
