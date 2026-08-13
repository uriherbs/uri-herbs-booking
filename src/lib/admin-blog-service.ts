// ============================================================
// URI HERBS WORKSHOP — Admin Blog (CMS) Service
// ============================================================
// Read/write functions for the blog content CMS (/admin/content/blog).
// Same RLS-enforced pattern as admin-content-service.ts (the workshop
// CMS) — runs under the admin's own browser session (`supabase`, not
// the service-role client), writes require an active admin_staff row.
// See migrations "create_blog_schema" (table-level "Admins manage
// blog_posts" / "...blog_post_content_blocks" ALL policies, already
// in place — no new RLS was needed for this file) and
// "add_blog_images_storage_bucket" (blog-images bucket: public read,
// admin write, mirroring workshop-images).
//
// Unlike the workshop CMS — which always edits exactly 4 fixed
// content blocks — a blog post can have any number of blocks (the
// 6 "Wellness Tips" posts have 11–18 each), so block CRUD here is
// list-shaped (create/update/delete/reorder, section 7) with
// saveBlogContentBlocks() (section 8) diffing a full editor draft
// against what was loaded and applying exactly the writes needed —
// that's what the /admin/content/blog/[slug] block editor calls.
// ============================================================

import { supabase } from './supabase';

const STORAGE_BUCKET = 'blog-images';

export type BlogPostCategory = 'workshop' | 'wellness-tips';
export type BlogContentBlockType = 'paragraph' | 'heading' | 'image' | 'quote';

export interface AdminBlogPostSummary {
  id: string;
  slug: string;
  title: string;
  category: BlogPostCategory;
  published_at: string;
  is_active: boolean;
  block_count: number;
}

export interface AdminBlogContentBlock {
  id: string;
  block_type: BlogContentBlockType;
  text_content: string | null;
  image_url: string | null;
  image_alt: string | null;
  caption: string | null;
  attribution: string | null;
  sort_order: number;
}

export interface AdminBlogPostDetail {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  published_at: string;
  read_time_minutes: number | null;
  hero_image_url: string | null;
  category: BlogPostCategory;
  is_active: boolean;
  blocks: AdminBlogContentBlock[];
}

// ────────────────────────────────────────────────────────────
// SLUGS
// ────────────────────────────────────────────────────────────

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s-]/g, '') // drop punctuation/emoji
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
    .replace(/^-+|-+$/g, '');
}

// Appends -2, -3, … until the slug is free. Excludes `excludeId` so
// re-saving a post under its own unchanged slug doesn't collide
// with itself.
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || 'post';
  let candidate = root;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase.from('blog_posts').select('id').eq('slug', candidate);
    if (excludeId) query = query.neq('id', excludeId);
    const { data, error } = await query.maybeSingle();
    if (error) throw new Error(`Failed to check slug: ${error.message}`);
    if (!data) return candidate;
    candidate = `${root}-${n++}`;
  }
}

// ────────────────────────────────────────────────────────────
// 1. LIST POSTS  (for the content list screen — every post,
//    active or not, so drafts stay visible to admins)
// ────────────────────────────────────────────────────────────

export async function listBlogPostsForAdmin(): Promise<AdminBlogPostSummary[]> {
  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, category, published_at, is_active')
    .order('published_at', { ascending: false });

  if (error) throw new Error(`Failed to load blog posts: ${error.message}`);

  const { data: blocks, error: blocksError } = await supabase
    .from('blog_post_content_blocks')
    .select('post_id');

  if (blocksError) throw new Error(`Failed to load content blocks: ${blocksError.message}`);

  const counts: Record<string, number> = {};
  (blocks ?? []).forEach((b) => {
    counts[b.post_id] = (counts[b.post_id] ?? 0) + 1;
  });

  return (posts ?? []).map((p) => ({
    ...p,
    block_count: counts[p.id] ?? 0,
  }));
}

// ────────────────────────────────────────────────────────────
// 2. GET POST DETAIL  (for the edit screen)
// ────────────────────────────────────────────────────────────

export async function getBlogPostForAdmin(slug: string): Promise<AdminBlogPostDetail | null> {
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, excerpt, published_at, read_time_minutes, hero_image_url, category, is_active')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(`Failed to load blog post: ${error.message}`);
  if (!post) return null;

  const { data: blocks, error: blocksError } = await supabase
    .from('blog_post_content_blocks')
    .select('id, block_type, text_content, image_url, image_alt, caption, attribution, sort_order')
    .eq('post_id', post.id)
    .order('sort_order');

  if (blocksError) throw new Error(`Failed to load content blocks: ${blocksError.message}`);

  return { ...post, blocks: blocks ?? [] };
}

// ────────────────────────────────────────────────────────────
// 3. CREATE POST  (the list screen's "+ New Post" button — creates
//    a bare inactive draft, then the caller navigates to the edit
//    screen for the returned slug)
// ────────────────────────────────────────────────────────────

export async function createBlogPost(title: string): Promise<{ slug: string }> {
  const trimmedTitle = title.trim() || 'Untitled Post';
  const slug = await uniqueSlug(slugify(trimmedTitle));

  const { error } = await supabase.from('blog_posts').insert({
    slug,
    title: trimmedTitle,
    category: 'wellness-tips',
    is_active: false,
  });

  if (error) throw new Error(`Failed to create blog post: ${error.message}`);
  return { slug };
}

// ────────────────────────────────────────────────────────────
// 4. UPDATE POST FIELDS  (post-level metadata only — the content
//    blocks below are a separate, list-shaped write path)
// ────────────────────────────────────────────────────────────

