// ============================================================
// src/lib/agency.ts
// ============================================================
// Browser-side helpers for the travel-agency (B2B) flow:
//   /trade                      → application (POST /api/agency/apply)
//   /agency/contract/<token>    → read + sign the partner agreement
//   /agency/<portal_token>      → partner page: book, pay, cancel
//   /admin/agencies             → approve, mark paid, see slips
// Public calls go through SECURITY DEFINER RPCs keyed by the secret
// token; admin calls use the signed-in admin session (RLS is_admin()).
// ============================================================

import { supabase } from './supabase';
import { getPackages } from './booking-service';
import { parseBookingError, ERROR_MESSAGES } from './types';

export interface AgencyPortal {
  agency: {
    company_name: string; contact_name: string | null; email: string; status: string;
    commission_pct: number; signed_at: string | null; contract_token: string;
  };
  bookings: AgencyBooking[];
}

export interface AgencyBooking {
  id: string; booking_ref: string; date: string; start_time: string; end_time: string;
  package: string; guests: number; private: boolean; client: string; notes: string | null;
  status: 'pending_payment' | 'confirmed' | 'cancelled' | string;
  payment_status: 'paid' | 'unpaid'; retail: number | null; net: number; due: string | null;
  proof_sent: boolean; cancel_reason: string | null; created_at: string;
  pay_deadline?: string | null; // bookings < 14 days ahead: pay within 3 h (1 h same day) of booking
}

export interface AgencyContractInfo {
  company_name: string; contact_name: string | null; email: string; country: string | null;
  phone?: string | null; website?: string | null; address?: string | null;
  license_no: string | null; tat_no?: string | null; status: string; commission_pct: number;
  signed_name: string | null; signed_at: string | null; contract_version: string | null;
}

export interface PortalPackage {
  slug: string; name: string; price: number; duration: number; calendar: string;
  prices: { from: string; price: number }[];
}

function friendlyError(msg: string) {
  const e = parseBookingError(msg);
  return (ERROR_MESSAGES as any)[e.code] || e.message;
}

export async function loadPortalPackages(): Promise<PortalPackage[]> {
  const pkgs = await getPackages();
  return pkgs.map(p => ({
    slug: p.slug, name: p.name, price: p.price_thb, duration: p.duration_minutes, calendar: p.calendar_type,
    prices: (p.package_prices || []).map(r => ({ from: String(r.valid_from).slice(0, 10), price: r.price_thb }))
      .sort((a, b) => a.from.localeCompare(b.from)),
  }));
}

export function retailOn(pkg: PortalPackage, date: string | null) {
  let price = pkg.price;
  for (const r of pkg.prices) if (date && r.from <= date) price = r.price;
  return price;
}

export async function getAgencyPortal(token: string): Promise<AgencyPortal | null> {
  const { data, error } = await supabase.rpc('agency_portal', { p_token: token });
  if (error) throw new Error(error.message);
  return (data as AgencyPortal) || null;
}

export async function getAgencyContract(token: string): Promise<AgencyContractInfo | null> {
  const { data, error } = await supabase.rpc('agency_contract', { p_token: token });
  if (error) throw new Error(error.message);
  return (data as AgencyContractInfo) || null;
}

export async function agencyCreateBooking(token: string, req: {
  package_slug: string; date: string; start_time: string; guests: number; is_private: boolean;
  client_name: string; notes?: string;
}) {
  const { data, error } = await supabase.rpc('agency_create_booking', {
    p_token: token, p_package_slug: req.package_slug, p_date: req.date,
    p_start_time: req.start_time.length === 5 ? `${req.start_time}:00` : req.start_time,
    p_num_participants: req.guests, p_is_private: req.is_private,
    p_client_name: req.client_name, p_notes: req.notes || null,
  });
  if (error) throw new Error(friendlyError(error.message));
  const row = (data || [])[0];
  // Tell the shop + the agency (server-side email). Fire-and-forget.
  if (row) fetch('/api/agency/notify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'booking_created', booking_id: row.booking_id }),
  }).catch(() => {});
  return row as {
    booking_id: string; booking_ref: string; status: string; retail_price_thb: number;
    total_price_thb: number; payment_due_date: string; pay_now: boolean;
  };
}

export async function agencyCancelBooking(token: string, bookingRef: string) {
  const { data, error } = await supabase.rpc('agency_cancel_booking', { p_token: token, p_booking_ref: bookingRef });
  if (error) throw new Error(friendlyError(error.message));
  const row = (data || [])[0];
  fetch('/api/agency/notify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'booking_cancelled', booking_ref: bookingRef }),
  }).catch(() => {});
  return row as { booking_ref: string; refund_pct: number; refund_thb: number; was_paid: boolean };
}

