// ============================================================
// URI HERBS WORKSHOP -- Workshop Content Page Service
// ============================================================
// Server-safe reads for the public magazine-style workshop pages
// (Section 3 of the spec). Deliberately uses a plain, cookie-free
// Supabase client -- this data is 100% public (RLS: "Public read
// workshops" / "...content_blocks" / "...gallery" all USING(true)),
// so there's no session to carry, and it's safe to call from a
// Server Component for real SSR/SEO rather than a client fetch.
// ============================================================

import { createClient } from '@supabase/supabase-js';

const publicClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

export interface WorkshopContentBlock {
    id: string;
    title: string;
    body: string;
    image_url: string | null;
    sort_order: number;
}

export interface WorkshopGalleryItem {
    id: string;
    media_url: string;
    media_type: 'image' | 'video';
    sort_order: number;
}

export interface WorkshopPageData {
    id: string;
    name: string;
    slug: string;
    duration_minutes: number;
    description: string | null;
    takeaway_description: string | null;
    hero_image_url: string | null;
    intro_paragraph: string | null;
    price_thb: number | null;
    content_blocks: WorkshopContentBlock[];
    gallery: WorkshopGalleryItem[];
}

// Returns null if no workshop matches the slug (caller should 404).
export async function getWorkshopPageData(slug: string): Promise<WorkshopPageData | null> {
    const { data: workshop, error } = await publicClient
      .from('workshops')
      .select(`
            id, name, slug, duration_minutes, description,
                  takeaway_description, hero_image_url, intro_paragraph
                      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

  if (error) throw new Error(`Failed to load workshop: ${error.message}`);
    if (!workshop) return null;

  const [{ data: blocks }, { data: gallery }, { data: pkgLinks }] = await Promise.all([
        publicClient
          .from('workshop_content_blocks')
          .select('id, title, body, image_url, sort_order')
          .eq('workshop_id', workshop.id)
          .order('sort_order'),
        publicClient
          .from('workshop_gallery')
          .select('id, media_url, media_type, sort_order')
          .eq('workshop_id', workshop.id)
          .order('sort_order'),
        publicClient
          .from('package_workshops')
          .select('package_id, packages(price_thb)')
          .eq('workshop_id', workshop.id),
      ]);

  let price_thb: number | null = null;
    if (pkgLinks && pkgLinks.length === 1) {
          price_thb = (pkgLinks[0] as any).packages?.price_thb ?? null;
    }

  return {
        ...workshop,
        price_thb,
        content_blocks: blocks ?? [],
        gallery: gallery ?? [],
  };
}
