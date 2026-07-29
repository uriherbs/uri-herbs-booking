// =======================================================
// src/app/admin/login/page.tsx
// =======================================================
'use client';

import { Suspense } from 'react';
import AdminLoginContent from './login-content';

export const dynamic = 'force-dynamic';

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '50px', color: '#6B8F71' }}>Loading...</div>}>
      <AdminLoginContent />
    </Suspense>
  );
}
