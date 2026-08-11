// ============================================================
// src/components/home/Hero.tsx
// ============================================================
// Homepage hero. Ported from the layout/copy of the
// uri-herbs-v0-design mockup (components/home/hero.tsx), which
// sat on top of a photographed mural background. This project has
// no photography in `public/` yet, so the mural is replaced with a
// hand-built sage/forest gradient + a scattered leaf-sprig pattern
// (reusing the same leaf silhouette as LeafFrame) instead of an
// <img>.
//
// TODO(design): once real photography exists, swap the gradient
// <div> below for something like:
//   <img src="/hero-mural.jpg" alt="…" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
// ============================================================

import { PillButton } from '@/components/PillButton';
import { C, FONT_DISPLAY, FONT_BODY } from '@/lib/theme';

const HIGHLIGHTS = [
  { value: 'Hands-on', label: 'Guided workshops' },
  { value: '100%', label: 'Natural botanicals' },
  { value: 'Thai', label: 'Herbal tradition' },
];

function LeafSprig({ style, rotate = 0 }: { style: React.CSSProperties; rotate?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style={style}>
      <path
        d={`M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22.5C7.76 17.66 9.41 12.67 18 11.18V14C21.78 10.58 20 2 20 2S13.21 4.58 17 8Z`}
        fill="#FFFFFF"
        fillOpacity={0.16}
        transform={`rotate(${rotate} 12 12)`}
      />
    </svg>
  );
}

export function Hero() {
  return (
    <section style={{ padding: '12px 12px 0' }}>
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 32,
          background: `radial-gradient(circle at 15% 20%, ${C.sage} 0%, transparent 45%), radial-gradient(circle at 85% 0%, ${C.gold} 0%, transparent 35%), linear-gradient(160deg, ${C.forest} 0%, ${C.sageDark} 60%, ${C.sage} 100%)`,
        }}
      >
        {/* Decorative scattered leaves, standing in for a photographed mural */}
        <LeafSprig style={{ position: 'absolute', width: 90, height: 90, top: 30, left: '8%' }} rotate={-15} />
        <LeafSprig style={{ position: 'absolute', width: 60, height: 60, top: '55%', left: '22%' }} rotate={20} />
        <LeafSprig style={{ position: 'absolute', width: 120, height: 120, bottom: -10, right: '6%' }} rotate={200} />
        <LeafSprig style={{ position: 'absolute', width: 70, height: 70, top: 60, right: '28%' }} rotate={150} />

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
            <span style={{ color: C.gold }}>you create.</span>
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
