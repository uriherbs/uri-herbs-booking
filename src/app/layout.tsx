import type { Metadata } from 'next';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';

export const metadata: Metadata = {
  title: 'Uri Herbs Workshop — Chiang Mai',
  description: 'Hands-on herbal & botanical workshops in Chiang Mai Old City.',
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
