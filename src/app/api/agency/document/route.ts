// ============================================================
// GET /api/agency/document?token=<portal_token>&ref=<booking_ref>&type=invoice|receipt
// ============================================================
// Invoice / receipt PDF for one of the agency's own bookings, from its
// agency page. Authorised by the agency's secret page link (portal
// token); the booking must belong to that agency. Receipts only once
// the booking is paid.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { SITE_URL } from '@/lib/notifications';
import { agencyDocPdf, agencyDocData, agencyDocFilename, AGENCY_DOC_SELECT } from '@/lib/agency-docs-pdf';

export const runtime = 'nodejs'; // react-pdf needs Node (reads fonts/logo off disk)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const token = q.get('token') || '';
  const ref = (q.get('ref') || '').trim().toUpperCase();
  const type = q.get('type') === 'receipt' ? 'receipt' : 'invoice';
  if (!/^[0-9a-f-]{36}$/i.test(token) || !/^[A-Z0-9-]{6,40}$/.test(ref)) {
    return NextResponse.json({ error: 'Invalid link' }, { status: 400 });
  }

  const db = getServiceClient();
  const { data: agency } = await db.from('agencies').select('id, status').eq('portal_token', token).maybeSingle();
  if (!agency || !['active', 'suspended'].includes(agency.status)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const { data } = await db.from('bookings').select(AGENCY_DOC_SELECT)
    .eq('booking_ref', ref).eq('agency_id', agency.id).maybeSingle();
  const b: any = data;
  if (!b || b.status === 'cancelled') return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (type === 'receipt' && b.payment_status !== 'paid') {
    return NextResponse.json({ error: 'This booking is not paid yet.' }, { status: 409 });
  }

  try {
    const pdf = await agencyDocPdf(agencyDocData(b, type, SITE_URL));
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${agencyDocFilename(type, b.booking_ref)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error(`agency ${type} PDF failed for ${ref}:`, err?.message);
    return NextResponse.json({ error: 'Could not create the PDF right now. Please try again.' }, { status: 500 });
  }
}
