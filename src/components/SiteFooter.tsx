// ============================================================
// src/components/SiteFooter.tsx
// ============================================================
// Shared bottom bar for the public marketing pages (Home, /contact,
// /workshops/[slug], /blog) — same page set as SiteHeader, deliberately
// NOT used on /book or /admin/* (same reasoning as SiteHeader: /book has
// its own step-wizard chrome, /admin/* is a separate internal tool).
//
// Purpose: a single, deliberately unobtrusive "Staff" link to
// /admin/login. There is no other entry point to the admin dashboard
// anywhere on the public site (see SiteHeader.tsx's comment) — Mali
// bookmarking /admin/login directly is still the primary way in, this
// is just a low-visibility fallback so the link isn't only ever
// something typed from memory.
//
// Also carries a second, equally low-key link to /trade (the B2B
// "Trade & Groups" landing page for travel agencies / tour guides,
// added Aug 2026) — that audience is a small fraction of visitors,
// so it doesn't belong in the primary SiteHeader nav, but it still
// needs one discoverable entry point instead of being link-only.
// ============================================================

import Link from 'next/link';
import { C, FONT_BODY } from '@/lib/theme';

// Policy links: shown on every public page so merchant reviewers
// (Omise KYC) and customers can find the cancellation/refund, terms,
// and privacy policies without starting a booking. Legible, not muted.
const POLICY_LINKS = [
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/terms#cancellation', label: 'Cancellation & Refunds' },
  { href: '/privacy', label: 'Privacy Policy' },
];

export default function SiteFooter() {
  return (
    <footer style={{ borderTop: `1px solid ${C.sand}`, padding: '18px 24px' }}>
      <nav
        aria-label="Policies"
        style={{
          maxWidth: 1000, margin: '0 auto 12px',
          display: 'flex', flexWrap: 'wrap', gap: '8px 20px', justifyContent: 'center',
        }}
      >
        {POLICY_LINKS.map(l => (
          <Link
            key={l.href}
            href={l.href}
            style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.forest, textDecoration: 'underline' }}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div style={{
        maxWidth: 1000, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8,
      }}>
        <span style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.barkLight }}>
          © {new Date().getFullYear()} Uri Herbs Workshop
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Small and muted on purpose — see file header comment. */}
          <Link
            href="/trade"
            style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.barkLight, opacity: 0.7, textDecoration: 'none' }}
          >
            Travel Agencies &amp; Guides
          </Link>
          {/* Small and muted on purpose — for staff use, not a public CTA. */}
          <Link
            href="/admin/login"
            style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.barkLight, opacity: 0.7, textDecoration: 'none' }}
          >
            Staff
          </Link>
        </div>
      </div>
    </footer>
  );
}
