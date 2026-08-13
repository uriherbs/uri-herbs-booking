// ============================================================
// URI HERBS WORKSHOP -- Blog Content Service
// ============================================================
// Server-safe reads for the public /blog list + /blog/[slug] pages.
// Same pattern as workshop-content-service.ts: a plain, cookie-free
// Supabase client, since this data is 100% public (RLS: "Public read
// blog_posts" / "...content_blocks" are USING(true) / is_active),
// so it's safe to call straight from a Server Component.
//
// Structure only in this pass — the 4 posts currently in the DB are
// the same placeholder copy carried over from the uri-herbs-v0-design
// mockup (lib/blog/posts.ts there). Real post content from the live
// uriherbs.com blog gets swapped in as a separate content pass later
// (just new rows in blog_posts/blog_post_content_blocks — no code
// here needs to change for that).
// ============================================================

import { createClient } from '@supabase/supabase-js';

const publicClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

export type BlogContentBlockType = 'paragraph' | 'heading' | 'image' | 'quote';

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
}

export interface BlogPostData extends BlogPostSummary {
      content_blocks: BlogPostContentBlock[];
}

const SUMMARY_COLUMNS = 'id, slug, title, excerpt, published_at, read_time_minutes, hero_image_url';

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

// "You might also like" — other active posts, newest first, capped
// at `count`. No real relatedness signal (tags/category) yet, so
// this is "everything else" rather than a topical match; revisit
// once posts carry a category.
export async function getRelatedBlogPosts(slug: string, count = 3): Promise<BlogPostSummary[]> {
      const { data, error } = await publicClient
        .from('blog_posts')
        .select(SUMMARY_COLUMNS)
        .eq('is_active', true)
        .neq('slug', slug)
        .order('published_at', { ascending: false })
        .limit(count);

  if (error) throw new Error(`Failed to load related posts: ${error.message}`);
      return data ?? [];
}

export function formatPostDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoDate));
}
