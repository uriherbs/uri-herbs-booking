// ============================================================
// src/app/admin/(protected)/leads/links/page.tsx
// ============================================================
// Make a tracked link + QR code for a landing page (owner request
// 2026-11-07). Pick where it will be used (event, shop, Instagram…),
// add a short name (e.g. nov26), and get the link and a QR PNG to
// print. The ?src= decides the guest's offer (see pickOffer in
// lib/landing-pages.ts) and is saved on the lead as a tag.
// No database writes: links are just URLs.
// ============================================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { LANDING_PAGES, pickOffer } from '@/lib/landing-pages';

const C = {
  sage: '#6B8F71', sageDark: '#4A7050', sageLight: '#E7EFEA', forest: '#2D4639',
  parchment: '#F5F2EC', white: '#FFFFFF', bark: '#5C4A3D', barkLight: '#8A7668', sand: '#E8E2D8',
};

const SITE = 'https://www.uriherbs.com';

const PLACES: { key: string; label: string; medium: string }[] = [
  { key: 'event', label: 'Event / market booth', medium: 'qr' },
  { key: 'shop', label: 'Our shop (after a workshop)', medium: 'qr' },
  { key: 'shop-cn', label: 'Our shop — Chinese guests', medium: 'qr' },
  { key: 'instagram', label: 'Instagram', medium: 'social' },
  { key: 'facebook', label: 'Facebook', medium: 'social' },
  { key: 'tiktok', label: 'TikTok', medium: 'social' },
  { key: 'rednote', label: 'RedNote', medium: 'social' },
  { key: 'ads', label: 'Paid ads', medium: 'paid' },
];

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);

export default function LinksPage() {
  const pages = Object.values(LANDING_PAGES);
  const [pageSlug, setPageSlug] = useState(pages[0]?.slug || '');
  const [place, setPlace] = useState('event');
  const [name, setName] = useState('');
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  const page = LANDING_PAGES[pageSlug];
  const p = PLACES.find((x) => x.key === place)!;
  const src = name ? `${place}-${slugify(name)}` : place;
  const url = useMemo(
    () => `${SITE}/${pageSlug}?src=${encodeURIComponent(src)}&utm_source=${encodeURIComponent(place.split('-')[0])}&utm_medium=${p.medium}&utm_campaign=${pageSlug}`,
    [pageSlug, src, place, p.medium]
  );
  const offer = page ? pickOffer(page, src) : null;

  useEffect(() => {
    QRCode.toDataURL(url, { width: 1000, margin: 2, color: { dark: '#2D4639', light: '#FFFFFF' } }).then(setQr).catch(() => setQr(''));
    setCopied(false);
  }, [url]);

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { /* ignore */ }
  }

  const box: React.CSSProperties = { background: C.white, borderRadius: 14, padding: 16, border: `1px solid ${C.sand}` };
  const input: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.sand}`, fontFamily: "'DM Sans'", fontSize: 15, background: C.white, color: C.forest, boxSizing: 'border-box' };
  const label: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 700, margin: '0 0 6px' };

  return (
    <div className="ua-page" style={{ maxWidth: 600, margin: '0 auto', padding: '18px 14px 60px', fontFamily: "'DM Sans'", color: C.forest, background: C.parchment, minHeight: '100vh' }}>
      <Link href="/admin/leads" style={{ color: C.sageDark, fontSize: 14, textDecoration: 'none' }}>← Leads</Link>
      <h1 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 30, margin: '10px 0 4px' }}>Links & QR codes</h1>
      <p style={{ margin: '0 0 16px', color: C.barkLight, fontSize: 14 }}>Each place gets its own link, so you can see in Leads where every guest came from.</p>

      <div style={{ ...box, display: 'grid', gap: 14 }}>
        {pages.length > 1 && (
          <div>
            <label style={label} htmlFor="ql-page">Page</label>
            <select id="ql-page" value={pageSlug} onChange={(e) => setPageSlug(e.target.value)} style={input}>
              {pages.map((x) => <option key={x.slug} value={x.slug}>{x.slug}</option>)}
            </select>
          </div>
        )}
        <div>
          <label style={label} htmlFor="ql-place">Where will it be used?</label>
          <select id="ql-place" value={place} onChange={(e) => setPlace(e.target.value)} style={input}>
            {PLACES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
          </select>
        </div>
        <div>
          <label style={label} htmlFor="ql-name">Short name (optional)</label>
          <input id="ql-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. nov26, nimman-market, reel-oct" style={input} />
          <div style={{ fontSize: 12.5, color: C.barkLight, marginTop: 6 }}>Saved on each lead as source <strong>{src}</strong></div>
        </div>
      </div>

      {offer && (
        <div style={{ ...box, marginTop: 12, background: C.sageLight, border: 'none', fontSize: 14 }}>
          Guests from this link get: <strong>{offer.giftLine}</strong> · one use · valid {offer.validDays} days · group <strong>{offer.tag}</strong>
        </div>
      )}

      <div style={{ ...box, marginTop: 12, textAlign: 'center' }}>
        {qr && <img src={qr} alt="QR code" style={{ width: '100%', maxWidth: 280, height: 'auto' }} />}
        <div style={{ fontSize: 12.5, wordBreak: 'break-all', color: C.bark, margin: '10px 0 14px' }}>{url}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={copy} style={{ padding: '10px 18px', borderRadius: 999, border: `1.5px solid ${C.sageDark}`, background: C.white, color: C.sageDark, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
            {copied ? 'Copied ✓' : 'Copy link'}
          </button>
          {qr && (
            <a href={qr} download={`qr-${pageSlug}-${src}.png`} style={{ padding: '10px 18px', borderRadius: 999, background: C.sageDark, color: C.white, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              Download QR (PNG)
            </a>
          )}
          <a href={url} target="_blank" rel="noreferrer" style={{ padding: '10px 18px', borderRadius: 999, color: C.sageDark, fontWeight: 700, fontSize: 14 }}>Open page</a>
        </div>
      </div>
    </div>
  );
}
