// ============================================================
// src/app/sitemap.ts
// ============================================================
// Next.js App Router convention file — auto-served at /sitemap.xml,
// no route handler needed. Added as part of the marketing/SEO pass
// (council review 2026-08-23): the site previously had none at all,
// so search engines had no structured map of what to crawl.
//
// /book and /admin/* are deliberately excluded — /book is a
// multi-step wizard with no useful standalone landing content, and
// /admin/* is Mali's internal tool, not a public page search engines
// should index.
// ============================================================

import type { MetadataRoute } from 'next';
import { getActiveBlogPosts } from '@/lib/blog-content-service';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://uri-herbs-booking.vercel.app';

const WORKSHOP_SLUGS = ['tea-blending', 'ya-dom-inhaler', 'herbal-massage-ball', 'skincare-aromatherapy'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/book`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${SITE_URL}/contact`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/trade`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/blog`, changeFrequency: 'weekly', priority: 0.5 },
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.1 },
    { url: `${SITE_URL}/terms`, changeFrequency: 'yearly', priority: 0.1 },
  ];

  const workshopRoutes: MetadataRoute.Sitemap = WORKSHOP_SLUGS.map((slug) => ({
    url: `${SITE_URL}/workshops/${slug}`,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  // Best-effort — a Supabase hiccup at build/request time must not take
  // the whole sitemap down; the static routes above are still useful
  // without the blog posts appended.
  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const posts = await getActiveBlogPosts();
    blogRoutes = posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.published_at ? new Date(post.published_at) : undefined,
      changeFrequency: 'monthly',
      priority: 0.4,
    }));
  } catch (err) {
    console.error('sitemap: failed to load blog posts', err);
  }

  return [...staticRoutes, ...workshopRoutes, ...blogRoutes];
}
