// ============================================================
// src/app/blog/page.tsx
// ============================================================
// Post-list page. Replaces the old static "Our Blog is Brewing"
// placeholder now that a real /blog exists. Pulls all posts from
// Supabase via getActiveBlogPosts() — same pattern as WorkshopCircles
// pulling from getActiveWorkshopSummaries.
//
// Posts render as one continuous grid — the original 4 workshop-
// focused posts, followed by the "Wellness Tips" batch transcribed
// from the old uriherbs.com/blog (migration
// "add_wellness_tips_blog_posts") — rather than two separately-
// headed grids. Two grids left an orphaned last row for the 4-post
// workshop group (1 card + 2 empty cells in the 3-column layout)
// before a big section break; one grid lets the next post in line
// flow straight into those empty cells instead. Each card still
// carries its own category label (PostCard's "Workshop Story" /
// "Wellness Tip" meta text) so the two kinds of post stay
// distinguishable without a hard visual break between them.
// ============================================================

import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { PostCard } from '@/components/blog/PostCard';
import { getActiveBlogPosts } from '@/lib/blog-content-service';
import { C, FONT_DISPLAY, FONT_BODY, FONT_IMPORT } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Blog — Uri Herbs Workshop',
  description:
    'Stories from the workshop and wellness tips from the garden — notes on Thai herbal tea, ya dom, natural skincare, aloe vera, castor oil, and more from Uri Herbs Workshop in Chiang Mai.',
};

export default async function BlogPage() {
  let posts: Awaited<ReturnType<typeof getActiveBlogPosts>> = [];
  try {
    posts = await getActiveBlogPosts();
  } catch (err) {
    console.error('BlogPage: failed to load posts', err);
  }

  // Workshop posts first, then wellness-tips — same grouping the two
  // sections used to enforce, just flowing through one grid now
  // instead of breaking into a second header + grid.
  const orderedPosts = [
    ...posts.filter((p) => p.category === 'workshop'),
    ...posts.filter((p) => p.category === 'wellness-tips'),
  ];

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
            Stories from the Garden
          </h1>
          <p style={{ margin: '12px 0 0', fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.6, color: C.barkLight }}>
            Notes on Thai herbal tradition — from what we make by hand in the workshop, to wellness tips for home.
          </p>
        </div>

        {orderedPosts.length === 0 ? (
          <p style={{ marginTop: 56, textAlign: 'center', fontFamily: FONT_BODY, fontSize: 15, color: C.barkLight }}>
            No stories posted yet — check back soon.
          </p>
        ) : (
          <div className="blog-grid" style={{ marginTop: 48 }}>
            {orderedPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
