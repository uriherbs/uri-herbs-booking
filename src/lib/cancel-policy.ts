// ============================================================
// src/lib/cancel-policy.ts
// ============================================================
// Customer self-cancellation rules, shared by the /api/bookings/cancel
// route (server) and the /cancel/[token] page (client) so both always
// agree. Mirrors Terms §4 (legal-content.ts): full refund 48h+ before
// the workshop, no refund inside 48h. Refunds themselves stay manual
// (Stripe/PayPal dashboard).
// ============================================================

export const FREE_CANCEL_HOURS = 48;

// Workshop start as an absolute instant. Slots are Chiang Mai local
// time (Asia/Bangkok, UTC+7, no DST).
export function workshopStart(slotDate: string, startTime: string): Date {
  const hhmm = String(startTime).slice(0, 5);
  return new Date(`${slotDate}T${hhmm}:00+07:00`);
}

export function hoursUntilWorkshop(slotDate: string, startTime: string, now = new Date()): number {
  return (workshopStart(slotDate, startTime).getTime() - now.getTime()) / 36e5;
}

export function isPaidOnline(paymentMethod: string | null | undefined): boolean {
  return paymentMethod === 'stripe' || paymentMethod === 'paypal';
}

export type RefundStatus = 'nothing_charged' | 'refund_due' | 'no_refund';

export function refundStatus(paymentMethod: string | null | undefined, hoursUntil: number): RefundStatus {
  if (!isPaidOnline(paymentMethod)) return 'nothing_charged';
  return hoursUntil >= FREE_CANCEL_HOURS ? 'refund_due' : 'no_refund';
}
