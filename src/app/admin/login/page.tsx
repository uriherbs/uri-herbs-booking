// ============================================================
// src/app/admin/login/page.tsx
// ============================================================
// This is the WIRED version — same visual design as
// admin-login.jsx (the standalone preview artifact), but calling
// the real useAuth().signIn() instead of simulated logic. Kept
// as a separate file from the artifact so the artifact can stay
// framework-agnostic for design review, while this is the actual
// route that ships.
// ============================================================

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { requestPasswordReset } from '@/lib/auth';
export const dynamic = 'force-dynamic';
const C = {
  sage: '#6B8F71', forest: '#2D4639', parchment: '#F5F2EC', white: '#FFFFFF',
  gold: '#A89068', bark: '#5C4A3D', barkLight: '#8A7668', sand: '#E8E2D8',
  mist: '#F0EDE6', coral: '#C07A6E', coralLight: '#FCEAE6', sageLight: '#E7EFEA',
};

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      const redirectTo = searchParams.get('redirectTo') || '/admin';
      router.push(redirectTo);
    } catch (err: any) {
      setError(err.message || 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Enter your email first, then request a reset link.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasError: boolean) => ({
    width: '100%', boxSizing: 'border-box' as const,
    fontFamily: "'DM Sans', sans-serif", fontSize: 16,
    padding: '13px 14px', borderRadius: 10,
    border: `1.5px solid ${hasError ? C.coral : C.sand}`,
    background: hasError ? C.coralLight : C.white,
    color: C.forest, outline: 'none',
  });

  return (
<Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.parchment }}>Loading...</div>}>
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.parchment, fontFamily: "'DM Sans', sans-serif", padding: 20,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        input:focus { border-color: ${C.sage} !important; box-shadow: 0 0 0 3px ${C.sageLight}; }
        @keyframes uri-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{
        width: '100%', maxWidth: 400, background: C.white, borderRadius: 20,
        border: `1.5px solid ${C.sand}`, overflow: 'hidden',
        boxShadow: '0 8px 40px rgba(45,70,57,0.10)',
      }}>
        <div style={{ background: C.forest, padding: '36px 32px 30px', textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
            fontSize: 24,
          }}>🌿</div>
          <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 23, fontWeight: 700, color: '#fff' }}>
            Uri Herbs Workshop
          </div>
          <div style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.65)',
            marginTop: 4, letterSpacing: '0.05em', textTransform: 'uppercase',
          }}>Staff Admin Portal</div>
        </div>

        <div style={{ padding: '28px 32px 32px' }}>
          {mode === 'login' ? (
            <>
              <h1 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 20, fontWeight: 600, color: C.forest, margin: '0 0 4px', textAlign: 'center' }}>
                Welcome back
              </h1>
              <p style={{ fontSize: 13, color: C.barkLight, margin: '0 0 24px', textAlign: 'center' }}>
                Sign in to manage bookings & schedules
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.forest, marginBottom: 6, display: 'block' }}>Email</label>
                  <input type="email" placeholder="mali@uriherbs.com" value={email}
                    onChange={e => { setEmail(e.target.value); setError(null); }}
                    style={inputStyle(!!error)} autoComplete="username" />
                </div>

                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: C.forest, marginBottom: 6, display: 'block' }}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
                      onChange={e => { setPassword(e.target.value); setError(null); }}
                      style={{ ...inputStyle(!!error), paddingRight: 44 }} autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.barkLight }}>
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: 'right', marginBottom: 20 }}>
                  <button type="button" onClick={() => { setMode('reset'); setError(null); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.sage, fontWeight: 600, padding: 0 }}>
                    Forgot password?
                  </button>
                </div>

                {error && (
                  <div style={{ background: C.coralLight, border: `1px solid rgba(192,122,110,0.3)`, borderRadius: 10, padding: '10px 12px', marginBottom: 18, fontSize: 12.5, color: C.coral, lineHeight: 1.5 }}>
                    ⚠ {error}
                  </div>
                )}

                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none',
                  background: loading ? C.sand : C.sage, color: loading ? C.barkLight : '#fff',
                  fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 16px rgba(107,143,113,0.3)',
                }}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 20, fontWeight: 600, color: C.forest, margin: '0 0 4px', textAlign: 'center' }}>
                Reset password
              </h1>
              <p style={{ fontSize: 13, color: C.barkLight, margin: '0 0 24px', textAlign: 'center', lineHeight: 1.5 }}>
                We'll email you a secure link to set a new password
              </p>

              {resetSent ? (
                <div style={{ background: C.sageLight, borderRadius: 12, padding: '20px 18px', textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📧</div>
                  <div style={{ fontSize: 13, color: C.forest, lineHeight: 1.6 }}>
                    If <strong>{email}</strong> has admin access, a reset link is on its way.
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResetRequest}>
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: C.forest, marginBottom: 6, display: 'block' }}>Email</label>
                    <input type="email" placeholder="mali@uriherbs.com" value={email}
                      onChange={e => { setEmail(e.target.value); setError(null); }} style={inputStyle(!!error)} />
                  </div>
                  {error && (
                    <div style={{ background: C.coralLight, borderRadius: 10, padding: '10px 12px', marginBottom: 16, fontSize: 12.5, color: C.coral }}>
                      ⚠ {error}
                    </div>
                  )}
                  <button type="submit" disabled={loading} style={{
                    width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none',
                    background: loading ? C.sand : C.sage, color: loading ? C.barkLight : '#fff',
                    fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', marginBottom: 12,
                  }}>
                    {loading ? 'Sending…' : 'Send Reset Link'}
                  </button>
                </form>
              )}

              <button onClick={() => { setMode('login'); setError(null); setResetSent(false); }}
                style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: C.sage, fontWeight: 600, padding: 8 }}>
                ← Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
 </Suspense>
  );
}
