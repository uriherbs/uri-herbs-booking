// ============================================================
// src/app/blog/page.tsx
// ============================================================
// Placeholder so the "Blog" nav link (see SiteHeader) has
// somewhere real to go instead of 404ing. Swap this file's
// content for actual posts whenever the blog is ready — nothing
// else references this page.
// ============================================================

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';

const C = {
  sage: '#6B8F71',
  forest: '#2D4639',
  parchment: '#F8F5EF',
  white: '#FFFFFF',
  gold: '#A89068',
  bark: '#5C4A3D',
  barkLight: '#8A7668',
};

export default function BlogPage() {
  return (
    <div style={{ background: C.parchment, minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@700&family=DM+Sans:wght@400;600;700&display=swap');
        a { text-decoration: none; }
      `}</style>

      <SiteHeader />

      <div style={{
        maxWidth: 560, margin: '0 auto', minHeight: 'calc(100vh - 65px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '60px 24px',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🌿</div>
        <h1 style={{ fontFamily: "'Crimson Pro'", fontSize: 'clamp(28px,5vw,38px)', fontWeight: 700, color: C.forest, margin: '0 0 14px' }}>
          Our Blog is Brewing
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.7, color: C.bark, margin: '0 0 32px' }}>
          We're writing up stories from the workshop — Thai herbal traditions, seasonal ingredients,
          and behind-the-scenes from Chiang Mai Old City. Check back soon.
        </p>
        <Link href="/book" style={{
          background: C.sage, color: '#fff', padding: '14px 28px',
          borderRadius: 12, fontWeight: 700, fontSize: 15,
        }}>
          Book a Workshop Instead
        </Link>
      </div>
    </div>
  );
}
