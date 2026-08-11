// ============================================================
// src/components/PillButton.tsx
// ============================================================
// Small rounded CTA button/link used across the public marketing
// pages (Home hero, Intro section, SiteHeader "Book Now"). Renders
// a Next.js <Link> when given an `href`, otherwise a <button>.
//
// Same idea as the PillButton in the uri-herbs-v0-design mockup,
// rebuilt with inline styles + hex colors from src/lib/theme.ts
// instead of Tailwind utility classes + shadcn's `cn()` helper,
// since neither exists in this project.
// ============================================================

import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { C, FONT_BODY } from '@/lib/theme';

type Variant = 'primary' | 'outline';
type Size = 'md' | 'lg';

const SIZES: Record<Size, { height: number; paddingInline: number; fontSize: number }> = {
  md: { height: 44, paddingInline: 24, fontSize: 14 },
  lg: { height: 52, paddingInline: 30, fontSize: 15 },
};

function variantStyle(variant: Variant): React.CSSProperties {
  if (variant === 'outline') {
    return {
      background: 'rgba(255,255,255,0.1)',
      color: C.white,
      border: '1px solid rgba(255,255,255,0.4)',
      backdropFilter: 'blur(4px)',
    };
  }
  return { background: C.sageDark, color: C.white, border: '1px solid transparent' };
}

interface PillButtonProps {
  children: ReactNode;
  href?: string;
  variant?: Variant;
  size?: Size;
  style?: React.CSSProperties;
  className?: string;
}

export function PillButton({
  children,
  href,
  variant = 'primary',
  size = 'md',
  style,
  className = '',
  ...rest
}: PillButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement> & ButtonHTMLAttributes<HTMLButtonElement>, 'style' | 'className'>) {
  const sizeStyle = SIZES[size];
  const cls = `pill-btn pill-btn-${variant} ${className}`.trim();
  const combinedStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    fontFamily: FONT_BODY,
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'transform 0.15s ease, opacity 0.15s ease',
    height: sizeStyle.height,
    paddingLeft: sizeStyle.paddingInline,
    paddingRight: sizeStyle.paddingInline,
    fontSize: sizeStyle.fontSize,
    ...variantStyle(variant),
    ...style,
  };

  const hoverStyle = (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          .pill-btn:hover { opacity: 0.92; }
          .pill-btn:active { transform: translateY(1px); }
        `,
      }}
    />
  );

  if (href) {
    return (
      <>
        {hoverStyle}
        <Link href={href} className={cls} style={combinedStyle} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
          {children}
        </Link>
      </>
    );
  }

  return (
    <>
      {hoverStyle}
      <button className={cls} style={combinedStyle} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}>
        {children}
      </button>
    </>
  );
}
