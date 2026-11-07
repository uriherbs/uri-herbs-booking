// ============================================================
// src/lib/landing-pages.ts
// ============================================================
// Lead-collection landing pages (owner request 2026-11-04). One page
// per workshop, all built from the same template
// (components/landing/LeadLandingPage.tsx). To add a page:
//   1. add a config object below and register it in LANDING_PAGES
//   2. create src/app/<slug>/page.tsx that renders it (copy tea-recipes)
//   3. put the gift PDF in public/downloads/
//   4. create the coupon code in Admin → Coupons
//
// The tea page is first (event 9–11 Nov 2026, 80–100 guests). The
// recipes below are a DRAFT for the owner to approve — flavour words
// only, no health claims (same rule as the workshop pages).
// ============================================================

export interface Recipe {
  name: string;
  tagline: string;
  ingredients: string[];
  method: string;
}

/**
 * What a guest gets, chosen by the ?src= of the link/QR they came from
 * (owner decisions 2026-11-07): a PERSONAL code per guest — one use,
 * valid 90 days, 10% — minted by /api/leads. Matching is by prefix, in
 * order; the last offer with sourcePrefixes [] is the default.
 * Plain data only (this config is passed to a client component).
 */
export interface LeadOffer {
  key: string;
  sourcePrefixes: string[];     // e.g. ['event'] matches event-nov26
  tag: string;                  // saved on the lead, used in Admin → Leads and the monthly report
  couponPrefix: string;         // personal code looks like TEA-7K2F
  percent: number;
  packageSlugs: string[] | null; // null = every workshop
  validDays: number;
  giftLine: string;             // shown on the page and in the email
  forFriend?: boolean;          // "share this code with a friend"
}

export interface LandingPageConfig {
  slug: string;                 // URL path and leads.landing value
  workshopName: string;         // shown in the email
  workshopUrl: string;          // "learn more" link
  bookUrl: string;              // booking link (coupon is applied on the Payment step)
  heroImage: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  giftTitle: string;            // what the guest gets
  giftPoints: string[];
  offers: LeadOffer[];
  pdfUrl: string;               // public/downloads/...
  recipes: Recipe[];
  defaultSource: string;        // stored when the URL has no ?src=
}

// Our RedNote (Xiaohongshu) account — shown to Chinese guests (?src=shop-cn).
// Owner 2026-11-07: guest posts a note about the workshop and tags us, then
// shows it to staff for a small gift. Framed as "share", never "review".
export const REDNOTE = { name: 'URI Herbs｜悠理草本', id: '49979919163' };

// Every package that includes the tea workshop.
const TEA_PACKAGES = ['single-tea', 'combo-tea-inhaler', 'combo-tea-ball', 'journey-full'];

export const TEA_RECIPES: LandingPageConfig = {
  slug: 'tea-recipes',
  workshopName: 'Herbal Tea Blending',
  workshopUrl: '/workshops/tea-blending',
  bookUrl: '/book',
  heroImage: '/workshop-tea-blending.jpg',
  eyebrow: 'Free recipe card · Uri Herbs Workshop, Chiang Mai',
  title: '5 Thai herbal teas you can make at home',
  subtitle:
    'Simple blends from the herbs we use in our tea workshop. Leave your email and we send you the recipe card, plus a discount for your own blending session in Chiang Mai.',
  giftTitle: 'What you get',
  giftPoints: [
    '5 Thai herbal tea recipes (PDF recipe card)',
    'A personal 10% code for our workshops (sent with the recipes)',
    'Tips from our instructor on brewing and storing herbs',
  ],
  offers: [
    {
      // Shop customers after a workshop — they already came, so the code is for a friend.
      key: 'shop', sourcePrefixes: ['shop'], tag: 'shop-customer', couponPrefix: 'FRIEND',
      percent: 10, packageSlugs: null, validDays: 90, forFriend: true,
      giftLine: 'A personal code for a friend: 10% off any workshop',
    },
    {
      key: 'event', sourcePrefixes: ['event'], tag: 'event', couponPrefix: 'TEA',
      percent: 10, packageSlugs: TEA_PACKAGES, validDays: 90,
      giftLine: 'Your personal code: 10% off a tea blending workshop',
    },
    {
      key: 'social', sourcePrefixes: ['instagram', 'facebook', 'fb', 'tiktok', 'rednote', 'ads'], tag: 'social', couponPrefix: 'TEA',
      percent: 10, packageSlugs: TEA_PACKAGES, validDays: 90,
      giftLine: 'Your personal code: 10% off a tea blending workshop',
    },
    {
      key: 'default', sourcePrefixes: [], tag: 'website', couponPrefix: 'TEA',
      percent: 10, packageSlugs: TEA_PACKAGES, validDays: 90,
      giftLine: 'Your personal code: 10% off a tea blending workshop',
    },
  ],
  pdfUrl: '/downloads/uri-herbs-tea-recipes.pdf',
  defaultSource: 'tea-recipes-page',
  recipes: [
    {
      name: 'Lemongrass & Pandan',
      tagline: 'Fresh, grassy and gently sweet',
      ingredients: ['2 stalks fresh lemongrass, bruised and cut', '2 pandan leaves, knotted', '500 ml water', 'Honey to taste (optional)'],
      method: 'Bring the water to a boil, add lemongrass and pandan, then simmer for 8–10 minutes. Strain and sweeten if you like. Lovely hot or over ice.',
    },
    {
      name: 'Butterfly Pea & Lime',
      tagline: 'The blue tea that turns purple',
      ingredients: ['1 tbsp dried butterfly pea flowers', '1 stalk lemongrass', '400 ml hot water (not boiling)', 'A squeeze of lime'],
      method: 'Steep the flowers and lemongrass for 5 minutes until deep blue. Strain, then add the lime at the table and watch the colour change.',
    },
    {
      name: 'Roselle Iced Tea',
      tagline: 'Tart, ruby red and refreshing',
      ingredients: ['2 tbsp dried roselle (krajeab)', '500 ml water', '1–2 tbsp palm sugar', 'Ice and mint to serve'],
      method: 'Simmer the roselle for 5 minutes, stir in the palm sugar until it dissolves, then cool. Pour over ice with a few mint leaves.',
    },
    {
      name: 'Ginger, Lemongrass & Kaffir Lime',
      tagline: 'Warm and zesty for cool evenings',
      ingredients: ['4 thin slices fresh ginger', '1 stalk lemongrass', '2 kaffir lime leaves, torn', '500 ml water'],
      method: 'Simmer everything for 10 minutes. Strain and enjoy warm. Add a little honey if you like it softer.',
    },
    {
      name: 'Chrysanthemum & Goji',
      tagline: 'Soft, floral and lightly sweet',
      ingredients: ['1 tbsp dried chrysanthemum flowers', '1 tsp goji berries', '400 ml hot water', 'Rock sugar to taste (optional)'],
      method: 'Steep the flowers and goji for 5–7 minutes. Strain, sweeten if you like, and sip slowly.',
    },
  ],
};

export const LANDING_PAGES: Record<string, LandingPageConfig> = {
  [TEA_RECIPES.slug]: TEA_RECIPES,
};

/** The offer for a given ?src= value (shop-cn → shop, event-nov26 → event…). */
export function pickOffer(page: LandingPageConfig, src: string): LeadOffer {
  const s = src.toLowerCase();
  return (
    page.offers.find((o) => o.sourcePrefixes.some((p) => s === p || s.startsWith(`${p}-`) || s.startsWith(p))) ||
    page.offers.find((o) => o.sourcePrefixes.length === 0) ||
    page.offers[page.offers.length - 1]
  );
}
