// ============================================================
// Supabase Client  (singleton for Next.js)
// ============================================================
// Uses createBrowserClient (not the plain createClient) so the
// session is persisted in COOKIES, not just localStorage. This
// is required for middleware.ts to see the logged-in session —
// middleware reads cookies via createServerClient, and a client
// that only writes to localStorage is invisible to it, causing
// an infinite redirect-to-login loop even after a real sign-in.

import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client (uses anon key, respects RLS, cookie-backed session)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnon);

// Server client (uses service role key, bypasses RLS — for admin routes only)
export function getServiceClient() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(supabaseUrl, serviceKey);
}
