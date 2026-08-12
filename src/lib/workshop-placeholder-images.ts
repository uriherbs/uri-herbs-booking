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
// Use this ONLY as a fallback for a missing `hero_image_url` — never
// to second-guess or override a real one. An earlier version of this
// module judged Tea Blending's real hero_image_url as "probably
// wrong" purely from its generic CDN filename and had both callers
// ignore it outright; that was a mistake — confirmed via /admin/content
// that it's real studio photography, not a stray upload. A filename
// is not a reliable signal of a real image's *content*, so don't
// filter on it: always prefer `hero_image_url` when the DB has one,
// and only reach for a placeholder when the field is actually null.
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
