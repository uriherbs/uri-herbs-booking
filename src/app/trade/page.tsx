// Server component wrapper — exists only to export page-specific
// metadata (council review 2026-08-23: this page previously inherited
// the homepage's generic title/description, so a link shared from here
// showed the wrong preview everywhere). The actual page is a client
// component (state, form handlers) and can't export `metadata` itself
// — Next.js requires that split. All real content lives in
// TradePageClient.tsx; edit that file, not this one.

import type { Metadata } from 'next';
import TradePageClient from './TradePageClient';

export const metadata: Metadata = {
  title: 'Trade & Groups — Partner With Us',
  description: 'Bring your travel groups to Uri Herbs Workshop in Chiang Mai. 20% partner commission on every rate, flexible group scheduling, and a dedicated instructor for the whole session.',
  openGraph: {
    title: 'Trade & Groups — Uri Herbs Workshop',
    description: 'For travel agencies & tour guides: partner rates, flexible group scheduling, and a dedicated instructor for every group in Chiang Mai.',
  },
};

export default function TradePage() {
  return <TradePageClient />;
}
