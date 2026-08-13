// ============================================================
// src/components/blog/PostCard.tsx
// ============================================================
// Card used on both /blog (the full grid) and the "You might also
// like" related-posts strip at the bottom of /blog/[slug]. Same
// shape as the workshop cards in home/WorkshopCircles.tsx — a
// LeafFrame-wrapped photo over a title + excerpt + "Read more".
// ============================================================

import Link from 'next/link';
import { LeafFrame } from '@/components/LeafFrame';
import { C, FONT_DISPLAY, FONT_BODY } from '@/lib/theme';
import { formatPostDate, getCategoryLabel, type BlogPostSummary } from '@/lib/blog-content-service';

const ArrowUpRightSVG = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L17 7M7 7h10v10" />
  </svg>
);

export function PostCard({ post }: { post: BlogPostSummary }) {
  return (
    <Link href={`/blog/${post.slug}`} aria-label={post.title} className="post-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', textDecoration: 'none' }}>
      <style dangerouslySetInnerHTML={{ __html: `.post-card:hover .post-card-img { transform: scale(1.04); } .post-card:hover .post-card-cta { color: ${C.sageDark}; }` }} />

      <LeafFrame style={{ width: '100%' }} leafSize={40}>
        <div style={{ position: 'relative', aspectRatio: '4 / 3', overflow: 'hidden' }}>
          <img
            src={post.hero_image_url ?? undefined}
            alt={post.title}
            className="post-card-img"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
          />
        </div>
      </LeafFrame>

      <div style={{ display: 'flex', flex: 1, flexDirection: 'column', padding: '4px 4px 0' }}>
        <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: C.barkLight }}>
          {getCategoryLabel(post.category)} · {formatPostDate(post.published_at)}
        </p>
        <h3 style={{ margin: '8px 0 0', fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 19, lineHeight: 1.3, color: C.forest }}>
          {post.title}
        </h3>
        {post.excerpt && (
          <p
            style={{
              margin: '8px 0 0',
              fontFamily: FONT_BODY,
              fontSize: 14,
              lineHeight: 1.6,
              color: C.bark,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {post.excerpt}
          </p>
        )}
        <span
          className="post-card-cta"
          style={{
            marginTop: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: FONT_BODY,
            fontSize: 13,
            fontWeight: 700,
            color: C.sage,
            transition: 'color 0.15s ease',
          }}
        >
          Read more <ArrowUpRightSVG />
        </span>
      </div>
    </Link>
  );
}
