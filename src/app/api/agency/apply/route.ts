// POST /api/agency/apply — travel agency / group leader application
// from /trade. Saved as an `agencies` row with status 'pending' (admin
// approves in Admin → Agencies); the shop and the applicant get emails.
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { sendApplicationEmails } from '@/lib/agency-emails';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const s = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function POST(request: NextRequest) {
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  if (s(body.website_hp)) return NextResponse.json({ ok: true }); // honeypot

  const row = {
    company_name: s(body.company_name, 200),
    contact_name: s(body.contact_name, 200) || null,
    email: s(body.email, 200).toLowerCase(),
    phone: s(body.phone, 100) || null,
    country: s(body.country, 100) || null,
    website: s(body.website, 300) || null,
    license_no: s(body.license_no, 100) || null,
    business_type: s(body.business_type, 100) || null,
    monthly_groups: s(body.monthly_groups, 100) || null,
    message: s(body.message, 3000) || null,
  };
  if (!row.company_name) return NextResponse.json({ error: 'Please enter your company or business name.' }, { status: 400 });
  if (!EMAIL_RE.test(row.email)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });

  const db = getServiceClient();
  // One open application per email — a repeat just re-sends the emails.
  const { data: existing } = await db.from('agencies').select('id, status')
    .ilike('email', row.email).in('status', ['pending', 'approved', 'active']).maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, existing: existing.status });
  }
  const { data, error } = await db.from('agencies').insert(row).select('*').single();
  if (error || !data) {
    console.error('agency apply insert failed:', error?.message);
    return NextResponse.json({ error: 'Something went wrong — please try again or WhatsApp us.' }, { status: 500 });
  }
  await sendApplicationEmails(data);
  return NextResponse.json({ ok: true });
}
