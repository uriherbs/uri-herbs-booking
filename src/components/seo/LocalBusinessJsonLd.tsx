// ============================================================
// Structured data (schema.org JSON-LD) describing the business, so
// Google can show the name, address, phone, prices and social
// profiles correctly and connect the website to the Google Business
// Profile. Rendered on the homepage only.
// Keep the address/phone identical to the Google Business Profile.
// ============================================================

import { listPrices, baht } from '@/lib/price-list';

const SITE_URL = 'https://www.uriherbs.com';

// Built per request (the homepage is dynamic) so the prices switch to
// the 2027 list on 1 Jan 2027 without a redeploy.
function businessData() {
  const p = listPrices();
  return {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${SITE_URL}/#business`,
  name: 'Uri Herbs Workshop',
  description:
    'Hands-on Thai herbal workshops in Chiang Mai Old City: herbal tea blending, Ya Dom herbal inhaler, herbal massage (compress) ball, natural skincare and aromatherapy.',
  url: SITE_URL,
  logo: `${SITE_URL}/icon-512.png`,
  image: [`${SITE_URL}/og-image.jpg`, `${SITE_URL}/hero-wide.jpg`],
  telephone: '+66643349890',
  email: 'uherbhouse@gmail.com',
  priceRange: `${baht(p.single)} – ${baht(p.aroma)}`,
  currenciesAccepted: 'THB',
  paymentAccepted: 'Cash, PromptPay, WeChat Pay, Credit Card, PayPal',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '44/3 Si Phum Soi 9',
    addressLocality: 'Chiang Mai',
    addressRegion: 'Chiang Mai',
    postalCode: '50200',
    addressCountry: 'TH',
  },
  hasMap: 'https://www.google.com/maps/search/?api=1&query=Uri%20Herbs%20Workshop&query_place_id=ChIJxecF1bQ72jAREMxTp8PDykE',
  sameAs: [
    'https://www.instagram.com/uriherbsworkshop',
    'https://www.facebook.com/uriherbworkshop',
    'https://www.tiktok.com/@uriherbsworkshop',
    'https://www.youtube.com/@UriHerbsWorkshop',
    'https://www.tripadvisor.com/Attraction_Review-g25330083-d33879747-Reviews-Uri_Herbs_Workshop-Chang_Moi_Chiang_Mai.html',
    'https://www.getyourguide.com/uri-herbs-workshop-s647905/',
  ],
  makesOffer: [
    { name: 'Herbal Tea Blending Workshop (1 hour)', price: p.single, url: `${SITE_URL}/workshops/tea-blending` },
    { name: 'Ya Dom Thai Herbal Inhaler Workshop (1 hour)', price: p.single, url: `${SITE_URL}/workshops/ya-dom-inhaler` },
    { name: 'Herbal Massage Ball Workshop (1 hour)', price: p.single, url: `${SITE_URL}/workshops/herbal-massage-ball` },
    { name: 'Combo: any 2 herbal workshops (2 hours)', price: p.combo, url: `${SITE_URL}/book` },
    { name: 'Integrated Herbal Journey: all 3 workshops (3 hours)', price: p.journey, url: `${SITE_URL}/book` },
    { name: 'Natural Skincare & Aromatherapy Mastery (2 hours)', price: p.aroma, url: `${SITE_URL}/workshops/skincare-aromatherapy` },
  ].map((o) => ({
    '@type': 'Offer',
    priceCurrency: 'THB',
    price: o.price,
    url: o.url,
    itemOffered: { '@type': 'Service', name: o.name },
  })),
  };
}

export function LocalBusinessJsonLd() {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output contains no "</script>" sequences here
      // (all values are fixed strings above).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(businessData()) }}
    />
  );
}