export interface BlogPostFieldsInput {
  title: string;
  slug: string;
  excerpt: string;
  published_at: string;
  read_time_minutes: number | null;
  hero_image_url: string | null;
  category: BlogPostCategory;
  is_active: boolean;
}

export async function updateBlogPostFields(postId: string, fields: BlogPostFieldsInput): Promise<{ slug: string }> {
  const cleanTitle = fields.title.trim() || 'Untitled Post';
  const requestedSlug = slugify(fields.slug.trim() || cleanTitle);
  const finalSlug = await uniqueSlug(requestedSlug, postId);

  const { error } = await supabase
    .from('blog_posts')
    .update({
      title: cleanTitle,
      slug: finalSlug,
      excerpt: fields.excerpt.trim() || null,
      published_at: fields.published_at,
      read_time_minutes: fields.read_time_minutes,
      hero_image_url: fields.hero_image_url,
      category: fields.category,
      is_active: fields.is_active,
    })
    .eq('id', postId);

  if (error) throw new Error(`Failed to save blog post: ${error.message}`);
  return { slug: finalSlug };
}

// ────────────────────────────────────────────────────────────
// 5. DELETE POST  (cascades to its content blocks + comments —
//    both FKs are ON DELETE CASCADE, see migration
//    "create_blog_schema")
// ────────────────────────────────────────────────────────────

export async function deleteBlogPost(postId: string): Promise<void> {
  const { error } = await supabase.from('blog_posts').delete().eq('id', postId);
  if (error) throw new Error(`Failed to delete blog post: ${error.message}`);
}

// ────────────────────────────────────────────────────────────
// 6. UPLOAD IMAGE  (hero or block image → Storage → public URL)
// ────────────────────────────────────────────────────────────
// Files are namespaced by post slug, same convention as
// uploadWorkshopImage in admin-content-service.ts.

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

export async function uploadBlogImage(file: File, postSlug: string): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG, WebP…)');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image is too large — please choose a file under 8MB');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${postSlug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ────────────────────────────────────────────────────────────
// 7. CONTENT BLOCK CRUD  (data layer — driven by
//    saveBlogContentBlocks() below, which is what the edit
//    screen's dynamic block editor actually calls)
// ────────────────────────────────────────────────────────────

export interface BlogContentBlockInput {
  block_type: BlogContentBlockType;
  text_content: string | null;
  image_url: string | null;
  image_alt: string | null;
  caption: string | null;
  attribution: string | null;
  sort_order: number;
}

export async function createBlogContentBlock(postId: string, block: BlogContentBlockInput): Promise<string> {
  const { data, error } = await supabase
    .from('blog_post_content_blocks')
    .insert({ post_id: postId, ...block })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to create content block: ${error.message}`);
  return data.id;
}

export async function updateBlogContentBlock(blockId: string, block: BlogContentBlockInput): Promise<void> {
  const { error } = await supabase.from('blog_post_content_blocks').update(block).eq('id', blockId);
  if (error) throw new Error(`Failed to update content block: ${error.message}`);
}

export async function deleteBlogContentBlock(blockId: string): Promise<void> {
  const { error } = await supabase.from('blog_post_content_blocks').delete().eq('id', blockId);
  if (error) throw new Error(`Failed to delete content block: ${error.message}`);
}

// Persists a full reordered block list in one go — writes each
// block's sort_order to match its new array index. Used by the
// reorder buttons in the block editor.
export async function reorderBlogContentBlocks(blockIds: string[]): Promise<void> {
  const results = await Promise.all(
    blockIds.map((id, index) => supabase.from('blog_post_content_blocks').update({ sort_order: index + 1 }).eq('id', id)),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(`Failed to reorder content blocks: ${failed.error.message}`);
}

// ────────────────────────────────────────────────────────────
// 8. SAVE ALL BLOCKS  (one call from the edit screen's Save
//    button — diffs the editor's current draft against what was
//    originally loaded and applies exactly the creates/updates/
//    deletes needed, then persists the final order)
// ────────────────────────────────────────────────────────────
// Mirrors saveWorkshopContent()'s "insert if id is null, update
// otherwise" idea, generalized to a variable-length list: blocks
// present in `originalBlockIds` but missing from `draftBlocks` are
// deleted (the admin removed them in the editor), everything left
// is created or updated, and the survivors' sort_order is set to
// match their final position in `draftBlocks`.

export interface DraftContentBlock {
  id: string | null; // null = added in this editing session, not yet in the DB
  block_type: BlogContentBlockType;
  text_content: string;
  image_url: string | null;
  image_alt: string;
  caption: string;
  attribution: string;
}

export async function saveBlogContentBlocks(
  postId: string,
  originalBlockIds: string[],
  draftBlocks: DraftContentBlock[],
): Promise<void> {
  const keptIds = new Set(draftBlocks.map((b) => b.id).filter((id): id is string => !!id));
  const toDelete = originalBlockIds.filter((id) => !keptIds.has(id));
  if (toDelete.length > 0) {
    await Promise.all(toDelete.map((id) => deleteBlogContentBlock(id)));
  }

  const finalIds: string[] = [];
  for (const block of draftBlocks) {
    const input: BlogContentBlockInput = {
      block_type: block.block_type,
      text_content: block.text_content.trim() || null,
      image_url: block.image_url,
      image_alt: block.image_alt.trim() || null,
      caption: block.caption.trim() || null,
      attribution: block.attribution.trim() || null,
      sort_order: 0, // real value written by reorderBlogContentBlocks below
    };
    if (block.id) {
      await updateBlogContentBlock(block.id, input);
      finalIds.push(block.id);
    } else {
      finalIds.push(await createBlogContentBlock(postId, input));
    }
  }

  await reorderBlogContentBlocks(finalIds);
}
