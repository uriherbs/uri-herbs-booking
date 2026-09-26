// ============================================================
// src/components/SocialLinks.tsx
// ============================================================
// Row of circular social icon buttons. Same accounts + monochrome
// line-icon style already used in the "Follow Us" card on
// src/app/contact/page.tsx — pulled out here so the Home page's
// "Get in Touch" section can reuse it instead of re-declaring the
// same four icons a third time.
// ============================================================

import { C } from '@/lib/theme';

const InstagramSVG = ({ size = 18, color = C.sage }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
    <circle cx="12" cy="12" r="4.3" />
    <circle cx="17.6" cy="6.4" r="0.9" fill={color} stroke="none" />
  </svg>
);

const FacebookSVG = ({ size = 18, color = C.sage }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34v7.03C18.34 21.24 22 17.08 22 12.06z" />
  </svg>
);

const TikTokSVG = ({ size = 18, color = C.sage }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M16.6 3h-3.1v12.6a2.7 2.7 0 11-2.35-2.68v-3.15a5.85 5.85 0 105.1 5.8V9.34a8.2 8.2 0 004.75 1.5V7.7a5 5 0 01-4.4-4.7z" />
  </svg>
);

const LineSVG = ({ size = 18, color = C.sage }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 3.5C6.75 3.5 2.5 6.9 2.5 11.1c0 3.77 3.38 6.93 7.93 7.53.31.07.73.2.84.47.1.24.06.62.03.87l-.14.83c-.04.24-.19.96.84.53 1.03-.44 5.56-3.28 7.58-5.61 1.4-1.53 2.07-3.08 2.07-4.62 0-4.2-4.25-7.6-9.65-7.6zm-4.86 9.6H5.6a.4.4 0 01-.4-.4V8.6a.4.4 0 11.8 0v3.7h1.14a.4.4 0 010 .8zm2.06 0a.4.4 0 01-.4-.4V8.6a.4.4 0 11.8 0v4.1a.4.4 0 01-.4.4zm4.86 0a.4.4 0 01-.32-.16l-2.06-2.8v2.56a.4.4 0 11-.8 0V8.6a.4.4 0 01.73-.24l2.05 2.79V8.6a.4.4 0 11.8 0v4.1a.4.4 0 01-.4.4zm3.1 0h-1.87a.4.4 0 01-.4-.4V8.6a.4.4 0 01.4-.4h1.87a.4.4 0 110 .8h-1.47v.94h1.34a.4.4 0 110 .8h-1.34v.96h1.47a.4.4 0 110 .8z" />
  </svg>
);

// Same accounts linked from the "Follow Us" card on the Contact page.
const SOCIAL_LINKS = [
  { name: 'Instagram', href: 'https://www.instagram.com/uriherbsworkshop', Icon: InstagramSVG },
  { name: 'Facebook', href: 'https://www.facebook.com/uriherbworkshop', Icon: FacebookSVG },
  { name: 'LINE', href: 'https://line.me/R/ti/p/@458fguvz', Icon: LineSVG },
  { name: 'TikTok', href: 'https://www.tiktok.com/@uriherbsworkshop', Icon: TikTokSVG },
];

interface SocialLinksProps {
  style?: React.CSSProperties;
}

export function SocialLinks({ style }: SocialLinksProps) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, ...style }}>
      {SOCIAL_LINKS.map(({ name, href, Icon }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={name}
          title={name}
          className="social-link-btn"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: C.white,
            boxShadow: '0 1px 3px rgba(45,70,57,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.15s ease',
          }}
        >
          <Icon size={20} />
        </a>
      ))}
      <style dangerouslySetInnerHTML={{ __html: `.social-link-btn:hover { transform: translateY(-2px); }` }} />
    </div>
  );
}
