// POST /api/agency/login-link { email } — re-sends an active agency its
// partner-page link. Always answers ok (doesn't reveal who is a partner).
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { sendLoginLinkEmail } from '@/lib/agency-emails';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // 5 link requests per 15 minutes per connection — every request can send an email.
  const rate = await checkRateLimit('agency-login-link', getClientIp(request), { maxHits: 5, windowSeconds: 15 * 60 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: 'Too many tries from this connection. Please wait a few minutes and try again, or message us on WhatsApp.' },
      { status: 429 }
    );
  }
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: true }); }
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) return NextResponse.json({ ok: true });
  const db = getServiceClient();
  const { data: rows } = await db.from('agencies').select('*').ilike('email', email).eq('status', 'active');
  for (const a of rows || []) await sendLoginLinkEmail(a);
  return NextResponse.json({ ok: true });
}
