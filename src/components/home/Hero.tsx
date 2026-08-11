// ============================================================
// src/components/home/Hero.tsx
// ============================================================
// Homepage hero. Ported from the layout/copy of the
// uri-herbs-v0-design mockup (components/home/hero.tsx), which
// sat on top of a photographed mural background.
// ============================================================

import { PillButton } from '@/components/PillButton';
import { C, FONT_DISPLAY, FONT_BODY } from '@/lib/theme';

const HIGHLIGHTS = [
  { value: 'Hands-on', label: 'Guided workshops' },
  { value: '100%', label: 'Natural botanicals' },
  { value: 'Thai', label: 'Herbal tradition' },
];

export function Hero() {
  return (
    <section style={{ padding: '12px 12px 0' }}>
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 32 }}>
        {/* TODO(design): AI-generated placeholder mural, carried over
            from the uri-herbs-v0-design mockup (public/hero-mural.png
            there). Swap for a real photo of the workshop's entrance
            mural once the studio shoots one — same filename works,
            just replace public/hero-mural.png. */}
        <img
          src="/hero-mural.png"
          alt="Hand-painted mural of terraced green herb fields and blue mountains, inspired by the workshop entrance wall"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to top, rgba(45,70,57,0.8) 0%, rgba(45,70,57,0.25) 55%, rgba(45,70,57,0.4) 100%)`,
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            margin: '0 auto',
            maxWidth: 1080,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            minHeight: 460,
            padding: '96px 24px 40px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              width: 'fit-content',
              alignItems: 'center',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.92)',
              padding: '7px 16px',
              fontFamily: FONT_BODY,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: C.forest,
            }}
          >
            Welcome to Herbs Workshop
          </span>

          <h1
            style={{
              margin: '20px 0 0',
              maxWidth: 640,
              fontFamily: FONT_DISPLAY,
              fontStyle: 'italic',
              fontWeight: 600,
              fontSize: 'clamp(38px, 6vw, 64px)',
              lineHeight: 1.05,
              color: C.white,
            }}
          >
            Nature provides,
            <br />
            {/* Same white as the line above — matches the v0 source
                (components/home/hero.tsx), which used `text-secondary`
                here (a near-white #e5eddd, not gold). This port
                previously used C.gold (#A89068), a much darker,
                low-contrast tan that was hard to read over the photo. */}
            <span style={{ color: C.white }}>you create.</span>
          </h1>

          <p
            style={{
              margin: '20px 0 0',
              maxWidth: 480,
              fontFamily: FONT_BODY,
              fontSize: 16,
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.88)',
            }}
          >
            The words that greet you at our door. Step in, slow down, and turn Thai botanical
            tradition into something made by your own hands.
          </p>

          <div style={{ marginTop: 30, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <PillButton href="/book" size="lg">
              Book Now
            </PillButton>
            <PillButton href="/contact" size="lg" variant="outline">
              Get in Touch
            </PillButton>
          </div>
        </div>
      </div>

      {/* Highlight bar, sitting below the hero */}
      <div style={{ margin: '24px auto 0', maxWidth: 720, padding: '0 16px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${HIGHLIGHTS.length}, 1fr)`,
            background: C.white,
            borderRadius: 20,
            boxShadow: '0 8px 24px rgba(45,70,57,0.1)',
            padding: '20px 16px',
          }}
        >
          {HIGHLIGHTS.map((item, i) => (
            <div
              key={item.label}
              style={{
                textAlign: 'center',
                padding: '0 8px',
                borderLeft: i > 0 ? `1px solid ${C.sand}` : 'none',
              }}
            >
              <p style={{ margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 22, color: C.forest }}>
                {item.value}
              </p>
              <p style={{ margin: '4px 0 0', fontFamily: FONT_BODY, fontSize: 12, lineHeight: 1.4, color: C.barkLight }}>
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
