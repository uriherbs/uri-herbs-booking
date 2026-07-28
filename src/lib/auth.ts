// ============================================================
// URI HERBS WORKSHOP — Admin Auth Service
// ============================================================
// Wraps Supabase Auth (email/password) + the admin_staff
// allowlist check. A successful login does NOT imply admin
// access — isAdmin() must also return true.
// ============================================================

import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'staff';
  is_active: boolean;
}

export interface AuthResult {
  user: User;
  session: Session;
  admin: AdminProfile;
}

export class AuthError extends Error {
  code: 'INVALID_CREDENTIALS' | 'NOT_ADMIN' | 'UNKNOWN';
  constructor(code: AuthError['code'], message: string) {
    super(message);
    this.code = code;
  }
}

// ────────────────────────────────────────────────────────────
// Sign in — validates credentials AND admin allowlist membership
// ────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error || !data.session || !data.user) {
    throw new AuthError('INVALID_CREDENTIALS', 'Incorrect email or password.');
  }

  // Login succeeded — now verify they're an active admin
  const admin = await fetchAdminProfile(data.user.id);

  if (!admin) {
    // Valid Supabase Auth user, but NOT on the admin allowlist
    // (or has been deactivated). Sign them back out immediately —
    // we never want a "half-logged-in" state.
    await supabase.auth.signOut();
    throw new AuthError('NOT_ADMIN', 'This account does not have admin access. Contact Mali for access.');
  }

  return { user: data.user, session: data.session, admin };
}

// ────────────────────────────────────────────────────────────
// Sign out
// ────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// ────────────────────────────────────────────────────────────
// Fetch admin_staff row for a given auth user id
// ────────────────────────────────────────────────────────────

export async function fetchAdminProfile(userId: string): Promise<AdminProfile | null> {
  const { data, error } = await supabase
    .from('admin_staff')
    .select('id, email, full_name, role, is_active')
    .eq('id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;
  return data as AdminProfile;
}

// ────────────────────────────────────────────────────────────
// Get current session (used on page load / refresh)
// ────────────────────────────────────────────────────────────

export async function getCurrentSession(): Promise<{ session: Session; admin: AdminProfile } | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;

  const admin = await fetchAdminProfile(data.session.user.id);
  if (!admin) return null; // logged in but not an admin — treat as signed out

  return { session: data.session, admin };
}

// ────────────────────────────────────────────────────────────
// Password reset (for staff who forget credentials)
// ────────────────────────────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/admin/reset-password`,
  });
  if (error) throw new AuthError('UNKNOWN', error.message);
}
