// ============================================================
// src/components/legal/LegalTheme.tsx
// ============================================================
// Color tokens + the shared "how to reach us" card, split out on
// their own so LegalPageLayout, LegalBlocks, and LegalModal can all
// import them without a circular dependency (LegalPageLayout also
// needs LegalBlocks, and LegalBlocks needs ContactCard).
// ============================================================

export const C = {
  sage: '#6B8F71',
  sageDark: '#4A7050',
  sageLight: '#E7EFEA',
  forest: '#2D4639',
  parchment: '#F8F5EF',
  white: '#FFFFFF',
  gold: '#A89068',
  goldLight: '#F5F0E5',
  bark: '#5C4A3D',
  barkLight: '#8A7668',
  sand: '#E8E2D8',
  mist: '#F0EDE6',
  coral: '#C07A6E',
  coralLight: '#FCEAE6',
};

// Same visual language as the info cards on /contact.
export function ContactCard({ email, phone, address }: { email: string; phone: string; address?: string }) {
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.sand}`, borderRadius: 12,
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4,
    }}>
      <a href={`mailto:${email}`} style={{ fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 600, color: C.sageDark }}>
        {email}
      </a>
      <a href={`tel:${phone.replace(/\s/g, '')}`} style={{ fontFamily: "'DM Sans'", fontSize: 15, color: C.forest }}>
        {phone}
      </a>
      {address && (
        <span style={{ fontFamily: "'DM Sans'", fontSize: 14, color: C.barkLight }}>{address}</span>
      )}
    </div>
  );
}
