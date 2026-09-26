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

export const dynamic = 'force-dynamic';

export default function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      {/* Wider editing pages on laptop/desktop (phones keep the 600px column); hide the customer WhatsApp bubble so it never covers admin buttons. */}
      <style>{`.floating-whatsapp-btn { display: none !important; } @media (min-width: 1024px) { .ua-page { max-width: 960px !important; } }`}</style>
      {children}
    </ProtectedRoute>
  );
}
