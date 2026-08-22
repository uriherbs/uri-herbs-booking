// ============================================================
// src/components/home/VideoMoment.tsx
// ============================================================
// "See a Workshop in Action" band — sits right before the closing
// GetInTouch CTA, deliberately last thing a scrolling visitor sees
// before the final ask. Per the owner's content strategy notes,
// customer-experience video is the best-performing content on
// Instagram, so this is the spot to give it one more push right
// before conversion rather than burying it mid-page.
//
// public/homepage-video.mp4 is currently the owner's raw ~59s studio
// clip (source: "Uri Herbs_Corte_02.mp4"), re-encoded here for the
// web — 1920x1080/~20.5Mbps down to 1280x720/~1.1Mbps H.264+AAC,
// faststart (151MB -> 8.8MB) — but NOT yet trimmed for content. The
// owner is planning a proper edit (recommend cutting to ~10-20s for
// a homepage loop — plenty to convey the vibe without asking mobile
// visitors to burn data on a full minute of autoplay-adjacent video).
// TODO(owner): once the edited cut is ready, drop it in as
// public/homepage-video.mp4 (same filename, no code changes needed)
// and re-export a matching public/homepage-video-poster.jpg still
// frame — the current poster is auto-extracted from this raw clip at
// 0:22 ("...turn into your own skincare creation") and won't match a
// re-trimmed edit.
// ============================================================

import { PillButton } from '@/components/PillButton';
import { C, FONT_DISPLAY, FONT_BODY } from '@/lib/theme';

const VIDEO_SRC = '/homepage-video.mp4';
const POSTER_SRC = '/homepage-video-poster.jpg';

export function VideoMoment() {
  return (
    <section style={{ background: C.parchment }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '8px 20px 56px', textAlign: 'center' }}>
        <p
          style={{
            margin: 0,
            fontFamily: FONT_BODY,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: C.gold,
          }}
        >
          Watch
        </p>
        <h2
          style={{
            margin: '8px 0 12px',
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: 'clamp(24px,3.6vw,32px)',
            color: C.forest,
          }}
        >
          See a Workshop in Action
        </h2>
        <p
          style={{
            margin: '0 auto 28px',
            maxWidth: 480,
            fontFamily: FONT_BODY,
            fontSize: 15,
            lineHeight: 1.7,
            color: C.bark,
          }}
        >
          A minute inside the studio says more than we ever could in words.
        </p>

        <div
          style={{
            position: 'relative',
            borderRadius: 24,
            overflow: 'hidden',
            aspectRatio: '16 / 9',
            background: C.forest,
            boxShadow: '0 20px 44px rgba(45,70,57,0.18)',
          }}
        >
          {/*
            preload="metadata" — not "auto" — on purpose: this plays
            below the fold for mobile visitors on Thai tourist SIM
            data, so we fetch just enough to know duration/dimensions
            up front and let `poster` carry the section visually
            until a visitor actually presses play.
          */}
          <video
            controls
            muted
            loop
            playsInline
            preload="metadata"
            poster={POSTER_SRC}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
          >
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>
        </div>

        <div style={{ marginTop: 32 }}>
          <PillButton href="/book" size="lg">
            Book Your Workshop
          </PillButton>
        </div>
      </div>
    </section>
  );
}
