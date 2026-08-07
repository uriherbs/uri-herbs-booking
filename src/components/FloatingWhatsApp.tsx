// ============================================================
// src/components/FloatingWhatsApp.tsx
// ============================================================
// Site-wide floating WhatsApp button. Rendered once in the root
// layout (src/app/layout.tsx) so it appears on every route,
// including /admin — a plain anchor, no client JS/state needed.
//
// Positioning note: both the booking flow (/book) and the CMS
// edit screen (/admin/content/[slug]) already have their own
// full-width sticky action bar pinned to the bottom of the
// viewport (~80-95px tall). `bottom: 100px` keeps this button
// clear of both instead of sitting on top of their primary
// button — bottom-right is the placement most people already
// recognize from other sites' WhatsApp widgets.
// ============================================================

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '66643349890';
const WHATSAPP_GREEN = '#25D366'; // same brand green already used for the WhatsApp CTA in notifications.ts

export default function FloatingWhatsApp() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      title="Chat with us on WhatsApp"
      style={{
        position: 'fixed',
        bottom: 100,
        right: 20,
        zIndex: 1000,
        width: 54,
        height: 54,
        borderRadius: '50%',
        background: WHATSAPP_GREEN,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
        transition: 'transform 0.15s ease',
      }}
      className="floating-whatsapp-btn"
    >
      <style>{`
        .floating-whatsapp-btn:hover { transform: scale(1.06); }
        .floating-whatsapp-btn:active { transform: scale(0.96); }
        @media (max-width: 480px) {
          .floating-whatsapp-btn { bottom: 92px !important; right: 14px !important; width: 50px !important; height: 50px !important; }
        }
      `}</style>
      <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 004.74 1.21h.005c5.46 0 9.9-4.45 9.9-9.92 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0012.04 2zm0 1.67c2.2 0 4.27.86 5.82 2.42a8.2 8.2 0 012.42 5.82c0 4.55-3.7 8.25-8.25 8.25a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 01-1.26-4.38c0-4.55 3.71-8.25 8.25-8.25zm-4.53 4.7c-.16 0-.43.06-.65.31-.22.25-.86.84-.86 2.04 0 1.2.88 2.37 1 2.53.13.17 1.72 2.76 4.26 3.76 2.11.83 2.54.67 3 .62.46-.04 1.48-.6 1.68-1.19.21-.58.21-1.08.15-1.19-.06-.1-.23-.17-.48-.29-.25-.13-1.48-.73-1.71-.81-.23-.08-.4-.13-.56.13-.17.25-.65.81-.79.98-.15.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.44.12-.15.16-.25.24-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.37-.78-1.87-.2-.49-.41-.42-.56-.43-.14-.01-.31-.01-.47-.01z"/>
      </svg>
    </a>
  );
}
