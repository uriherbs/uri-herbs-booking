// ============================================================
// src/app/tea-recipes/page.tsx
// ============================================================
// First lead-collection landing page (owner request 2026-11-04):
// free Thai herbal tea recipe card + tea workshop coupon. Content and
// coupon live in src/lib/landing-pages.ts (TEA_RECIPES). Copy this
// file for the next landing page and point it at its own config.
// (/tea itself is an old 301 to the workshop page — don't reuse it.)
// ============================================================

import type { Metadata } from 'next';
import LeadLandingPage from '@/components/landing/LeadLandingPage';
import { TEA_RECIPES } from '@/lib/landing-pages';

export const metadata: Metadata = {
  title: 'Free Thai Herbal Tea Recipes',
  description: TEA_RECIPES.subtitle,
  alternates: { canonical: `/${TEA_RECIPES.slug}` },
  openGraph: { title: TEA_RECIPES.title, description: TEA_RECIPES.subtitle, images: [TEA_RECIPES.heroImage] },
};

export default function TeaRecipesPage() {
  return <LeadLandingPage config={TEA_RECIPES} />;
}
