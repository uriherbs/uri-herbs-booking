// Server component wrapper — exists only to export page-specific
// metadata (council review 2026-08-23: this page previously inherited
// the homepage's generic title/description). The actual page is a
// client component (form state) and can't export `metadata` itself —
// Next.js requires that split. All real content lives in
// ContactPageClient.tsx; edit that file, not this one.

import type { Metadata } from 'next';
import ContactPageClient from './ContactPageClient';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Get in touch with Uri Herbs Workshop in Chiang Mai Old City — find us on the map, message us on WhatsApp, or send a message directly.',
  openGraph: {
    title: 'Contact Uri Herbs Workshop',
    description: 'Find us in Chiang Mai Old City, or message us directly on WhatsApp.',
  },
};

export default function ContactPage() {
  return <ContactPageClient />;
}
