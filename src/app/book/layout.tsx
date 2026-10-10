import type { Metadata } from 'next';

import { listPrices, baht } from '@/lib/price-list';

// /book is a client component, so its title/description live here.
// Prices come from the price list for today, and the page is
// re-generated hourly, so the description switches to the 2027 prices
// on 1 Jan 2027 without a redeploy.
export const revalidate = 3600;

export function generateMetadata(): Metadata {
  const p = listPrices();
  return {
    title: 'Book a Herbal Workshop in Chiang Mai',
    description:
      `Book your hands-on Thai herbal workshop in Chiang Mai Old City: tea blending, Ya Dom inhaler, herbal massage ball (${baht(p.single)}, 1 hour), combos (${baht(p.combo)}), the 3-hour Integrated Journey (${baht(p.journey)}) or Skincare & Aromatherapy Mastery (${baht(p.aroma)}). Pay online or on arrival.`,
    alternates: { canonical: '/book' },
  };
}

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
