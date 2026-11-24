import type { Metadata } from 'next';
import CreatorsPage from '@/components/CreatorsPage';

export const metadata: Metadata = {
  title: '达人与内容创作者合作 — Uri Herbs Workshop 清迈',
  description: '内容创作者：在清迈免费体验并拍摄任意一门 Uri Herbs 草本手作课程，粉丝享 9 折，每笔预订赚取 12–15% 佣金。',
  alternates: { canonical: '/creators/zh', languages: { en: '/creators', 'zh-CN': '/creators/zh' } },
};

export default function Page() {
  return <CreatorsPage lang="zh" />;
}
