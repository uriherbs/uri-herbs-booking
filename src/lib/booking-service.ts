// ============================================================
// URI HERBS WORKSHOP — Booking Service
// ============================================================
// This service wraps the PostgreSQL RPC functions with
// TypeScript safety, validation, and error handling.
//
// All capacity logic lives in PostgreSQL (race-condition safe).
// This layer handles: input validation, type conversion,
// error parsing, and the Supabase .rpc() calls.
// ============================================================

import { supabase } from './supabase';
import type {
  AvailableSlot,
  CalendarDay,
  BookingConfirmation,
  CancelConfirmation,
  DashboardBlock,
  Package,
  CreateBookingRequest,
  BookingError,
} from './types';
import { parseBookingError, ERROR_MESSAGES } from './types';


// ────────────────────────────────────────────────────────────
// 1. GET PACKAGES  (product catalog)
// ────────────────────────────────────────────────────────────

export async function getPackages(calendarType?: 'herbal' | 'aromatherapy'): Promise<Package[]> {
  let query = supabase
    .from('packages')
    .select(`
      id, name, slug, calendar_type, price_thb,
      duration_minutes, description, highlights, sort_order
    `)
    .eq('is_active', true)
    .order('sort_order');

  if (calendarType) {
    query = query.eq('calendar_type', calendarType);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to load packages: ${error.message}`);
  return data as Package[];
}


// ────────────────────────────────────────────────────────────
// 2. GET AVAILABLE SLOTS  (for a specific date + package)
// ────────────────────────────────────────────────────────────
// Returns which start times are bookable, with capacity info.
//
// Usage:
//   const slots = await getAvailableSlots('2026-07-28', 'combo-tea-inhaler', 2);
//   → [{ start_time: '10:00', remaining: 8, group: 'A', available: true }, ...]

export async function getAvailableSlots(
  date: string,
  packageSlug: string,
  numParticipants: number = 1
): Promise<AvailableSlot[]> {
  // Client-side pre-validation
  if (!date || !packageSlug) {
    throw new Error('Date and package are required');
  }
  if (numParticipants < 1 || numParticipants > 12) {
    throw new Error('Participants must be between 1 and 12');
  }

  const { data, error } = await supabase.rpc('get_available_slots', {
    p_date: date,
    p_package_slug: packageSlug,
    p_num_participants: numParticipants,
  });

  if (error) throw new Error(`Availability check failed: ${error.message}`);
  return (data ?? []) as AvailableSlot[];
}


// ────────────────────────────────────────────────────────────
// 3. GET CALENDAR AVAILABILITY  (date range for date picker)
// ────────────────────────────────────────────────────────────
// Returns status for each date in the range: open/limited/full/closed.
//
// Usage:
//   const cal = await getCalendarAvailability('2026-07-27', '2026-08-27', 'single-tea');
//   → [{ date: '2026-07-28', status: 'open', available: 2, total: 2 }, ...]

export async function getCalendarAvailability(
  startDate: string,
  endDate: string,
  packageSlug: string,
  numParticipants: number = 1
): Promise<CalendarDay[]> {
  const { data, error } = await supabase.rpc('get_calendar_availability', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_package_slug: packageSlug,
    p_num_participants: numParticipants,
  });

  if (error) throw new Error(`Calendar check failed: ${error.message}`);
  return (data ?? []) as CalendarDay[];
}


// ────────────────────────────────────────────────────────────
// 4. CREATE BOOKING  (the main transaction)
// ────────────────────────────────────────────────────────────
// Atomically reserves capacity and creates the booking.
// Returns a confirmation with booking ref, or throws a
// structured BookingError on failure.
//
// Usage:
//   const result = await createBooking({
//     package_slug: 'combo-tea-inhaler',
//     date: '2026-07-28',
//     start_time: '10:00',
//     num_participants: 2,
//     customer_name: 'Sophie Martin',
//     customer_email: 'sophie@example.com',
//   });
//   → { booking_ref: 'URI-20260728-001', ... }

export async function createBooking(
  req: CreateBookingRequest
): Promise<BookingConfirmation> {
  // ── Client-side validation ──
  const errors: string[] = [];

  if (!req.package_slug)   errors.push('Package is required');
  if (!req.date)           errors.push('Date is required');
  if (!req.start_time)     errors.push('Start time is required');
  if (!req.customer_name?.trim()) errors.push('Name is required');

  if (req.num_participants < 1 || req.num_participants > 12) {
    errors.push('Participants must be between 1 and 12');
  }

  if (req.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.customer_email)) {
    errors.push('Please enter a valid email address');
  }

  if (errors.length > 0) {
throw { code: 'VALIDATION_ERROR', message: errors.join('. ') } as any;  }

  // ── Normalize time format (accept '10:00' or '10:00:00') ──
  const normalizedTime = req.start_time.length === 5
    ? `${req.start_time}:00`
    : req.start_time;

  // ── Call the atomic PG function ──
  const { data, error } = await supabase.rpc('create_booking', {
    p_package_slug:     req.package_slug,
    p_date:             req.date,
    p_start_time:       normalizedTime,
    p_num_participants: req.num_participants,
    p_customer_name:    req.customer_name.trim(),
    p_customer_email:   req.customer_email?.trim() || null,
    p_customer_phone:   req.customer_phone?.trim() || null,
    p_customer_notes:   req.customer_notes?.trim() || null,
    p_has_minors:       req.has_minors ?? false,
  });

  if (error) {
    // Parse the structured error from PostgreSQL
    const bookingError = parseBookingError(error.message);
    const userMessage = ERROR_MESSAGES[bookingError.code] || bookingError.message;
    throw { ...bookingError, message: userMessage };
  }

  if (!data || data.length === 0) {
    throw { code: 'UNKNOWN_ERROR', message: ERROR_MESSAGES.UNKNOWN_ERROR };
  }

  return data[0] as BookingConfirmation;
}


// ────────────────────────────────────────────────────────────
// 5. CANCEL BOOKING
// ────────────────────────────────────────────────────────────
// Cancels by reference code and releases capacity back to the pool.
//
// Usage:
//   const result = await cancelBooking('URI-20260728-001');
//   → { booking_ref: 'URI-20260728-001', status: 'cancelled', freed_spots: 2 }

export async function cancelBooking(
  bookingRef: string
): Promise<CancelConfirmation> {
  if (!bookingRef?.trim()) {
    throw { code: 'BOOKING_NOT_FOUND', message: 'Booking reference is required' };
  }

  const { data, error } = await supabase.rpc('cancel_booking', {
    p_booking_ref: bookingRef.trim().toUpperCase(),
  });

  if (error) {
    const bookingError = parseBookingError(error.message);
    throw { ...bookingError, message: ERROR_MESSAGES[bookingError.code] || bookingError.message };
  }

  if (!data || data.length === 0) {
    throw { code: 'BOOKING_NOT_FOUND', message: ERROR_MESSAGES.BOOKING_NOT_FOUND };
  }

  return data[0] as CancelConfirmation;
}


// ────────────────────────────────────────────────────────────
// 6. GET DAILY DASHBOARD  (admin)
// ────────────────────────────────────────────────────────────

export async function getDailyDashboard(
  date: string
): Promise<DashboardBlock[]> {
  const { data, error } = await supabase.rpc('get_daily_dashboard', {
    p_date: date,
  });

  if (error) throw new Error(`Dashboard load failed: ${error.message}`);
  return (data ?? []) as DashboardBlock[];
}


// ────────────────────────────────────────────────────────────
// 7. LOOKUP BOOKING  (for confirmation page / status check)
// ────────────────────────────────────────────────────────────

export async function lookupBooking(bookingRef: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, booking_ref, slot_date, start_time, end_time,
      num_participants, instructor_group, customer_name,
      customer_email, total_price_thb, status, has_minors,
      created_at,
      packages ( name, slug, duration_minutes, calendar_type, description )
    `)
    .eq('booking_ref', bookingRef.trim().toUpperCase())
    .single();

  if (error || !data) {
    throw { code: 'BOOKING_NOT_FOUND', message: ERROR_MESSAGES.BOOKING_NOT_FOUND };
  }

  return data;
}
