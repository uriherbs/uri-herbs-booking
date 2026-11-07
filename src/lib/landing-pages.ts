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
// The tea page is first (event 9–11 Nov 2026, 80–100 guests). Its
// recipes are the 13 from the workshop recipe book (owner-approved
// 2026-11-07): traditional-use wording only, no medical claims.
// ============================================================

export interface Recipe {
  name: string;
  tagline: string;              // the "benefit" line from the recipe card menu page
}

/**
 * Recipes page (/tea-recipes/full), linked from the gift email.
 * Paste the YouTube video id (the part after watch?v=) and the playlist
 * link here when the videos are up; until then the page shows
 * "video coming soon" and no playlist button.
 */
export const RECIPE_VIDEOS: { overviewYoutubeId: string | null; playlistUrl: string | null } = {
  overviewYoutubeId: null,
  playlistUrl: null,
};
export const RECIPES_PAGE_PATH = '/tea-recipes/full';

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
  recipesPageUrl: string;       // the page the email links to (PDF + videos)
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
  eyebrow: 'Free recipe book · Uri Herbs Workshop, Chiang Mai',
  title: '13 Thai herbal teas you can make at home',
  subtitle:
    'The 13 blends we brew in our tea workshop, each with a fresh-herb and a tea-bag version. Leave your email and we send you the recipe book, plus a discount for your own blending session in Chiang Mai.',
  giftTitle: 'What you get',
  giftPoints: [
    '13 Thai herbal tea recipes from our workshop (printable PDF)',
    'Fresh-herb and tea-bag versions of every blend',
    'A personal 10% code for our workshops (sent with the recipes)',
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
  // The 13 workshop recipes (owner-approved PDF, 2026-11-07). Taglines =
  // the "Main benefits" column of the PDF menu page; keep them in sync.
  recipes: [
    { name: "Moon Cycle Soothe", tagline: "Traditional warming brew for women's monthly comfort" },
    { name: "The End of Numb", tagline: "Thai \"wind\" herbs to warm cold hands and feet" },
    { name: "Thai Shield Elixir", tagline: "Daily Thai tonic to keep the body warm and strong" },
    { name: "Siam Sunset Sip", tagline: "Warm spices to settle the belly after a meal" },
    { name: "Happy Gut Harmony", tagline: "After-meal brew for a light, easy belly" },
    { name: "Zen Weight Wellness", tagline: "Black ginger for energy, a light cup after meals" },
    { name: "Siam Sugar Stopper", tagline: "Tart Thai fruits to cool and refresh the body" },
    { name: "Siam Slim Sip", tagline: "The Thai leaf that tames a sweet tooth" },
    { name: "Chiang Mai Clarity", tagline: "Thai blue flower tea for a fresh, clear mind" },
    { name: "Zen Head", tagline: "Cooling Thai herbs to ease a busy, heavy head" },
    { name: "Golden Peace", tagline: "Golden roots and lemongrass to ground body and mind" },
    { name: "Kraphao Holy Harmony", tagline: "Holy basil to calm the mind and settle the stomach" },
    { name: "Siam Floral Whisper", tagline: "Thai flowers to cool the body and soothe the heart" },
  ],
  recipesPageUrl: RECIPES_PAGE_PATH,
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
