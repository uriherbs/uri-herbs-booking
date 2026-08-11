// ============================================================
// src/components/LeafFrame.tsx
// ============================================================
// Signature Uri Herbs motif: wraps any photo/placeholder with two
// small hand-drawn leaf sprigs peeking out from opposite corners
// (top-left + bottom-right). The wrapped content sits on a small
// padded, rounded surface so the leaves appear to grow from behind
// the corners rather than sit on top of the image.
//
// Ported from the uri-herbs-v0-design mockup (components/leaf-frame.tsx),
// which used Tailwind classes + CSS custom properties (var(--sage),
// var(--card)). This version uses plain inline styles + hex colors
// from src/lib/theme.ts to match how the rest of this project is
// styled (no Tailwind here).
// ============================================================

import type { CSSProperties, ReactNode } from 'react';
import { C } from '@/lib/theme';

function Leaf({ transform }: { transform: string }) {
  return (
    <g transform={transform}>
      {/* blade */}
      <path d="M0 0 C -9 -6, -9 -20, 0 -30 C 9 -20, 9 -6, 0 0 Z" fill={C.sage} />
      {/* subtle darker edge for depth */}
      <path
        d="M0 0 C -9 -6, -9 -20, 0 -30 C 9 -20, 9 -6, 0 0 Z"
        fill="none"
        stroke={C.sage}
        strokeOpacity={0.35}
        strokeWidth={1}
      />
      {/* midrib */}
      <path d="M0 -1 L 0 -28" stroke={C.white} strokeOpacity={0.55} strokeWidth={1} strokeLinecap="round" />
      {/* side veins */}
      <path d="M0 -8 C -3 -11, -5 -12, -6 -14" stroke={C.white} strokeOpacity={0.45} strokeWidth={0.8} fill="none" strokeLinecap="round" />
      <path d="M0 -8 C 3 -11, 5 -12, 6 -14" stroke={C.white} strokeOpacity={0.45} strokeWidth={0.8} fill="none" strokeLinecap="round" />
      <path d="M0 -15 C -3 -18, -4 -19, -5 -21" stroke={C.white} strokeOpacity={0.45} strokeWidth={0.8} fill="none" strokeLinecap="round" />
      <path d="M0 -15 C 3 -18, 4 -19, 5 -21" stroke={C.white} strokeOpacity={0.45} strokeWidth={0.8} fill="none" strokeLinecap="round" />
    </g>
  );
}

function LeafBranch({ style, mirrored = false }: { style?: CSSProperties; mirrored?: boolean }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      style={{ ...style, transform: mirrored ? 'scaleX(-1)' : undefined }}
    >
      <g opacity={0.6}>
        {/* main stem, growing from the corner outward */}
        <path d="M16 16 C 34 30, 52 52, 66 86" stroke={C.sage} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        {/* paired leaves fanning off the stem, alternating sides */}
        <Leaf transform="translate(24 26) rotate(-58)" />
        <Leaf transform="translate(30 30) rotate(28)" />
        <Leaf transform="translate(40 44) rotate(-42)" />
        <Leaf transform="translate(46 50) rotate(46)" />
        <Leaf transform="translate(56 68) rotate(-24)" />
        <Leaf transform="translate(62 78) rotate(20)" />
      </g>
    </svg>
  );
}

interface LeafFrameProps {
  children: ReactNode;
  style?: CSSProperties;
  /** Rounds the inner surface. Use "full" for circular images. */
  rounded?: 'default' | 'full';
  /** Pixel size of the decorative leaf branches. */
  leafSize?: number;
}

export function LeafFrame({ children, style, rounded = 'default', leafSize = 56 }: LeafFrameProps) {
  const branchStyle: CSSProperties = { position: 'absolute', width: leafSize, height: leafSize, zIndex: 0, pointerEvents: 'none' };

  return (
    <div style={{ position: 'relative', display: 'inline-block', padding: 18, ...style }}>
      <LeafBranch style={{ ...branchStyle, left: -8, top: -12 }} />
      <LeafBranch style={{ ...branchStyle, right: -8, top: -12 }} mirrored />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          overflow: 'hidden',
          background: C.white,
          boxShadow: '0 1px 3px rgba(45,70,57,0.08)',
          borderRadius: rounded === 'full' ? '50%' : 20,
        }}
      >
        {children}
      </div>
    </div>
  );
}
