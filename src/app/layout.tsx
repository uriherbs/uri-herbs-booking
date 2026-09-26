import type { Metadata } from 'next';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';

// SITE_URL: update this the day the real domain (uriherbs.com) actually
// points at this app instead of the old SimplyBook-based site (council
// review 2026-08-23 — see claude/open-tasks-backlog.md "Domain cutover").
// Falls back to NEXT_PUBLIC_SITE_URL so a Vercel env var can override it
// without a code change once that day comes. Used as metadataBase so
// every page's Open Graph/Twitter image resolves to an absolute URL
// without every page having to repeat it.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://uri-herbs-booking.vercel.app';

const TITLE = 'Uri Herbs Workshop — Chiang Mai';
const DESCRIPTION = 'Hands-on herbal & botanical workshops in Chiang Mai Old City — tea blending, herbal inhalers, massage balls, natural skincare & aromatherapy.';

// Sitewide defaults — every page inherited nothing before this (no
// favicon, no share-card image/description), so a link shared to
// WhatsApp/Instagram/Facebook showed a blank generic card (council
// review 2026-08-23). Individual pages (e.g. /trade, /contact) override
// title/description via their own metadata export; openGraph.images and
// icons are inherited from here unless a page explicitly overrides them.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s · Uri Herbs Workshop' },
  description: DESCRIPTION,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'Uri Herbs Workshop',
    images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Uri Herbs Workshop — Chiang Mai' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/og-image.jpg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        {children}
        <FloatingWhatsApp />
      </body>
    </html>
  );
}
