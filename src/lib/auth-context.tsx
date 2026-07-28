// ============================================================
// URI HERBS WORKSHOP — Auth Context
// ============================================================
// Wrap your admin layout with <AuthProvider>. Consume with
// useAuth() anywhere below it. Handles:
//   - Initial session check on load
//   - Listening for Supabase auth state changes (token refresh,
//     sign-out in another tab, session expiry)
//   - Re-verifying admin_staff membership whenever auth state changes
// ============================================================

'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from './supabase';
import { fetchAdminProfile, signIn as authSignIn, signOut as authSignOut, AuthError } from './auth';
import type { AdminProfile } from './auth';

interface AuthContextValue {
  admin: AdminProfile | null;
  loading: boolean;          // true only during the initial session check
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Initial check on mount / page refresh
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (data.session) {
        const profile = await fetchAdminProfile(data.session.user.id);
        if (mounted) setAdmin(profile);
      }
      if (mounted) setLoading(false);
    });

    // React to sign-in/sign-out/token-refresh, including events
    // triggered by another browser tab (e.g. staff logs out elsewhere)
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session) {
        const profile = await fetchAdminProfile(session.user.id);
        setAdmin(profile);
      } else {
        setAdmin(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const result = await authSignIn(email, password);
      setAdmin(result.admin);
    } catch (err) {
      const message = err instanceof AuthError ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      throw err;
    }
  };

  const signOut = async () => {
    await authSignOut();
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{ admin, loading, signIn, signOut, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
