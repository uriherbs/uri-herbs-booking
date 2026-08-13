// ============================================================
// URI HERBS WORKSHOP -- Blog Content Service
// ============================================================
// Server-safe reads for the public /blog list + /blog/[slug] pages.
// Same pattern as workshop-content-service.ts: a plain, cookie-free
// Supabase client, since this data is 100% public (RLS: "Public read
// blog_posts" / "...content_blocks" are USING(true) / is_active),
// so it's safe to call straight from a Server Component.
//
// The first 4 posts were placeholder copy carried over from the
// uri-herbs-v0-design mockup (lib/blog/posts.ts there); a `category`
// column (migration "add_wellness_tips_blog_posts") now separates
// those workshop-focused posts from a second batch of real posts
// transcribed from the old uriherbs.com/blog — tagged 'wellness-tips'
// so /blog can group them into their own section instead of
// interleaving two very different kinds of post by date alone.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const publicClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

export type BlogContentBlockType = 'paragraph' | 'heading' | 'image' | 'quote';
export type BlogPostCategory = 'workshop' | 'wellness-tips';

export interface BlogPostContentBlock {
      id: string;
      block_type: BlogContentBlockType;
      text_content: string | null;
      image_url: string | null;
      image_alt: string | null;
      caption: string | null;
      attribution: string | null;
      sort_order: number;
}

export interface BlogPostSummary {
      id: string;
      slug: string;
      title: string;
      excerpt: string | null;
      published_at: string;
      read_time_minutes: number | null;
      hero_image_url: string | null;
      category: BlogPostCategory;
}

export interface BlogPostData extends BlogPostSummary {
      content_blocks: BlogPostContentBlock[];
}

const SUMMARY_COLUMNS = 'id, slug, title, excerpt, published_at, read_time_minutes, hero_image_url, category';

// Small display label for a post's category — used by PostCard's
// meta line and the [slug] page's eyebrow.
export function getCategoryLabel(category: BlogPostCategory): string {
  return category === 'wellness-tips' ? 'Wellness Tip' : 'Workshop Story';
}

// Listing used by /blog — newest first, matches the ordering already
// used for post cards in the uri-herbs-v0-design mockup.
export async function getActiveBlogPosts(): Promise<BlogPostSummary[]> {
      const { data, error } = await publicClient
        .from('blog_posts')
        .select(SUMMARY_COLUMNS)
        .eq('is_active', true)
        .order('published_at', { ascending: false });

  if (error) throw new Error(`Failed to load blog posts: ${error.message}`);
      return data ?? [];
}

// Returns null if no post matches the slug (caller should 404).
export async function getBlogPostBySlug(slug: string): Promise<BlogPostData | null> {
      const { data: post, error } = await publicClient
        .from('blog_posts')
        .select(SUMMARY_COLUMNS)
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

  if (error) throw new Error(`Failed to load blog post: ${error.message}`);
      if (!post) return null;

  const { data: blocks, error: blocksError } = await publicClient
        .from('blog_post_content_blocks')
        .select('id, block_type, text_content, image_url, image_alt, caption, attribution, sort_order')
        .eq('post_id', post.id)
        .order('sort_order');

  if (blocksError) throw new Error(`Failed to load blog post content: ${blocksError.message}`);

  return { ...post, content_blocks: blocks ?? [] };
}

// "You might also like" — same-category posts first (newest first),
// topped up with other active posts if the category doesn't have
// enough on its own, capped at `count`. Pass the current post's own
// category so a wellness-tips post surfaces other wellness-tips
// posts before workshop posts, and vice versa.
export async function getRelatedBlogPosts(
  slug: string,
  category?: BlogPostCategory,
  count = 3,
): Promise<BlogPostSummary[]> {
      const relate = (others: BlogPostSummary[]) => {
        if (!category) return others.slice(0, count);
        const sameCategory = others.filter((p) => p.category === category);
        const rest = others.filter((p) => p.category !== category);
        return [...sameCategory, ...rest].slice(0, count);
      };

      const { data, error } = await publicClient
        .from('blog_posts')
        .select(SUMMARY_COLUMNS)
        .eq('is_active', true)
        .neq('slug', slug)
        .order('published_at', { ascending: false });

  if (error) throw new Error(`Failed to load related posts: ${error.message}`);
      return relate(data ?? []);
}

export function formatPostDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoDate));
}
