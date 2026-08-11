// ============================================================
// src/components/home/Intro.tsx
// ============================================================
// "Every workshop is a small ritual…" section. Layout/copy ported
// from the uri-herbs-v0-design mockup (components/home/intro.tsx),
// which paired the copy with a photo of hands working fresh herbs.
// Wrapped in LeafFrame — the same signature corner-leaf motif the
// mockup used elsewhere (blog post images) — rather than the mockup's
// plain rounded card, since we don't have a matching photo library to
// lean on yet and the motif helps the placeholder read as "on brand"
// rather than generic stock art.
// ============================================================

import { PillButton } from '@/components/PillButton';
import { LeafFrame } from '@/components/LeafFrame';
import { C, FONT_DISPLAY, FONT_BODY } from '@/lib/theme';

export function Intro() {
  return (
    <section style={{ background: C.sageLight }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .home-intro-grid { display: grid; gap: 32px; max-width: 1080px; margin: 0 auto; padding: 56px 20px; align-items: center; }
            @media (min-width: 780px) { .home-intro-grid { grid-template-columns: 1fr 1fr; gap: 48px; } }
          `,
        }}
      />

      <div className="home-intro-grid">
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <LeafFrame>
            {/* TODO(design): AI-generated placeholder photo, carried
                over from the uri-herbs-v0-design mockup
                (public/intro-hands.png there). Swap for a real photo
                of hands working fresh herbs once the studio shoots
                one — same filename works, just replace
                public/intro-hands.png.
                Fixed px width rather than '100%' — LeafFrame's
                wrapper is an inline-block sized to its content, so a
                percentage width here would resolve against an
                indefinite containing block and collapse to 0. */}
            <img
              src="/intro-hands.png"
              alt="Hands working with fresh herbs at a rustic garden workbench"
              style={{ display: 'block', width: 380, maxWidth: '80vw', aspectRatio: '4 / 3', objectFit: 'cover' }}
            />
          </LeafFrame>
        </div>

        <div>
          <svg width={36} height={36} viewBox="0 0 24 24" fill={C.gold} aria-hidden="true" style={{ opacity: 0.9 }}>
            <path d="M12 2C7 6 4 10 4 15a8 8 0 0 0 16 0c0-5-3-9-8-13Zm0 3.2c3.3 2.9 5.2 6 5.2 9.8a5.2 5.2 0 0 1-4.4 5.1V11a.8.8 0 0 0-1.6 0v9.1A5.2 5.2 0 0 1 6.8 15c0-3.8 1.9-6.9 5.2-9.8Z" />
          </svg>
          <p
            style={{
              margin: '18px 0 0',
              fontFamily: FONT_DISPLAY,
              fontStyle: 'italic',
              fontWeight: 600,
              fontSize: 'clamp(22px,3vw,28px)',
              lineHeight: 1.5,
              color: C.forest,
            }}
          >
            Every workshop is a small ritual — a chance to work with your hands, breathe in
            something fragrant, and take home more than a souvenir.
          </p>
          <p style={{ margin: '18px 0 0', maxWidth: 480, fontFamily: FONT_BODY, fontSize: 15, lineHeight: 1.75, color: C.bark }}>
            Uri Herbs Workshop brings together traditional Thai herbal knowledge and a calm,
            welcoming space. Whether you join solo, as a couple, or in a group, our guides walk
            you through every step.
          </p>
          <div style={{ marginTop: 28 }}>
            <PillButton href="/book" size="lg">
              Book Now
            </PillButton>
          </div>
        </div>
      </div>
    </section>
  );
}
