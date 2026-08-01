import Link from 'next/link';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20,
      fontFamily: 'sans-serif', background: '#F5F2EC', textAlign: 'center', padding: 24,
    }}>
      <h1 style={{ color: '#2D4639' }}>🌿 Uri Herbs Workshop</h1>
      <p style={{ color: '#5C4A3D', maxWidth: 360 }}>
        Hands-on herbal & botanical workshops in Chiang Mai Old City.
      </p>
      <Link href="/book" style={{
        background: '#6B8F71', color: '#fff', padding: '14px 28px',
        borderRadius: 12, textDecoration: 'none', fontWeight: 700,
      }}>
        Book a Workshop
      </Link>
    </div>
  );
}
