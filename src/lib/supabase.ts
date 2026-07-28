// ============================================================
// Supabase Client  (singleton for Next.js)
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client (uses anon key, respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnon);

// Server client (uses service role key, bypasses RLS — for admin routes only)
export function getServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceKey);
}
