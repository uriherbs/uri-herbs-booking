'use client';

// Small shared status boxes for the embedded Stripe/PayPal widgets.
// Colors are duplicated from /book/page.tsx's local `C` design-token
// object (not exported from that file) rather than pulling in a
// bigger refactor just for a few hex values here.

const C = {
  coral: '#C07A6E',
  coralLight: '#FCEAE6',
  barkLight: '#8A7668',
  mist: '#F0EDE6',
};

export function PaymentErrorBox({ message, style }: { message: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: C.coralLight, borderRadius: 10, padding: '10px 14px',
        fontFamily: "'DM Sans'", fontSize: 13, color: C.coral, lineHeight: 1.5,
        ...style,
      }}
    >
      {message}
    </div>
  );
}

export function PaymentLoadingBox({ label, style }: { label: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: C.mist, borderRadius: 10, padding: '14px', textAlign: 'center',
        fontFamily: "'DM Sans'", fontSize: 13, color: C.barkLight,
        ...style,
      }}
    >
      {label}
    </div>
  );
}
