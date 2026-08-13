// ============================================================
// URI HERBS WORKSHOP — Protected Route Wrapper
// ============================================================
// Client-side companion to middleware.ts. Middleware stops
// unauthenticated requests at the edge; this component handles
// the case middleware intentionally skips — a valid Supabase
// session belonging to someone who is NOT (or no longer) on the
// admin_staff allowlist — and shows a proper "access denied"
// screen instead of a broken dashboard full of failed queries.
//
// Usage:
//   <AuthProvider>
//     <ProtectedRoute>
//       <AdminDashboard />
//     </ProtectedRoute>
//   </AuthProvider>
// ============================================================

'use client';

import { ReactNode } from 'react';
import { useAuth } from './auth-context';

const C = {
  sage: '#6B8F71',
  forest: '#2D4639',
  parchment: '#F5F2EC',
  white: '#FFFFFF',
  gold: '#A89068',
  bark: '#5C4A3D',
  barkLight: '#8A7668',
  sand: '#E8E2D8',
  coral: '#C07A6E',
  coralLight: '#FCEAE6',
};

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: C.parchment, fontFamily: "'DM Sans', sans-serif",
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url(https://fonts.googleapis.com/css2?family=DM+Sans:wght@500&display=swap);
        @keyframes uri-spin { to { transform: rotate(360deg); } }
      ` }} />
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: `3px solid ${C.sand}`, borderTopColor: C.sage,
        animation: 'uri-spin 0.8s linear infinite',
      }} />
      <span style={{ fontSize: 14, color: C.barkLight }}>Checking access…</span>
    </div>
  );
}

function AccessDeniedScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.parchment, fontFamily: "'DM Sans', sans-serif", padding: 24,
    }}>
      <div style={{
        maxWidth: 380, width: '100%', background: C.white, borderRadius: 16,
        border: `1.5px solid ${C.sand}`, padding: '32px 28px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{
          fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 20, fontWeight: 700,
          color: C.forest, marginBottom: 8,
        }}>Access Restricted</div>
        <p style={{ fontSize: 14, color: C.bark, lineHeight: 1.6, marginBottom: 24 }}>
          You're signed in, but this account isn't on our admin team list.
          Contact Mali if you believe this is a mistake.
        </p>
        <button onClick={onSignOut} style={{
          width: '100%', padding: '12px 20px', borderRadius: 10,
          background: 'transparent', border: `1.5px solid ${C.sage}`,
          color: C.sage, fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600,
          cursor: 'pointer',
        }}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { admin, loading, signOut } = useAuth();

  if (loading) return <LoadingScreen />;

  // Middleware already guarantees a valid Supabase session reached this
  // point. If `admin` is still null here, the session is real but the
  // user isn't an active admin_staff member — show denial, not a redirect
  // loop (middleware only checks session existence, not the allowlist).
  if (!admin) return <AccessDeniedScreen onSignOut={signOut} />;

  return <>{children}</>;
}
