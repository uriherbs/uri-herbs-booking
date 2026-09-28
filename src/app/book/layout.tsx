import type { Metadata } from 'next';

// /book is a client component, so its title/description live here.
export const metadata: Metadata = {
  title: 'Book a Herbal Workshop in Chiang Mai',
  description:
    'Book your hands-on Thai herbal workshop in Chiang Mai Old City: tea blending, Ya Dom inhaler, herbal massage ball (฿920, 1 hour), combos (฿1,670), the 3-hour Integrated Journey (฿2,320) or Skincare & Aromatherapy Mastery (฿2,700). Pay online or on arrival.',
  alternates: { canonical: '/book' },
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
