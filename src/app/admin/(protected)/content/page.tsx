// ============================================================
// src/app/admin/(protected)/content/page.tsx
// ============================================================
// Workshop Content (CMS) — list screen. One card per active
// workshop; tapping a card opens /admin/content/[slug] for
// editing. Design matches AdminDashboard.tsx exactly (same
// color tokens, fonts, mobile-first 600px container).
// ============================================================

'use client';

import Link from 'next/link';
import { useAdminWorkshopList } from '@/lib/hooks';

const C = {
  sage: '#6B8F71',
  sageDark: '#4A7050',
  sageLight: '#E7EFEA',
  sagePale: '#F2F7F3',
  forest: '#2D4639',
  parchment: '#F5F2EC',
  white: '#FFFFFF',
  gold: '#A89068',
  goldLight: '#F5F0E5',
  bark: '#5C4A3D',
  barkLight: '#8A7668',
  sand: '#E8E2D8',
  mist: '#F0EDE6',
  coral: '#C07A6E',
};

function LeafIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="#fff" opacity="0.9">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22.5C7.76 17.66 9.41 12.67 18 11.18V14C21.78 10.58 20 2 20 2S13.21 4.58 17 8Z" />
    </svg>
  );
}

function ImagePlaceholderIcon({ color = C.barkLight }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M21 15l-5-5-11 9" />
    </svg>
  );
}

export default function WorkshopContentListPage() {
  const { workshops, loading, error, refresh } = useAdminWorkshopList();

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.parchment, fontFamily: "'DM Sans', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url(https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap);
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        button:active { transform: scale(0.98); }
        a { text-decoration: none; }
      ` }} />

      <div style={{ background: C.forest, padding: '18px 16px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <LeafIcon />
        <span style={{ fontFamily: "'Crimson Pro'", fontSize: 19, fontWeight: 700, color: C.white }}>Uri Herbs Admin</span>
      </div>

      <div style={{ background: C.white, borderBottom: `1px solid ${C.sand}`, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/admin" aria-label="Back to dashboard" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8, background: C.sagePale, flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <div>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 700, color: C.forest }}>Workshop Content</div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 11.5, color: C.barkLight }}>
            {loading ? 'Loading…' : `${workshops.length} workshop${workshops.length === 1 ? '' : 's'} · tap to edit`}
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          margin: '12px 16px 0', padding: '10px 14px', borderRadius: 10,
          background: '#FFF5F3', border: '1px solid rgba(192,122,110,0.3)',
          fontFamily: "'DM Sans'", fontSize: 13, color: C.coral,
        }}>
          Couldn't load workshops: {error}.{' '}
          <button onClick={refresh} style={{ color: C.coral, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}>Retry</button>
        </div>
      )}

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', fontFamily: "'DM Sans'", fontSize: 14, color: C.barkLight }}>Loading workshops…</div>
        ) : (
          workshops.map((w) => {
            const isComplete = w.block_count >= 4 && w.has_intro;
            return (
              <Link key={w.id} href={`/admin/content/${w.slug}`} style={{
                background: C.white,
                border: `1px solid ${isComplete ? C.sand : '#E0C89A'}`,
                borderRadius: 14, padding: 12,
                display: 'flex', gap: 13, alignItems: 'center',
              }}>
                <div style={{
                  width: 62, height: 62, borderRadius: 10, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: w.hero_image_url
                    ? 'linear-gradient(135deg, #EDE7D3 0%, #E7EFEA 55%, #DCE8DD 100%)'
                    : C.mist,
                  border: w.hero_image_url ? 'none' : `1.5px dashed ${C.sand}`,
                }}>
                  <ImagePlaceholderIcon color={w.hero_image_url ? C.sage : C.barkLight} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontFamily: "'Crimson Pro'", fontSize: 16, fontWeight: 700, color: C.forest,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>{w.name}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 11, color: C.barkLight, marginTop: 1 }}>{w.slug}</div>
                  <div style={{ marginTop: 7 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600,
                      padding: '3px 9px', borderRadius: 20,
                      background: isComplete ? C.sageLight : C.goldLight,
                      color: isComplete ? C.sageDark : '#8A6A2E',
                    }}>
                      {isComplete ? `✓ ${w.block_count} blocks · complete` : w.block_count === 0 ? '● not started yet' : `${w.block_count}/4 blocks · in progress`}
                    </span>
                  </div>
                </div>
                <div style={{ flexShrink: 0, opacity: 0.5 }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.bark} strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
