// ============================================================
// src/app/blog/page.tsx
// ============================================================
// Post-list page. Replaces the old static "Our Blog is Brewing"
// placeholder now that a real /blog exists. Pulls all posts from
// Supabase via getActiveBlogPosts() — same pattern as WorkshopCircles
// pulling from getActiveWorkshopSummaries — then splits them into two
// sections by `category`: the original 4 workshop-focused posts, and
// a second "Wellness Tips" batch transcribed from the old
// uriherbs.com/blog (migration "add_wellness_tips_blog_posts"). Kept
// as two grids instead of one interleaved-by-date list so the two
// very different kinds of post (workshop recaps vs. general wellness
// notes) each read as their own clear section.
// ============================================================

import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import { PostCard } from '@/components/blog/PostCard';
import { getActiveBlogPosts, type BlogPostSummary } from '@/lib/blog-content-service';
import { C, FONT_DISPLAY, FONT_BODY, FONT_IMPORT } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Blog — Uri Herbs Workshop',
  description:
    'Stories from the workshop and wellness tips from the garden — notes on Thai herbal tea, ya dom, natural skincare, aloe vera, castor oil, and more from Uri Herbs Workshop in Chiang Mai.',
};

function PostGrid({ posts }: { posts: BlogPostSummary[] }) {
  return (
    <div className="blog-grid">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

export default async function BlogPage() {
  let posts: Awaited<ReturnType<typeof getActiveBlogPosts>> = [];
  try {
    posts = await getActiveBlogPosts();
  } catch (err) {
    console.error('BlogPage: failed to load posts', err);
  }

  const workshopPosts = posts.filter((p) => p.category === 'workshop');
  const wellnessPosts = posts.filter((p) => p.category === 'wellness-tips');

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

        {posts.length === 0 ? (
          <p style={{ marginTop: 56, textAlign: 'center', fontFamily: FONT_BODY, fontSize: 15, color: C.barkLight }}>
            No stories posted yet — check back soon.
          </p>
        ) : (
          <>
            {workshopPosts.length > 0 && (
              <section style={{ marginTop: 48 }}>
                <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: C.forest }}>
                  Workshop Stories
                </h2>
                <div style={{ marginTop: 24 }}>
                  <PostGrid posts={workshopPosts} />
                </div>
              </section>
            )}

            {wellnessPosts.length > 0 && (
              <section style={{ marginTop: 56, paddingTop: 44, borderTop: workshopPosts.length > 0 ? `1px solid ${C.sand}` : undefined }}>
                <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: C.forest }}>
                  Wellness Tips
                </h2>
                <p style={{ margin: '8px 0 0', fontFamily: FONT_BODY, fontSize: 14, color: C.barkLight }}>
                  Practical natural-health notes from the Uri Herbs garden.
                </p>
                <div style={{ marginTop: 24 }}>
                  <PostGrid posts={wellnessPosts} />
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
