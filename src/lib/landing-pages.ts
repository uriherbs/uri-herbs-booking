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
  couponCode: string;           // must exist in Admin → Coupons
  couponText: string;           // e.g. "10% off your tea workshop"
  couponValidity: string;       // e.g. "Valid for 30 days"
  pdfUrl: string;               // public/downloads/...
  recipes: Recipe[];
  defaultSource: string;        // stored when the URL has no ?src=
}

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
    'A discount code for our hands-on tea blending workshop',
    'Tips from our instructor on brewing and storing herbs',
  ],
  couponCode: 'TEA10',
  couponText: '10% off your Tea Blending workshop',
  couponValidity: 'Valid for 30 days · applied automatically from the booking link',
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
