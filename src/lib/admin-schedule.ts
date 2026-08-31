// ============================================================
// src/lib/admin-schedule.ts
// ============================================================
// Fixed operating-hours DISPLAY GRID for the admin dashboard and
// the manual-booking form. The actual truth for which slots exist
// lives server-side in package_time_rules / daily_slots — this is
// only used client-side to render/pick sensible hourly blocks, and
// every write still goes through an RPC (admin_create_manual_booking,
// admin_toggle_slot_block, ...) that re-validates for real. Split out
// on its own so AdminDashboard and ManualBookingModal share one
// source of truth instead of two copies drifting apart.
// ============================================================

export interface HerbalBlock {
  time: string;   // 'HH:MM'
  end: string;    // 'HH:MM'
  session: 'morning' | 'afternoon';
}

export const HERBAL_BLOCKS: HerbalBlock[] = [
  { time: '10:00', end: '11:00', session: 'morning' },
  { time: '11:00', end: '12:00', session: 'morning' },
  { time: '12:00', end: '13:00', session: 'morning' },
  { time: '14:00', end: '15:00', session: 'afternoon' },
  { time: '15:00', end: '16:00', session: 'afternoon' },
  { time: '16:00', end: '17:00', session: 'afternoon' },
];

export interface AromaBlock {
  time: string; // 'HH:MM'
  end: string;  // 'HH:MM'
}

// Aromatherapy's valid block(s) depend on day of week — Mon/Wed 14:00,
// Tue/Thu 11:00, closed Fri–Sun. Mirrors package_time_rules exactly
// (see schedule-sync-migration.sql) so the admin view never disagrees
// with what customers can actually book.
export function getAromaBlocksForDate(dateObj: Date): AromaBlock[] {
  const dow = dateObj.getDay(); // 0=Sun..6=Sat
  if (dow === 1 || dow === 3) return [{ time: '14:00', end: '15:00' }, { time: '15:00', end: '16:00' }];
  if (dow === 2 || dow === 4) return [{ time: '11:00', end: '12:00' }, { time: '12:00', end: '13:00' }];
  return [];
}
