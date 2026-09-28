/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Internal health & allergy questionnaire (systeme.io). Before the
      // 2026-09-26 domain cutover it lived at uriherbs.com/health, and the
      // printed QR codes customers scan still point there — send them to
      // the same page on systeme.io's own domain. Temporary (307) so it
      // can be changed later without browsers caching it.
      { source: '/health', destination: 'https://uherbhouse.systeme.io/health', permanent: false },
      { source: '/Health', destination: 'https://uherbhouse.systeme.io/health', permanent: false },
      // The questionnaire's later steps — the page's buttons still link to
      // the old domain, so catch those too.
      { source: '/multiple', destination: 'https://uherbhouse.systeme.io/multiple', permanent: false },
      { source: '/thank', destination: 'https://uherbhouse.systeme.io/thank', permanent: false },

      // Old website (systeme.io, before the 2026-09-26 cutover) page
      // addresses that Google still lists in search results. Permanent
      // (301/308) so Google moves their ranking to the new pages instead
      // of dropping them as "not found".
      { source: '/tea', destination: '/workshops/tea-blending', permanent: true },
      { source: '/inhaler', destination: '/workshops/ya-dom-inhaler', permanent: true },
      { source: '/yadom', destination: '/workshops/ya-dom-inhaler', permanent: true },
      { source: '/massage', destination: '/workshops/herbal-massage-ball', permanent: true },
      { source: '/skincare', destination: '/workshops/skincare-aromatherapy', permanent: true },
      { source: '/aromtherapy', destination: '/workshops/skincare-aromatherapy', permanent: true },
      { source: '/aromatherapy', destination: '/workshops/skincare-aromatherapy', permanent: true },
      { source: '/beautyandbalance', destination: '/workshops/skincare-aromatherapy', permanent: true },
      // Old combo / full-journey pages — no single page for these on the
      // new site, so send them to booking where every package is listed.
      { source: '/yadom-tea', destination: '/book', permanent: true },
      { source: '/yadom-ball', destination: '/book', permanent: true },
      { source: '/refreshandrelax', destination: '/book', permanent: true },
      // Old blog post not carried over to the new blog.
      { source: '/blog/utis', destination: '/blog', permanent: true },
    ];
  },
};

module.exports = nextConfig;
