// ============================================================
// src/lib/price-list.ts — public list prices for text and SEO
// ============================================================
// The booking system reads prices from the database (packages +
// package_prices, price_for(package, date)). A few places show a fixed
// "price list" instead: the homepage structured data (Google) and the
// /book page description. They switch to the 2027 prices on
// 1 Jan 2027 (Chiang Mai time) by themselves, so nothing has to be
// edited on New Year's Day. Keep in line with package_prices.
// ============================================================

export interface ListPrices { single: number; combo: number; journey: number; aroma: number }

const PRICE_LISTS: { from: string; prices: ListPrices }[] = [
  { from: '2000-01-01', prices: { single: 920, combo: 1670, journey: 2320, aroma: 2700 } },
  { from: '2027-01-01', prices: { single: 1150, combo: 2090, journey: 2900, aroma: 3380 } },
];

/** Today's date in Chiang Mai as YYYY-MM-DD. */
export function bangkokToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

/** The list prices in force on a date (default: today in Chiang Mai). */
export function listPrices(date: string = bangkokToday()): ListPrices {
  let current = PRICE_LISTS[0].prices;
  for (const p of PRICE_LISTS) if (p.from <= date) current = p.prices;
  return current;
}

export const baht = (n: number) => `฿${n.toLocaleString('en-US')}`;
