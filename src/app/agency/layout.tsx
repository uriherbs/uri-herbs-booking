// /agency/* — private pages for travel-agency partners (contract signing
// and the partner booking page), reached only by secret links. Never indexed.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner · Uri Herbs Workshop',
  robots: { index: false, follow: false },
};

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`.floating-whatsapp-btn { display: none !important; } @media print { .no-print { display: none !important; } }`}</style>
      {children}
    </>
  );
}
