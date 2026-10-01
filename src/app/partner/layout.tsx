// /partner/* — private partner (influencer) pages, reached only by a
// secret link. Never indexed.
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partner Dashboard · Uri Herbs Workshop',
  robots: { index: false, follow: false },
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`.floating-whatsapp-btn { display: none !important; }`}</style>
      {children}
    </>
  );
}
