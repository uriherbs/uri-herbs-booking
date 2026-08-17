import type { Metadata } from 'next';
import LegalPageLayout from '@/components/legal/LegalPageLayout';
import { privacyDoc } from '@/lib/legal-content';

export const metadata: Metadata = {
  title: 'Privacy Policy — Uri Herbs Workshop',
  description: 'How Uri Herbs Workshop collects, uses, and protects your personal data, in line with Thailand’s PDPA.',
};

export default function PrivacyPage() {
  return <LegalPageLayout doc={privacyDoc} />;
}
