// ============================================================
// GET /api/agency/contract-pdf?token=<contract_token>
// ============================================================
// Downloads the signed agency agreement as a PDF (agency details +
// terms + rates + signature), built from the stored text the agency
// accepted. Authorised by the same secret contract link that opens
// /agency/contract/<token>; only signed (active / paused) agreements.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { agencyContractPdf, agencyContractPdfName } from '@/lib/agency-contract-pdf';

export const runtime = 'nodejs'; // react-pdf needs Node (reads the logo off disk)
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  if (!/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.json({ error: 'Invalid link' }, { status: 400 });

  const db = getServiceClient();
  const { data: a } = await db.from('agencies')
    .select('company_name, status, contract_snapshot')
    .eq('contract_token', token).maybeSingle();
  if (!a || !['active', 'suspended'].includes(a.status) || !a.contract_snapshot) {
    return NextResponse.json({ error: 'This agreement is not signed yet.' }, { status: 404 });
  }

  try {
    const pdf = await agencyContractPdf(a.contract_snapshot);
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${agencyContractPdfName(a.company_name)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('agency contract PDF failed:', err?.message);
    return NextResponse.json({ error: 'Could not create the PDF right now. Please try again.' }, { status: 500 });
  }
}
