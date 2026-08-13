// ============================================================
// src/app/blog/page.tsx
// ============================================================
// Post-list page. Replaces the old static "Our Blog is Brewing"
// placeholder now that a real (if content-placeholder) /blog exists.
// Pulls the 4 posts from Supabase via getActiveBlogPosts() — same
// pattern as WorkshopCircles pulling from getActiveWorkshopSummaries.
//
// Structure-only pass: the 4 posts currently in the DB are the same
// placeholder copy carried over from the uri-herbs-v0-design mockup.
// Real post content comes in a separate follow-up (new DB rows only
// — this page doesn't change for that).
// ============================================================

import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import { PostCard } from '@/components/blog/PostCard';
import { getActiveBlogPosts } from '@/lib/blog-content-service';
import { C, FONT_DISPLAY, FONT_BODY, FONT_IMPORT } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Blog — Uri Herbs Workshop',
  description:
    'Stories from the workshop — notes on Thai herbal tea, ya dom, natural skincare, and herbal massage balms from Uri Herbs Workshop in Chiang Mai.',
};

export default async function BlogPage() {
  let posts: Awaited<ReturnType<typeof getActiveBlogPosts>> = [];
  try {
    posts = await getActiveBlogPosts();
  } catch (err) {
    console.error('BlogPage: failed to load posts', err);
  }

  return (
    <div style={{ background: C.parchment, minHeight: '100vh' }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            ${FONT_IMPORT}
            * { box-sizing: border-box; }
            .blog-grid { display: grid; grid-template-columns: 1fr; gap: 20px 24px; }
            @media (min-width: 620px) { .blog-grid { grid-template-columns: 1fr 1fr; } }
            @media (min-width: 940px) { .blog-grid { grid-template-columns: repeat(3, 1fr); } }
          `,
        }}
      />

      <SiteHeader />

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 20px 80px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.gold }}>
            From the Garden
          </p>
          <h1 style={{ margin: '8px 0 0', fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(30px,5vw,42px)', color: C.forest, lineHeight: 1.1 }}>
            Stories from the Workshop
          </h1>
          <p style={{ margin: '12px 0 0', fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.6, color: C.barkLight }}>
            Notes on Thai herbal tradition, and what actually goes into the things we make by hand.
          </p>
        </div>

        {posts.length === 0 ? (
          <p style={{ marginTop: 56, textAlign: 'center', fontFamily: FONT_BODY, fontSize: 15, color: C.barkLight }}>
            No stories posted yet — check back soon.
          </p>
        ) : (
          <div className="blog-grid" style={{ marginTop: 48 }}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
