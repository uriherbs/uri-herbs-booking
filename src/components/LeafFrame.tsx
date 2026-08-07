// ============================================================
// src/components/LeafFrame.tsx
// ============================================================
// Decorative wrapper for photos/video: two small leaf sprigs sit
// behind opposite corners (top-left, bottom-right), peeking out
// from the margin around the media rather than sitting on top of
// it. Inline SVG, brand green (#6B8F71) at ~50% opacity, kept
// deliberately subtle — this frames the image, it doesn't compete
// with it.
//
// Server-component safe (no hooks/state), so it works both in
// regular JSX ('use client' pages) and in React.createElement
// calls from Server Components, e.g. workshops/[slug]/page.tsx.
//
// Usage:
//   <LeafFrame>
//     <div style={{ borderRadius: 16, overflow: 'hidden' }}>
//       <img ... />
//     </div>
//   </LeafFrame>
// The rounding/clipping belongs on your own inner wrapper (as
// above) — LeafFrame itself stays overflow:visible so the sprigs
// aren't clipped by it.
// ============================================================

import * as React from 'react';

const LEAF_GREEN = '#6B8F71';

// A simple pointed-oval leaf with a center vein — reads clearly as
// "a leaf" even at the small size a corner accent renders at, unlike
// the site's thinner brand glyph (SiteHeader, etc.), which vanishes
// below ~20px. Still the same brand green, just a bolder silhouette
// for this specific decorative use.
function Leaf({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      <path
        d="M0,0 C7,-4 12,-12 12,-21 C12,-30 7,-38 0,-42 C-7,-38 -12,-30 -12,-21 C-12,-12 -7,-4 0,0 Z"
        fill={LEAF_GREEN}
      />
      <path d="M0,-2 L0,-39" stroke="#4A7050" strokeWidth={1.1} strokeLinecap="round" opacity={0.5} />
    </g>
  );
}

function LeafSprig({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width={64} height={64} viewBox="0 0 100 100" style={style} aria-hidden="true">
      <g opacity={0.5}>
        <path
          d="M10,92 C 16,72 20,54 32,40 C 42,28 50,20 58,8"
          fill="none" stroke={LEAF_GREEN} strokeWidth={2.5} strokeLinecap="round"
        />
        <Leaf transform="translate(16,80) rotate(-125) scale(0.75)" />
        <Leaf transform="translate(32,50) rotate(-55) scale(0.85)" />
        <Leaf transform="translate(52,20) rotate(-100) scale(0.9)" />
      </g>
    </svg>
  );
}

export interface LeafFrameProps {
  // Optional in the type only so React.createElement(LeafFrame, props, ...children)
  // type-checks from Server Components (e.g. workshops/[slug]/page.tsx) — children
  // passed that way land here at runtime regardless of this being marked optional.
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Sprig size in px. Default 56 — smaller for compact/thumbnail images. */
  cornerSize?: number;
  /** How far the sprigs sit outside the media's own box, in px. Default 16. */
  inset?: number;
}

export default function LeafFrame({ children, className, style, cornerSize = 56, inset = 16 }: LeafFrameProps) {
  return (
    <div className={className} style={{ position: 'relative', ...style }}>
      <LeafSprig style={{
        position: 'absolute', top: -inset, left: -inset,
        width: cornerSize, height: cornerSize, zIndex: 0, pointerEvents: 'none',
      }} />
      <LeafSprig style={{
        position: 'absolute', bottom: -inset, right: -inset,
        width: cornerSize, height: cornerSize, zIndex: 0, pointerEvents: 'none',
        transform: 'rotate(180deg)',
      }} />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}
