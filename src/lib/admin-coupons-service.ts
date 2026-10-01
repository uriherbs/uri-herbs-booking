// ============================================================
// src/lib/admin-coupons-service.ts
// ============================================================
// Admin-only coupon management (owner request 2026-10-01). Reads and
// writes the `coupons` table directly with the signed-in admin's
// session — RLS ("Admins manage coupons", is_admin()) blocks everyone
// else. Customers never read this table: they only call the
// apply_coupon() RPC from the booking Payment step.
// ============================================================

import { supabase } from './supabase';

export interface Coupon {
  id: string;
  code: string;
  note: string | null;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  valid_from: string | null;   // 'YYYY-MM-DD'
  valid_until: string | null;  // 'YYYY-MM-DD'
  max_uses: number | null;     // null = unlimited, 1 = one-time code
  package_slugs: string[] | null; // null/empty = every workshop
  allow_private: boolean;
  min_participants: number | null;
  prepay_only: boolean;
  is_active: boolean;
  created_at: string;
}

export interface CouponUsage {
  coupon_id: string;
  uses: number;
  total_discount_thb: number;
  last_used_at: string | null;
}

export interface CouponBookingUse {
  booking_ref: string;
  customer_name: string;
  slot_date: string;
  status: string;
  discount_thb: number;
  total_price_thb: number;
  created_at: string;
}

export type CouponInput = Omit<Coupon, 'id' | 'created_at'>;

const COLS =
  'id, code, note, discount_type, discount_value, valid_from, valid_until, max_uses, package_slugs, allow_private, min_participants, prepay_only, is_active, created_at';

function friendly(msg: string): string {
  if (/coupons_code_upper_key|duplicate key/i.test(msg)) return 'A coupon with this code already exists.';
  if (/coupons_code_format/i.test(msg)) return 'Code: 3–30 characters, letters, numbers, - or _ only (no spaces).';
  if (/coupons_percent_max/i.test(msg)) return 'A percentage discount can be at most 100%.';
  if (/coupons_dates/i.test(msg)) return '"Valid from" must be before "Valid until".';
  if (/discount_value/i.test(msg)) return 'The discount must be more than 0.';
  return msg;
}

export async function listCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase.from('coupons').select(COLS).order('created_at', { ascending: false });
  if (error) throw new Error(friendly(error.message));
  return (data || []) as Coupon[];
}

export async function listCouponUsage(): Promise<Record<string, CouponUsage>> {
  const { data, error } = await supabase.rpc('admin_coupon_usage');
  if (error) throw new Error(error.message);
  const out: Record<string, CouponUsage> = {};
  for (const row of (data || []) as CouponUsage[]) out[row.coupon_id] = row;
  return out;
}

export async function saveCoupon(input: CouponInput, id?: string): Promise<void> {
  const row = {
    ...input,
    code: input.code.trim().toUpperCase(),
    note: input.note?.trim() || null,
    package_slugs: input.package_slugs && input.package_slugs.length > 0 ? input.package_slugs : null,
    updated_at: new Date().toISOString(),
  };
  const { error } = id
    ? await supabase.from('coupons').update(row).eq('id', id)
    : await supabase.from('coupons').insert(row);
  if (error) throw new Error(friendly(error.message));
}

export async function setCouponActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('coupons')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(friendly(error.message));
}

export async function listCouponBookings(couponId: string): Promise<CouponBookingUse[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('booking_ref, customer_name, slot_date, status, discount_thb, total_price_thb, created_at')
    .eq('coupon_id', couponId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data || []) as CouponBookingUse[];
}
