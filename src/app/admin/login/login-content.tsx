// =======================================================
// src/app/admin/login/login-content.tsx
// =======================================================
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { requestPasswordReset } from '@/lib/auth';

const C = {
  sage: '#6B8F71', forest: '#2D4639', parchment: '#F5F2EC', white: '#FFFFFF',
  gold: '#A89068', bark: '#5C4A3D', barkLight: '#8A7668', sand: '#E8E2D8',
  mist: '#F0EDE6', coral: '#C07A6E', coralLight: '#FCEAE6', sageLight: '#E7EFEA',
};

export default function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      const redirectUrl = searchParams.get('redirect') || '/admin';
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('נא להזין כתובת אימייל');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || 'שגיאה באיפוס הסיסמה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: C.parchment, padding: '20px', direction: 'rtl' }}>
      <div style={{ width: '100%', maxWidth: '400px', background: C.white, padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(92, 74, 61, 0.08)' }}>
        <h1 style={{ color: C.forest, fontSize: '24px', fontWeight: '700', marginBottom: '8px', textAlign: 'center' }}>
          {mode === 'login' ? 'כניסת מנהלים' : 'איפוס סיסמה'}
        </h1>
        <p style={{ color: C.barkLight, fontSize: '14px', marginBottom: '24px', textAlign: 'center' }}>
          {mode === 'login' ? 'מערכת ניהול uri-herbs' : 'הזן את האימייל שלך לשליחת הוראות איפוס'}
        </p>

        {error && (
          <div style={{ background: C.coralLight, color: C.coral, padding: '12px', borderRadius: '8px', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: C.forest, fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>אימייל</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${C.sand}`, outline: 'none', fontSize: '14px' }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', color: C.forest, fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${C.sand}`, outline: 'none', fontSize: '14px' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '12px', background: C.sage, color: C.white, border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', marginBottom: '12px' }}
            >
              {loading ? 'מתחבר...' : 'התחבר'}
            </button>
            <button
              type="button"
              onClick={() => { setMode('forgot'); setError(null); }}
              style={{ width: '100%', background: 'none', border: 'none', color: C.barkLight, fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              שכחת סיסמה?
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordReset}>
            {resetSent ? (
              <div style={{ color: C.forest, textAlign: 'center', fontSize: '14px', marginBottom: '16px' }}>
                הוראות לאיפוס הסיסמה נשלחו לכתובת האימייל שלך.
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', color: C.forest, fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>אימייל</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${C.sand}`, outline: 'none', fontSize: '14px' }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: '100%', padding: '12px', background: C.sage, color: C.white, border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', marginBottom: '12px' }}
                >
                  {loading ? 'שולח...' : 'שלח קישור איפוס'}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setResetSent(false); }}
              style={{ width: '100%', background: 'none', border: 'none', color: C.sage, fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}
            >
              ← חזרה להתחברות
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
