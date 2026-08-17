import type { Metadata } from 'next';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { termsDoc } from '@/lib/legal-content';

export const metadata: Metadata = {
  title: 'Terms & Conditions — Uri Herbs Workshop',
  description: 'Booking, payment, cancellation, and refund terms for Uri Herbs Workshop, Chiang Mai.',
};

export default function TermsPage() {
  return <LegalPageLayout doc={termsDoc} />;
}
