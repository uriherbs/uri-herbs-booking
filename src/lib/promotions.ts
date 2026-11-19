// ============================================================
// src/lib/promotions.ts — website promotions (owner decision 2026-11-19)
// ============================================================
// A promotion here is shown on the website (struck-through price, a
// banner) and applied automatically on the Payment step, so the guest
// never has to type a code. What is actually charged is still decided
// in the database: each promotion has a matching row in `coupons`
// (same code, percent, package, dates) and apply_coupon() checks it.
// Keep the two in step. Promotions only affect website bookings, not
// OTA imports, agency bookings or manual bookings.
//
// To end a promotion early: set the coupon inactive in admin →
// Coupons, and remove (or shorten) the entry below.
// ============================================================

import { bangkokToday } from './price-list';

export interface SitePromo {
  code: string;            // the coupon code in admin → Coupons
  packageSlugs: string[];  // packages it applies to
  percent: number;         // % off the price
  from: string;            // first day (Chiang Mai date, YYYY-MM-DD)
  until: string;           // last day: booking date AND workshop date
  allowPrivate: boolean;   // private sessions included?
  headline: string;        // banner text
  detail: string;          // short line under the price
}

export const SITE_PROMOS: SitePromo[] = [
  {
    code: 'TEATIME20',
    packageSlugs: ['tea-blending'],
    percent: 20,
    from: '2026-11-20',
    until: '2026-12-15',
    allowPrivate: false,
    headline: '20% off Herbal Tea Blending',
    detail: 'For workshops until 15 December',
  },
];

/** Promotions running today (Chiang Mai date). */
export function activePromos(today: string = bangkokToday()): SitePromo[] {
  return SITE_PROMOS.filter((p) => p.from <= today && today <= p.until);
}

/**
 * The promotion for a package, if one runs today. With a workshop date,
 * only if that date is inside the promotion too; with isPrivate, only
 * if the promotion covers private sessions.
 */
export function promoFor(
  slug: string | null | undefined,
  opts: { workshopDate?: string | null; isPrivate?: boolean; today?: string } = {},
): SitePromo | null {
  if (!slug) return null;
  const p = activePromos(opts.today).find((x) => x.packageSlugs.includes(slug));
  if (!p) return null;
  if (opts.isPrivate && !p.allowPrivate) return null;
  if (opts.workshopDate && (opts.workshopDate < p.from || opts.workshopDate > p.until)) return null;
  return p;
}

/** Price after the promotion's discount (whole baht). */
export function promoPrice(price: number, promo: SitePromo): number {
  return price - Math.round((price * promo.percent) / 100);
}

/** "15 Dec" style short date. */
export function promoUntilLabel(promo: SitePromo): string {
  return new Date(promo.until + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
