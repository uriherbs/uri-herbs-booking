// ============================================================
// src/app/admin/(protected)/page.tsx
// ============================================================
// Serves at /admin (route group folder name doesn't add a URL
// segment). ProtectedRoute already guarantees `admin` is non-null
// by the time this renders — see admin/(protected)/layout.tsx.
//
// AdminDashboard's own Sign Out button already shows a confirm()
// dialog before calling onSignOut — this handler intentionally
// does NOT confirm again, since that would show the dialog twice.
// ============================================================

'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import AdminDashboard from '@/components/AdminDashboard';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { admin, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/admin/login');
  };

  return <AdminDashboard adminName={admin?.full_name} onSignOut={handleSignOut} />;
}
