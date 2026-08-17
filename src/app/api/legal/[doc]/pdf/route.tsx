// ============================================================
// GET /api/legal/[doc]/pdf   (doc: 'terms' | 'privacy')
// ============================================================
// Generates the PDF fresh on every request, straight from
// legal-content.ts — the exact same data /terms, /privacy, and the
// in-checkout LegalModal read. There is no pre-generated file
// anywhere: if the Terms or Privacy text is ever edited in
// legal-content.ts, the very next download reflects it immediately,
// with nothing else to update or regenerate.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { legalDocs, type LegalDocSlug } from '@/lib/legal-content';
import { LegalPdfDocument } from '@/lib/legal-pdf';

export const runtime = 'nodejs'; // react-pdf needs Node (reads the logo file off disk) — not Edge
export const dynamic = 'force-dynamic'; // never statically cache a snapshot of the PDF

export async function GET(request: NextRequest, { params }: { params: { doc: string } }) {
  const slug = params.doc;
  if (slug !== 'terms' && slug !== 'privacy') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const doc = legalDocs[slug as LegalDocSlug];

  try {
    const buffer = await renderToBuffer(<LegalPdfDocument doc={doc} />);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${doc.pdfFilename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error(`Legal PDF generation failed for "${slug}":`, err.message);
    return NextResponse.json({ error: 'Could not generate the PDF right now. Please try again.' }, { status: 500 });
  }
}