// Vercel refuses request bodies over ~4.5 MB (the upload then fails with
// a bare "Failed to fetch"), and phone camera photos are often 3–8 MB.
// So photos are shrunk in the browser first: longest side max 2000 px,
// JPEG ~80% — a bank slip stays perfectly readable at ~200–800 KB.
const UPLOAD_LIMIT = 4 * 1024 * 1024;

async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size <= 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale), h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); // PNG transparency → white
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob: Blob | null = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file; // browser can't decode it — send as is (size check below)
  }
}

export async function uploadTransferSlip(token: string, bookingId: string, original: File) {
  const file = await shrinkImage(original);
  if (file.size > UPLOAD_LIMIT) {
    throw new Error('This file is too large (max 4 MB). Please upload a screenshot of the slip, or a smaller photo or PDF.');
  }
  const fd = new FormData();
  fd.append('token', token);
  fd.append('booking_id', bookingId);
  fd.append('file', file);
  let res: Response;
  try {
    res = await fetch('/api/agency/proof', { method: 'POST', body: fd });
  } catch {
    throw new Error('Upload failed — please check your internet connection and try again, or upload a screenshot of the slip.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || (res.status === 413 ? 'This file is too large — please upload a screenshot of the slip.' : 'Upload failed — please try again.'));
}

// ── Admin ──
export interface AgencyRow {
  id: string; company_name: string; contact_name: string | null; email: string; phone: string | null;
  country: string | null; website: string | null; address: string | null; license_no: string | null;
  tat_no: string | null; business_type: string | null;
  monthly_groups: string | null; message: string | null; status: string; commission_pct: number;
  contract_token: string; portal_token: string; approved_at: string | null; signed_name: string | null;
  signed_at: string | null; admin_note: string | null; created_at: string;
}

export async function listAgencies(): Promise<AgencyRow[]> {
  const { data, error } = await supabase.from('agencies')
    .select('id, company_name, contact_name, email, phone, country, website, address, license_no, tat_no, business_type, monthly_groups, message, status, commission_pct, contract_token, portal_token, approved_at, signed_name, signed_at, admin_note, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as AgencyRow[];
}

export async function updateAgency(id: string, patch: Partial<Pick<AgencyRow, 'status' | 'commission_pct' | 'admin_note'>> & { approved_at?: string }) {
  const { error } = await supabase.from('agencies').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function notifyAgency(event: 'approved', agencyId: string) {
  await fetch('/api/agency/notify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, agency_id: agencyId }),
  });
}

export interface AdminAgencyBooking {
  id: string; booking_ref: string; slot_date: string; start_time: string; num_participants: number;
  is_private: boolean; customer_name: string; status: string; payment_status: string; payment_method: string | null;
  total_price_thb: number; retail_price_thb: number | null; payment_due_date: string | null;
  payment_proof_path: string | null; payment_proof_at: string | null; agency_id: string; cancel_reason: string | null;
  packages: { name: string } | null;
}

export async function listAgencyBookings(): Promise<AdminAgencyBooking[]> {
  const { data, error } = await supabase.from('bookings')
    .select('id, booking_ref, slot_date, start_time, num_participants, is_private, customer_name, status, payment_status, payment_method, total_price_thb, retail_price_thb, payment_due_date, payment_proof_path, payment_proof_at, agency_id, cancel_reason, packages ( name )')
    .not('agency_id', 'is', null)
    .neq('status', 'pending_payment')
    .order('slot_date', { ascending: true })
    .limit(300);
  if (error) throw new Error(error.message);
  return (data || []).map((b: any) => ({ ...b, packages: Array.isArray(b.packages) ? b.packages[0] : b.packages }));
}

export async function markAgencyBookingPaid(id: string, paid: boolean) {
  const { error } = await supabase.from('bookings').update(paid
    ? { payment_status: 'paid', payment_method: 'transfer', paid_at: new Date().toISOString() }
    : { payment_status: 'unpaid', paid_at: null }).eq('id', id);
  if (error) throw new Error(error.message);
  // "Thank you — payment received" email with the receipt PDF (server re-checks
  // it is really paid; sent once) + Google Calendar 💵/✅ update (both ways).
  await fetch('/api/agency/notify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'paid', booking_id: id }),
  }).catch(() => {});
}

export async function getSlipUrl(bookingId: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`/api/agency/proof?booking_id=${encodeURIComponent(bookingId)}`, {
    headers: { Authorization: `Bearer ${session?.access_token || ''}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'Could not open the slip');
  return json.url;
}
