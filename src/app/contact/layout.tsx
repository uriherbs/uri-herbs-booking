import type { Metadata } from 'next';

// /contact is a client component, so its title/description live here.
export const metadata: Metadata = {
  title: 'Contact & Location — Chiang Mai Old City',
  description:
    'Find Uri Herbs Workshop at 44/3 Si Phum Soi 9, Chiang Mai Old City. Contact us by WhatsApp, LINE, phone or email for bookings, private groups and questions.',
  alternates: { canonical: '/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
