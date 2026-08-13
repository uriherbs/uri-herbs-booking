// ============================================================
// src/app/admin/(protected)/content/blog/page.tsx
// ============================================================
// Blog Content (CMS) — list screen. One row per blog post
// (active or draft); tapping a row opens /admin/content/blog/[slug]
// for editing. "+ New Post" creates a bare draft and jumps straight
// into the edit screen — same quick-draft pattern as most blog CMSes,
// avoids a separate "new post" form for just a title.
//
// Sibling to /admin/content (the workshop CMS list) — same design
// language (color tokens, fonts, mobile-first 600px container) but
// its own screen rather than a tab, since blog posts have their own
// status concept (is_active = draft vs. published) that workshops
// don't.
// ============================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAdminBlogList } from '@/lib/hooks';
import { createBlogPost } from '@/lib/admin-blog-service';

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

function PlusIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function categoryLabel(category: string) {
  return category === 'wellness-tips' ? 'Wellness Tip' : 'Workshop Story';
}

export default function BlogContentListPage() {
  const { posts, loading, error, refresh } = useAdminBlogList();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const handleNewPost = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const { slug } = await createBlogPost('Untitled Post');
      router.push(`/admin/content/blog/${slug}`);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create post');
      setCreating(false);
    }
  };

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
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 700, color: C.forest }}>Blog Content</div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 11.5, color: C.barkLight }}>
            {loading ? 'Loading…' : `${posts.length} post${posts.length === 1 ? '' : 's'} · tap to edit`}
          </div>
        </div>
        <button
          onClick={handleNewPost}
          disabled={creating}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            background: C.sageDark, border: 'none', borderRadius: 9,
            padding: '9px 13px', cursor: creating ? 'default' : 'pointer', opacity: creating ? 0.7 : 1,
            fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, color: C.white,
          }}
        >
          <PlusIcon /> {creating ? 'Creating…' : 'New Post'}
        </button>
      </div>

      {(error || createError) && (
        <div style={{
          margin: '12px 16px 0', padding: '10px 14px', borderRadius: 10,
          background: '#FFF5F3', border: '1px solid rgba(192,122,110,0.3)',
          fontFamily: "'DM Sans'", fontSize: 13, color: C.coral,
        }}>
          {createError ? `Couldn't create post: ${createError}.` : `Couldn't load posts: ${error}.`}{' '}
          {!createError && (
            <button onClick={refresh} style={{ color: C.coral, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}>Retry</button>
          )}
        </div>
      )}

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', fontFamily: "'DM Sans'", fontSize: 14, color: C.barkLight }}>Loading posts…</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', fontFamily: "'DM Sans'", fontSize: 14, color: C.barkLight }}>
            No posts yet — tap "New Post" to write the first one.
          </div>
        ) : (
          posts.map((p) => (
            <Link key={p.id} href={`/admin/content/blog/${p.slug}`} style={{
              background: C.white,
              border: `1px solid ${p.is_active ? C.sand : '#E0C89A'}`,
              borderRadius: 14, padding: 12,
              display: 'flex', gap: 13, alignItems: 'center',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Crimson Pro'", fontSize: 16, fontWeight: 700, color: C.forest,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{p.title}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 11, color: C.barkLight, marginTop: 1 }}>{p.slug}</div>
                <div style={{ marginTop: 7, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600,
                    padding: '3px 9px', borderRadius: 20,
                    background: p.is_active ? C.sageLight : C.goldLight,
                    color: p.is_active ? C.sageDark : '#8A6A2E',
                  }}>
                    {p.is_active ? '✓ Published' : '● Draft'}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600,
                    padding: '3px 9px', borderRadius: 20,
                    background: C.mist, color: C.barkLight,
                  }}>
                    {categoryLabel(p.category)}
                  </span>
                  <span style={{
                    fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600,
                    padding: '3px 2px', color: C.barkLight,
                  }}>
                    {p.block_count} block{p.block_count === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
              <div style={{ flexShrink: 0, opacity: 0.5 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.bark} strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
