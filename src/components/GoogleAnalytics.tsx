'use client';

// ============================================================
// Google Analytics 4 (property "Uri Herbs Workshop").
// Loaded on every public page, NOT in /admin (staff visits would
// otherwise count as customers). Page changes inside the app are
// tracked by GA4's "enhanced measurement" (browser history events),
// which is on by default for the web data stream.
// The privacy policy (section 9, Cookies & Analytics) already covers it.
// ============================================================

import Script from 'next/script';
import { usePathname } from 'next/navigation';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || 'G-VSN2BMF370';

export default function GoogleAnalytics() {
  const pathname = usePathname() || '';
  if (!GA_ID || pathname.startsWith('/admin')) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
