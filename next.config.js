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
    ];
  },
};

module.exports = nextConfig;
