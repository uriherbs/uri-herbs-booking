// ============================================================
// src/lib/workshop-placeholder-images.ts
// ============================================================
// TODO(design): AI-generated placeholder photos, carried over from
// the uri-herbs-v0-design mockup's public/workshop-*.png files. Swap
// each file in public/ for a real studio photo once one exists — no
// code change needed in either of this module's two callers
// (src/components/home/WorkshopCircles.tsx and
// src/app/workshops/[slug]/page.tsx).
//
// Keyed by slug rather than just cycled by position — confirmed
// against the real `workshops` table (Supabase) that these 4 slugs
// are exactly the mockup's, so each workshop gets the placeholder
// photo that actually matches its craft (the tea-blending workshop
// shows the tea-blending placeholder, etc.), not just "a" placeholder.
//
// Both callers deliberately do NOT fall back to a workshop's real
// `hero_image_url` from the DB: as of writing, one workshop ("Tea
// Blending") has hero_image_url set to what looks like a stray/wrong
// asset (a design file, not a workshop photo) — the other 3 have
// none at all. Preferring hero_image_url when present would show 1
// broken-looking image next to 3 placeholder photos, worse than 4
// consistent ones. Once real, verified photos exist for ALL 4
// workshops, both callers should switch back to preferring
// `hero_image_url ?? PLACEHOLDER_IMAGE_BY_SLUG[slug]`.
export const PLACEHOLDER_IMAGE_BY_SLUG: Record<string, string> = {
  'tea-blending': '/workshop-tea-blending.png',
  'ya-dom-inhaler': '/workshop-ya-dom.png',
  'herbal-massage-ball': '/workshop-massage-ball.png',
  'skincare-aromatherapy': '/workshop-skincare-aromatherapy.png',
};

// Fallback cycle for a future/unlisted slug not in the map above.
export const PLACEHOLDER_FALLBACK_IMAGES = Object.values(PLACEHOLDER_IMAGE_BY_SLUG);

export function getPlaceholderWorkshopImage(slug: string, index: number): string {
  return PLACEHOLDER_IMAGE_BY_SLUG[slug] || PLACEHOLDER_FALLBACK_IMAGES[index % PLACEHOLDER_FALLBACK_IMAGES.length];
}
