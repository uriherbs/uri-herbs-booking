// ============================================================
// src/app/admin/(protected)/layout.tsx
// ============================================================
// Every page inside this route group requires an active
// admin_staff record. The (protected) folder name is a Next.js
// route group — it organizes files without adding a URL segment,
// so admin/(protected)/page.tsx still serves at exactly /admin,
// and admin/(protected)/bookings/page.tsx would serve at
// /admin/bookings, etc. /admin/login lives OUTSIDE this group
// (as a sibling folder) and is therefore never wrapped by
// ProtectedRoute.
// ============================================================

import { ProtectedRoute } from '@/lib/protected-route';

export default function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}
