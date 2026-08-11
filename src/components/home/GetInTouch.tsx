// ============================================================
// src/components/home/GetInTouch.tsx
// ============================================================
// Closing "Get in Touch" band on the homepage. Ported from the
// uri-herbs-v0-design mockup (components/home/get-in-touch.tsx).
// ============================================================

import { SocialLinks } from '@/components/SocialLinks';
import { C, FONT_DISPLAY, FONT_BODY } from '@/lib/theme';

export function GetInTouch() {
  return (
    <section style={{ maxWidth: 1080, margin: '0 auto', padding: '56px 20px' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          borderRadius: 28,
          background: C.sage,
          padding: '48px 24px',
          textAlign: 'center',
        }}
      >
        <div>
          <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>
            Say Hello
          </p>
          <h2 style={{ margin: '8px 0 0', fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 'clamp(26px,4vw,34px)', color: C.white }}>
            Get in Touch
          </h2>
          <p style={{ margin: '10px auto 0', maxWidth: 440, fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.7, color: 'rgba(255,255,255,0.9)' }}>
            Follow along for herbal tips, workshop dates, and behind-the-scenes moments — or send
            us a message any time.
          </p>
        </div>
        <SocialLinks />
      </div>
    </section>
  );
}
