// ============================================================
// src/app/blog/[slug]/page.tsx
// ============================================================
// Single blog post page — back link, eyebrow+title+date/read-time
// meta, LeafFrame hero, content-block body, share buttons, related
// posts, and a comments section at the bottom. Layout/typography
// matches /workshops/[slug] (same "magazine page" language), which
// itself was ported from the uri-herbs-v0-design mockup's
// app/blog/[slug]/page.tsx — so this page is the closest thing this
// project has to a 1:1 port of that mockup page, just backed by
// Supabase (getBlogPostBySlug) instead of a hardcoded array.
//
// Structure-only pass: real post content comes in a separate
// follow-up (new DB rows) — nothing here needs to change for that.
// ============================================================

import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getBlogPostBySlug, getRelatedBlogPosts, formatPostDate, getCategoryLabel } from '@/lib/blog-content-service';
import SiteHeader from '@/components/SiteHeader';
import { LeafFrame } from '@/components/LeafFrame';
import { PostContent } from '@/components/blog/PostContent';
import { PostCard } from '@/components/blog/PostCard';
import { ShareButtons } from '@/components/blog/ShareButtons';
import { CommentsSection } from '@/components/blog/CommentsSection';
import { C, FONT_DISPLAY, FONT_BODY, FONT_IMPORT } from '@/lib/theme';

// Same production domain already used for outbound links elsewhere
// (see SHOP_WEBSITE in src/lib/notifications.ts) — kept local here
// since it's only needed to build the absolute share URL below.
const SITE_URL = 'https://www.uriherbs.com';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getBlogPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: `${post.title} — Uri Herbs Workshop`,
    description: post.excerpt || undefined,
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getBlogPostBySlug(params.slug);
  if (!post) notFound();

  const relatedPosts = await getRelatedBlogPosts(post.slug, post.category);

  return (
    <div style={{ background: C.parchment, minHeight: '100vh' }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            ${FONT_IMPORT}
            * { box-sizing: border-box; }
            .related-grid { display: grid; grid-template-columns: 1fr; gap: 20px 24px; }
            @media (min-width: 620px) { .related-grid { grid-template-columns: 1fr 1fr; } }
            @media (min-width: 940px) { .related-grid { grid-template-columns: repeat(3, 1fr); } }
          `,
        }}
      />

      <SiteHeader />

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>
        <Link
          href="/blog"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: FONT_BODY,
            fontSize: 14,
            fontWeight: 600,
            color: C.barkLight,
            textDecoration: 'none',
          }}
        >
          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Blog
        </Link>

        <div style={{ marginTop: 24 }}>
          <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.gold }}>
            {post.category === 'wellness-tips' ? 'Wellness Tips' : 'From the Garden'}
          </p>
          <h1 style={{ margin: '8px 0 0', fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(28px,5vw,40px)', color: C.forest, lineHeight: 1.15 }}>
            {post.title}
          </h1>
          <p style={{ margin: '10px 0 0', fontFamily: FONT_BODY, fontSize: 14, color: C.barkLight }}>
            {formatPostDate(post.published_at)}
            {post.read_time_minutes ? ` · ${post.read_time_minutes} min read` : ''}
          </p>
        </div>

        <div style={{ marginTop: 32 }}>
          <LeafFrame style={{ width: '100%', display: 'block' }}>
            <div style={{ position: 'relative', aspectRatio: '16 / 10', overflow: 'hidden' }}>
              <img
                src={post.hero_image_url ?? undefined}
                alt={post.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </LeafFrame>
        </div>

        <article style={{ marginTop: 40 }}>
          <PostContent blocks={post.content_blocks} />
        </article>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${C.sand}` }}>
          <ShareButtons title={post.title} url={`${SITE_URL}/blog/${post.slug}`} />
        </div>

        {relatedPosts.length > 0 && (
          <section style={{ marginTop: 56, paddingTop: 44, borderTop: `1px solid ${C.sand}` }}>
            <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: C.forest }}>
              You might also like
            </h2>
            <div className="related-grid" style={{ marginTop: 28 }}>
              {relatedPosts.map((related) => (
                <PostCard key={related.id} post={related} />
              ))}
            </div>
          </section>
        )}

        <CommentsSection postSlug={post.slug} />
      </main>
    </div>
  );
}
