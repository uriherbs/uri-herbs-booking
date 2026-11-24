import type { Metadata } from 'next';
import CreatorsPage from '@/components/CreatorsPage';

export const metadata: Metadata = {
  title: 'Creators & Influencers — Work With Us',
  description:
    'Content creators: film any Uri Herbs workshop in Chiang Mai for free, give your followers 10% off, and earn 12–15% on every booking.',
  alternates: { canonical: '/creators', languages: { en: '/creators', 'zh-CN': '/creators/zh' } },
};

export default function Page() {
  return <CreatorsPage lang="en" />;
}
