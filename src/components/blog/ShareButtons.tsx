// ============================================================
// src/components/blog/ShareButtons.tsx
// ============================================================
// "Share" row at the bottom of a post. Facebook + WhatsApp use real
// share intents pre-filled with this post's title/URL; Instagram
// doesn't support a share-intent URL, so — same as the
// uri-herbs-v0-design mockup — it just links out to the shop's own
// profile (reusing the real handle from SocialLinks.tsx instead of
// the mockup's generic https://instagram.com).
// ============================================================

import { C, FONT_BODY } from '@/lib/theme';

function FacebookSVG({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34v7.03C18.34 21.24 22 17.08 22 12.06z" />
    </svg>
  );
}

function InstagramSVG({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.3" />
      <circle cx="17.6" cy="6.4" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function WhatsAppSVG({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-1.746-.873-2.888-1.556-4.034-3.528-.305-.525.305-.487.873-1.62.098-.198.05-.371-.05-.52-.099-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.148.198 2.033 3.1 4.933 4.222 2.9 1.123 2.9.748 3.868.674.966-.074 3.023-1.236 3.464-2.43.44-1.196.44-2.223.313-2.437-.14-.213-.297-.297-.594-.446z" />
      <path d="M12.05 2C6.554 2 2.09 6.462 2.09 11.955c0 1.925.535 3.795 1.55 5.418L2 22l4.755-1.615a9.94 9.94 0 0 0 5.294 1.523h.004c5.496 0 9.96-4.462 9.96-9.953C22.013 6.462 17.55 2 12.05 2Zm0 18.19h-.003a8.24 8.24 0 0 1-4.203-1.15l-.301-.18-3.135 1.065.032-.116 1.146-3.024-.199-.31a8.19 8.19 0 0 1-1.267-4.42c0-4.541 3.703-8.24 8.244-8.24 2.201 0 4.269.859 5.826 2.418a8.174 8.174 0 0 1 2.412 5.826c0 4.542-3.703 8.13-8.552 8.13Z" />
    </svg>
  );
}

export function ShareButtons({ title, url }: { title: string; url: string }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    { label: 'Share on Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, Icon: FacebookSVG },
    { label: 'Share on WhatsApp', href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, Icon: WhatsAppSVG },
    { label: 'Visit us on Instagram', href: 'https://www.instagram.com/uriherbsworkshop', Icon: InstagramSVG },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600, color: C.barkLight }}>Share</span>
      <ul style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: 8, margin: 0, padding: 0 }}>
        {links.map(({ label, href, Icon }) => (
          <li key={label}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              title={label}
              className="share-btn"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: C.sageLight,
                color: C.sageDark,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              <Icon size={16} />
            </a>
          </li>
        ))}
      </ul>
      <style dangerouslySetInnerHTML={{ __html: `.share-btn:hover { background: ${C.sageDark}; color: #fff; }` }} />
    </div>
  );
}
