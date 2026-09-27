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
    ];
  },
};

module.exports = nextConfig;
