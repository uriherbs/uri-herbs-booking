// ============================================================
// src/app/admin/layout.tsx
// ============================================================
// Applies to EVERY route under /admin, including /admin/login.
// Only provides AuthProvider (the login page needs useAuth() to
// call signIn()) — it deliberately does NOT wrap children in
// <ProtectedRoute> here, because that would also gate the login
// page itself, making it unreachable by definition.
//
// ProtectedRoute instead lives in admin/(protected)/layout.tsx —
// a route group that covers the dashboard and every other real
// admin page, but not /admin/login. Route groups (parentheses)
// don't add a URL segment, so (protected)/page.tsx still serves
// at exactly /admin.
// ============================================================

import { AuthProvider } from '@/lib/auth-context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
