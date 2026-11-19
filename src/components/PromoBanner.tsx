// Thin banner for website promotions (src/lib/promotions.ts). Renders
// nothing when no promotion runs today. Server component: the date is
// checked per request, so it disappears by itself after the last day.

import Link from 'next/link';
import { activePromos, promoUntilLabel } from '@/lib/promotions';
import { C, FONT_BODY } from '@/lib/theme';


export default function PromoBanner({ slug }: { slug?: string }) {
  const promos = activePromos().filter((p) => !slug || p.packageSlugs.includes(slug));
  if (promos.length === 0) return null;
  return (
    <div style={{ background: C.forest, color: C.white, fontFamily: FONT_BODY, fontSize: 14, textAlign: 'center', padding: '10px 16px', lineHeight: 1.4 }}>
      {promos.map((p) => (
        <div key={p.code}>
          <strong>{p.headline}</strong> · book by {promoUntilLabel(p)}, no code needed ·{' '}
          <Link href="/book" style={{ color: C.white, textDecoration: 'underline', fontWeight: 700 }}>
            Book now
          </Link>
        </div>
      ))}
    </div>
  );
}
