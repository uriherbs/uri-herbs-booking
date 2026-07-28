// ============================================================
// URI HERBS WORKSHOP — Route Protection Middleware
// ============================================================
// Runs on the EDGE, before any /admin page renders. This is the
// real security boundary — the React <ProtectedRoute> wrapper is
// a UX nicety (avoids a flash of dashboard content) but middleware
// is what actually stops an unauthenticated request from ever
// reaching the admin page's server render.
//
// Place this file at the project root (same level as /src or /app).
// ============================================================

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isLoginRoute = request.nextUrl.pathname === '/admin/login';

  // Not logged in + trying to reach a protected admin page → bounce to login
  if (isAdminRoute && !isLoginRoute && !user) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already logged in + visiting the login page → send to dashboard
  if (isLoginRoute && user) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // NOTE: this only confirms a valid Supabase session exists — it does
  // NOT check admin_staff.is_active. That's intentional: middleware runs
  // on every request and should stay fast/cheap (no extra DB round trip).
  // The admin_staff check happens in <ProtectedRoute> (client) AND is
  // enforced again by every RLS policy / RPC function server-side, so a
  // logged-in-but-deactivated user still can't read or write real data —
  // they'd just see the dashboard shell with empty/failed data calls.

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
