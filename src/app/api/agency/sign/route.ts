// POST /api/agency/sign { token, name, agree } — the agency accepts the
// partner agreement. Records name, time, IP, contract version and a
// plain-text copy of exactly what was accepted (rates included), then
// activates the agency and emails the partner-page link.
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { CONTRACT_VERSION, contractText, rateRows } from '@/lib/agency-contract';
import { sendWelcomeEmails } from '@/lib/agency-emails';
import { agencyContractPdf, agencyContractPdfName } from '@/lib/agency-contract-pdf';

export const runtime = 'nodejs'; // the PDF attachment is built with react-pdf

export async function POST(request: NextRequest) {
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }); }
  const token = typeof body.token === 'string' ? body.token : '';
  const name = typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '';
  if (!/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
  if (!body.agree || name.length < 3) return NextResponse.json({ error: 'Please tick the box and type your full name.' }, { status: 400 });

  const db = getServiceClient();
  const { data: a } = await db.from('agencies').select('*').eq('contract_token', token).maybeSingle();
  if (!a) return NextResponse.json({ error: 'Invalid link' }, { status: 404 });
  if (a.status === 'active') return NextResponse.json({ ok: true, already: true });
  if (a.status !== 'approved') return NextResponse.json({ error: 'This agreement is not open for signing.' }, { status: 409 });

  const { data: pk } = await db.from('packages').select('slug, price_thb, package_prices ( valid_from, price_thb )').eq('is_active', true);
  const pkgs = (pk || []).map((p: any) => ({
    slug: p.slug, price: p.price_thb,
    prices: (p.package_prices || []).map((r: any) => ({ from: String(r.valid_from).slice(0, 10), price: r.price_thb })),
  }));
  const signedAt = new Date().toISOString();
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
  const text = contractText(a, rateRows(pkgs, Number(a.commission_pct)), {
    name, at: new Date(signedAt).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' }) + ' (Chiang Mai time)', ip,
  });

  const { data: updated, error } = await db.from('agencies').update({
    status: 'active', signed_name: name, signed_at: signedAt, signed_ip: ip,
    contract_version: CONTRACT_VERSION, contract_snapshot: text, updated_at: signedAt,
  }).eq('id', a.id).eq('status', 'approved').select('*').maybeSingle();
  if (error || !updated) return NextResponse.json({ error: 'Could not save — please try again.' }, { status: 500 });

  // Signed agreement as a PDF attachment — best effort: if it fails the
  // emails still go out (the PDF can be downloaded from the agreement page).
  let pdf: { filename: string; content: string } | null = null;
  try {
    pdf = { filename: agencyContractPdfName(updated.company_name), content: (await agencyContractPdf(text)).toString('base64') };
  } catch (err: any) {
    console.error('agency contract PDF for email failed:', err?.message);
  }
  await sendWelcomeEmails(updated, text, pdf);
  return NextResponse.json({ ok: true, portal_token: updated.portal_token });
}
