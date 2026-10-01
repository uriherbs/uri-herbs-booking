// ============================================================
// src/lib/partners.ts
// ============================================================
// Partners (influencers / affiliates — owner request 2026-10-01).
// A partner owns one or more coupons; commission is the partner's %
// of what the customer actually paid, counted only for bookings whose
// guests were marked "arrived". partner_dashboard(token) (Supabase
// RPC) returns everything as one JSON document, used by both the
// public partner page (/partner/<token>) and the admin Partners
// screen. Admin writes go straight to the tables under admin RLS.
// ============================================================

import { supabase } from './supabase';

export interface Partner {
  id: string;
  name: string;
  handle: string | null;
  email: string | null;
  partner_type: 'influencer' | 'agency';
  commission_pct: number;
  notify_each_booking: boolean;
  monthly_email: boolean;
  dashboard_token: string;
  is_active: boolean;
  note: string | null;
  created_at: string;
}

export type PartnerInput = Pick<Partner,
  'name' | 'handle' | 'email' | 'commission_pct' | 'notify_each_booking' | 'monthly_email' | 'is_active' | 'note'>;

export type PartnerBookingState = 'came' | 'upcoming' | 'not_marked' | 'no_show' | 'cancelled' | 'pending';

export interface PartnerDashboard {
  partner: { name: string; handle: string | null; commission_pct: number };
  codes: { code: string; discount_type: 'percent' | 'fixed'; discount_value: number; valid_until: string | null; active: boolean }[];
  bookings: {
    date: string; package: string; guests: number; private: boolean; code: string;
    state: PartnerBookingState; commission: number; expected: number;
  }[];
  months: {
    month: string; bookings: number; guests: number; came_guests: number;
    earned: number; expected: number; paid_at: string | null; paid_amount: number | null;
  }[];
}

const COLS =
  'id, name, handle, email, partner_type, commission_pct, notify_each_booking, monthly_email, dashboard_token, is_active, note, created_at';

export const SITE_ORIGIN = 'https://www.uriherbs.com';

export function partnerLink(token: string) {
  return `${SITE_ORIGIN}/partner/${token}`;
}

export function bookingLinkWithCode(code: string) {
  return `${SITE_ORIGIN}/book?code=${encodeURIComponent(code)}`;
}

export function monthLabel(isoMonth: string) {
  return new Date(isoMonth.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

// ── Public (anon) ──
export async function getPartnerDashboard(token: string): Promise<PartnerDashboard | null> {
  const { data, error } = await supabase.rpc('partner_dashboard', { p_token: token });
  if (error) throw new Error(error.message);
  return (data as PartnerDashboard) || null;
}

// ── Admin ──
export async function listPartners(): Promise<Partner[]> {
  const { data, error } = await supabase.from('partners').select(COLS).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as Partner[];
}

export async function savePartner(input: PartnerInput, id?: string): Promise<void> {
  const row = {
    ...input,
    name: input.name.trim(),
    handle: input.handle?.trim() || null,
    email: input.email?.trim() || null,
    note: input.note?.trim() || null,
    updated_at: new Date().toISOString(),
  };
  const { error } = id
    ? await supabase.from('partners').update(row).eq('id', id)
    : await supabase.from('partners').insert(row);
  if (error) throw new Error(error.message);
}

export async function setMonthPaid(partnerId: string, month: string, amountThb: number, paid: boolean): Promise<void> {
  const { error } = await supabase.from('partner_payouts').upsert(
    { partner_id: partnerId, month: month.slice(0, 10), amount_thb: amountThb, paid_at: paid ? new Date().toISOString() : null },
    { onConflict: 'partner_id,month' }
  );
  if (error) throw new Error(error.message);
}
