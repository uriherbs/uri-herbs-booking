// Next.js App Router convention file — auto-served at /robots.txt.
// Added alongside sitemap.ts (council review 2026-08-23). /admin/* and
// the API routes are disallowed since neither is public content search
// engines should index or crawl.

import type { MetadataRoute } from 'next';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://uri-herbs-booking.vercel.app';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
