// ============================================================
// URI HERBS WORKSHOP — Admin Content (CMS) Service
// ============================================================
// Read/write functions for the workshop content CMS (Mali's
// screen for editing the public /workshops/[slug] pages).
//
// Runs under the admin's own browser session (RLS-enforced, not
// the service-role client) — writes require an active admin_staff
// row, same as the rest of the admin dashboard. See migration
// "add_workshop_cms_write_access" for the policies this relies on:
//   - "Admins manage workshops" (UPDATE, workshops)
//   - "Admins manage workshop_content_blocks" (ALL, already existed)
//   - workshop-images storage bucket (public read, admin write)
// ============================================================

import { supabase } from './supabase';

const BLOCK_COUNT = 4;
const STORAGE_BUCKET = 'workshop-images';

export interface AdminContentBlock {
  id: string | null;        // null = not yet created in the DB
  title: string;
  body: string;
  image_url: string | null;
  sort_order: number;
}

export interface AdminWorkshopSummary {
  id: string;
  name: string;
  slug: string;
  hero_image_url: string | null;
  block_count: number;
  has_intro: boolean;
}

export interface AdminWorkshopDetail {
  id: string;
  name: string;
  slug: string;
  intro_paragraph: string | null;
  hero_image_url: string | null;
  blocks: AdminContentBlock[];   // always exactly BLOCK_COUNT, padded with empty placeholders
}


// ────────────────────────────────────────────────────────────
// 1. LIST WORKSHOPS  (for the content list screen)
// ────────────────────────────────────────────────────────────
// One row per active workshop, with a content-completeness count
// so the list can flag workshops that still need copy (e.g. a
// newly added workshop with 0 content blocks).

export async function listWorkshopsForAdmin(): Promise<AdminWorkshopSummary[]> {
  const { data: workshops, error } = await supabase
    .from('workshops')
    .select('id, name, slug, hero_image_url, intro_paragraph, sort_order')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw new Error(`Failed to load workshops: ${error.message}`);

  const { data: blocks, error: blocksError } = await supabase
    .from('workshop_content_blocks')
    .select('workshop_id');

  if (blocksError) throw new Error(`Failed to load content blocks: ${blocksError.message}`);

  const counts: Record<string, number> = {};
  (blocks ?? []).forEach((b) => {
    counts[b.workshop_id] = (counts[b.workshop_id] ?? 0) + 1;
  });

  return (workshops ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    hero_image_url: w.hero_image_url,
    block_count: counts[w.id] ?? 0,
    has_intro: !!w.intro_paragraph,
  }));
}


// ────────────────────────────────────────────────────────────
// 2. GET WORKSHOP DETAIL  (for the edit screen)
// ────────────────────────────────────────────────────────────
// Always returns exactly BLOCK_COUNT block slots, padding with
// empty (unsaved) placeholders if the workshop has fewer than 4
// rows yet — the edit screen always shows 4 block editors.

export async function getWorkshopForAdmin(slug: string): Promise<AdminWorkshopDetail | null> {
  const { data: workshop, error } = await supabase
    .from('workshops')
    .select('id, name, slug, intro_paragraph, hero_image_url')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw new Error(`Failed to load workshop: ${error.message}`);
  if (!workshop) return null;

  const { data: blocks, error: blocksError } = await supabase
    .from('workshop_content_blocks')
    .select('id, title, body, image_url, sort_order')
    .eq('workshop_id', workshop.id)
    .order('sort_order');

  if (blocksError) throw new Error(`Failed to load content blocks: ${blocksError.message}`);

  const padded: AdminContentBlock[] = [];
  for (let i = 0; i < BLOCK_COUNT; i++) {
    const existing = (blocks ?? [])[i];
    padded.push(
      existing
        ? {
            id: existing.id,
            title: existing.title,
            body: existing.body,
            image_url: existing.image_url,
            sort_order: existing.sort_order,
          }
        : { id: null, title: '', body: '', image_url: null, sort_order: i + 1 }
    );
  }

  return { ...workshop, blocks: padded };
}


// ────────────────────────────────────────────────────────────
// 3. SAVE WORKSHOP CONTENT  (hero + intro + all 4 blocks, one call)
// ────────────────────────────────────────────────────────────
// Existing blocks (have an id) are updated; blocks that were
// never created (id is null) are inserted, but only if the admin
// actually typed something into them — an untouched empty slot
// stays unsaved rather than littering the table with blank rows.

export async function saveWorkshopContent(
  workshopId: string,
  fields: { intro_paragraph: string; hero_image_url: string | null },
  blocks: AdminContentBlock[]
): Promise<void> {
  const { error: workshopError } = await supabase
    .from('workshops')
    .update({
      intro_paragraph: fields.intro_paragraph.trim() || null,
      hero_image_url: fields.hero_image_url,
    })
    .eq('id', workshopId);

  if (workshopError) throw new Error(`Failed to save workshop: ${workshopError.message}`);

  for (const block of blocks) {
    if (block.id) {
      const { error } = await supabase
        .from('workshop_content_blocks')
        .update({
          title: block.title.trim(),
          body: block.body.trim(),
          image_url: block.image_url,
          sort_order: block.sort_order,
        })
        .eq('id', block.id);
      if (error) throw new Error(`Failed to save content block: ${error.message}`);
    } else if (block.title.trim() || block.body.trim() || block.image_url) {
      const { error } = await supabase.from('workshop_content_blocks').insert({
        workshop_id: workshopId,
        title: block.title.trim(),
        body: block.body.trim(),
        image_url: block.image_url,
        sort_order: block.sort_order,
      });
      if (error) throw new Error(`Failed to create content block: ${error.message}`);
    }
  }
}


// ────────────────────────────────────────────────────────────
// 4. UPLOAD IMAGE  (hero or block image → Storage → public URL)
// ────────────────────────────────────────────────────────────
// Files are namespaced by workshop slug so it's obvious in the
// Supabase dashboard which workshop an image belongs to.

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

export async function uploadWorkshopImage(file: File, workshopSlug: string): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file (JPG, PNG, WebP…)');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error('Image is too large — please choose a file under 8MB');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${workshopSlug}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
