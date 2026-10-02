import type { Metadata } from 'next';

// /trade is a client component, so its title/description live here.
export const metadata: Metadata = {
  title: 'Travel Agents & Group Bookings',
  description:
    'Work with Uri Herbs Workshop in Chiang Mai: herbal workshops for tour groups, schools and companies, with agency commission and flexible group scheduling.',
  alternates: { canonical: '/trade' },
};

export default function TradeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
