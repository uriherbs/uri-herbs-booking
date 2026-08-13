// ============================================================
// src/components/blog/PostContent.tsx
// ============================================================
// Renders a post's ordered content_blocks (paragraph/heading/image/
// quote) — the body of /blog/[slug]. Ported from the mockup's
// components/blog/post-content.tsx (Tailwind classes) to plain
// inline styles + src/lib/theme.ts, matching every other page here.
// ============================================================

import type { BlogPostContentBlock } from '@/lib/blog-content-service';
import { C, FONT_BODY } from '@/lib/theme';

export function PostContent({ blocks }: { blocks: BlogPostContentBlock[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {blocks.map((block) => {
        switch (block.block_type) {
          case 'heading':
            return (
              <h2
                key={block.id}
                style={{ margin: '8px 0 0', fontFamily: "'Crimson Pro', serif", fontWeight: 700, fontSize: 24, color: C.forest }}
              >
                {block.text_content}
              </h2>
            );
          case 'paragraph':
            return (
              <p key={block.id} style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 16, lineHeight: 1.75, color: C.bark }}>
                {block.text_content}
              </p>
            );
          case 'quote':
            return (
              <blockquote
                key={block.id}
                style={{
                  margin: 0,
                  padding: '4px 0 4px 20px',
                  borderLeft: `2px solid ${C.sageDark}`,
                  fontFamily: "'Crimson Pro', serif",
                  fontStyle: 'italic',
                  fontSize: 19,
                  lineHeight: 1.6,
                  color: C.forest,
                }}
              >
                {block.text_content}
                {block.attribution && (
                  <footer style={{ marginTop: 8, fontFamily: FONT_BODY, fontStyle: 'normal', fontWeight: 600, fontSize: 13, color: C.barkLight }}>
                    — {block.attribution}
                  </footer>
                )}
              </blockquote>
            );
          case 'image':
            return (
              <figure key={block.id} style={{ margin: '4px 0' }}>
                <div style={{ borderRadius: 20, overflow: 'hidden' }}>
                  <img
                    src={block.image_url ?? undefined}
                    alt={block.image_alt ?? ''}
                    style={{ display: 'block', width: '100%', objectFit: 'cover' }}
                  />
                </div>
                {block.caption && (
                  <figcaption style={{ marginTop: 8, textAlign: 'center', fontFamily: FONT_BODY, fontSize: 13, color: C.barkLight }}>
                    {block.caption}
                  </figcaption>
                )}
              </figure>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
