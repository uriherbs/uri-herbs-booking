// /api/agency/proof — bank-transfer slips for agency bookings.
//   POST (multipart: token, booking_id, file) — agency uploads a slip
//        for one of its unpaid bookings → private bucket payment-proofs,
//        shop gets an email to check and mark it paid.
//   GET ?booking_id=… (Authorization: Bearer <admin session>) — a
//        10-minute link to view the slip, admins only.
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { sendSlipReceivedEmail } from '@/lib/agency-emails';

const MAX_BYTES = 8 * 1024 * 1024;
const TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'application/pdf': 'pdf' };

export async function POST(request: NextRequest) {
  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: 'Invalid upload' }, { status: 400 }); }
  const token = String(form.get('token') || '');
  const bookingId = String(form.get('booking_id') || '');
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Please choose a file.' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'File is too large (max 8 MB).' }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: 'Please upload a photo (JPG/PNG) or PDF of the slip.' }, { status: 400 });

  const db = getServiceClient();
  const { data: a } = await db.from('agencies').select('id, status').eq('portal_token', token).maybeSingle();
  if (!a || a.status !== 'active') return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  const { data: b } = await db.from('bookings').select('id, status, payment_status')
    .eq('id', bookingId).eq('agency_id', a.id).maybeSingle();
  if (!b || b.status !== 'confirmed' || b.payment_status !== 'unpaid') {
    return NextResponse.json({ error: 'This booking is not waiting for payment.' }, { status: 409 });
  }

  const path = `${b.id}/${Date.now()}.${ext}`;
  const { error: upErr } = await db.storage.from('payment-proofs').upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (upErr) {
    console.error('slip upload failed:', upErr.message);
    return NextResponse.json({ error: 'Upload failed — please try again.' }, { status: 500 });
  }
  await db.from('bookings').update({ payment_proof_path: path, payment_proof_at: new Date().toISOString() }).eq('id', b.id);
  await sendSlipReceivedEmail(db, b.id);
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  const bookingId = request.nextUrl.searchParams.get('booking_id') || '';
  const jwt = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const db = getServiceClient();
  const { data: userData } = await db.auth.getUser(jwt);
  const uid = userData?.user?.id;
  if (!uid) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  const { data: staff } = await db.from('admin_staff').select('id').eq('id', uid).eq('is_active', true).maybeSingle();
  if (!staff) return NextResponse.json({ error: 'Admins only' }, { status: 403 });
  const { data: b } = await db.from('bookings').select('payment_proof_path').eq('id', bookingId).maybeSingle();
  if (!b?.payment_proof_path) return NextResponse.json({ error: 'No slip uploaded' }, { status: 404 });
  const { data: signed, error } = await db.storage.from('payment-proofs').createSignedUrl(b.payment_proof_path, 600);
  if (error || !signed) return NextResponse.json({ error: 'Could not open the slip' }, { status: 500 });
  return NextResponse.json({ url: signed.signedUrl });
}
