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
  PaymentConfirmation,
  CancelConfirmation,
  AdminCancelBookingResult,
  DashboardBlock,
  Package,
  CreateBookingRequest,
  CreateManualBookingRequest,
  ManualBookingConfirmation,
  BookingError,
} from './types';
import { parseBookingError, ERROR_MESSAGES, MANUAL_BOOKING_ERROR_MESSAGES_HE } from './types';


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
// A "group" request shares a table with other bookings (soft cap 6);
// a "private" request claims a whole table to itself (1-8, hard cap
// 8) or — at 9+ guests — the whole space (both tables, cap 16). See
// migration "add_private_vs_group_capacity_model" for the full model.
//
// Usage:
//   const slots = await getAvailableSlots('2026-07-28', 'combo-tea-inhaler', 2);
//   → [{ start_time: '10:00', remaining: 8, group: 'A', available: true }, ...]

export async function getAvailableSlots(
  date: string,
  packageSlug: string,
  numParticipants: number = 1,
  isPrivate: boolean = false
): Promise<AvailableSlot[]> {
  // Client-side pre-validation
  if (!date || !packageSlug) {
    throw new Error('Date and package are required');
  }
  const maxGuests = isPrivate ? 16 : 6;
  if (numParticipants < 1 || numParticipants > maxGuests) {
    throw new Error(`Participants must be between 1 and ${maxGuests}`);
  }

  const { data, error } = await supabase.rpc('get_available_slots', {
    p_date: date,
    p_package_slug: packageSlug,
    p_num_participants: numParticipants,
    p_is_private: isPrivate,
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
  numParticipants: number = 1,
  isPrivate: boolean = false
): Promise<CalendarDay[]> {
  const { data, error } = await supabase.rpc('get_calendar_availability', {
    p_start_date: startDate,
    p_end_date: endDate,
    p_package_slug: packageSlug,
    p_num_participants: numParticipants,
    p_is_private: isPrivate,
  });

  if (error) throw new Error(`Calendar check failed: ${error.message}`);
  return (data ?? []) as CalendarDay[];
}


// ────────────────────────────────────────────────────────────
// 4. CREATE BOOKING  (reserves capacity, starts pending_payment)
// ────────────────────────────────────────────────────────────
// Atomically reserves capacity and creates the booking. The booking
// ALWAYS comes back with status 'pending_payment' now — it does not
// become 'confirmed' until payment is verified server-side (see
// confirmPayLaterBooking below, and the Stripe/PayPal payment API
// routes for the online-payment paths). Returns a confirmation with
// booking ref, or throws a structured BookingError on failure.
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
//   → { booking_ref: 'URI-20260728-001', status: 'pending_payment', ... }

export async function createBooking(
  req: CreateBookingRequest
): Promise<BookingConfirmation> {
  // ── Client-side validation ──
  const errors: string[] = [];

  if (!req.package_slug)   errors.push('Package is required');
  if (!req.date)           errors.push('Date is required');
  if (!req.start_time)     errors.push('Start time is required');
  if (!req.customer_name?.trim()) errors.push('Name is required');

  const maxGuests = req.is_private ? 16 : 6;
  if (req.num_participants < 1 || req.num_participants > maxGuests) {
    errors.push(`Participants must be between 1 and ${maxGuests}`);
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
    p_is_private:       req.is_private ?? false,
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
// 4b. CONFIRM PAY-LATER BOOKING
// ────────────────────────────────────────────────────────────
// "Pay Later" makes no online-payment claim — cash/PromptPay/WeChat
// happens in person, so this just flips pending_payment -> confirmed
// directly. Safe to expose to the browser: it never touches
// payment_status/payment_provider_ref (see confirm_booking_payment,
// which is locked to server-side callers only, for the online-payment
// equivalent of this).
//
// Usage:
//   const result = await confirmPayLaterBooking('URI-20260728-001');
//   → { booking_ref: 'URI-20260728-001', status: 'confirmed', ... }

export async function confirmPayLaterBooking(
  bookingRef: string
): Promise<PaymentConfirmation> {
  if (!bookingRef?.trim()) {
    throw { code: 'BOOKING_NOT_FOUND', message: 'Booking reference is required' };
  }

  const { data, error } = await supabase.rpc('confirm_pay_later_booking', {
    p_booking_ref: bookingRef.trim().toUpperCase(),
  });

  if (error) {
    const bookingError = parseBookingError(error.message);
    throw { ...bookingError, message: ERROR_MESSAGES[bookingError.code] || bookingError.message };
  }

  if (!data || data.length === 0) {
    throw { code: 'BOOKING_NOT_FOUND', message: ERROR_MESSAGES.BOOKING_NOT_FOUND };
  }

  // Fire-and-forget — the confirmation emails go out via a tiny
  // server route (this function runs in the browser with the anon
  // key, so it can't send them directly; RESEND_API_KEY is
  // server-only). Never blocks or fails the booking itself: a
  // customer whose Pay Later booking is confirmed must see that
  // success regardless of whether the email happens to go out.
  fetch('/api/bookings/notify-confirmed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ booking_ref: bookingRef.trim().toUpperCase() }),
  }).catch((err) => console.error('notify-confirmed request failed:', err?.message));

  return data[0] as PaymentConfirmation;
}


// ────────────────────────────────────────────────────────────
// 4c. CREATE MANUAL BOOKING  (admin dashboard — phone/walk-in bookings)
// ────────────────────────────────────────────────────────────
// Same capacity/pricing engine as createBooking() above (this just
// calls admin_create_manual_booking, the admin-only sibling of
// create_booking — see that RPC's own comment for the full rules: no
// cutoff/time-rule check since a walk-in may fall outside the normal
// online window, but still the same capacity/blocked-date checks).
// Two admin-only differences: it can mark the booking already paid
// (p_payment_status), and it requires an active admin_staff session
// (checked server-side via is_admin() — raises FORBIDDEN otherwise).
//
// This is an internal tool for Mali/staff, not the tourist-facing
// booking flow — so unlike createBooking(), errors are surfaced in
// Hebrew (MANUAL_BOOKING_ERROR_MESSAGES_HE), not English.
//
// Usage:
//   const result = await createManualBooking({
//     package_slug: 'combo-tea-inhaler',
//     date: '2026-07-28',
//     start_time: '10:00',
//     num_participants: 2,
//     customer_name: 'Sophie Martin',
//     payment_status: 'paid',
//   });
//   → { booking_ref: 'URI-20260728-001', status: 'confirmed', payment_status: 'paid', ... }

export async function createManualBooking(
  req: CreateManualBookingRequest
): Promise<ManualBookingConfirmation> {
  // ── Client-side validation ──
  const errors: string[] = [];

  if (!req.package_slug)   errors.push('יש לבחור חבילה');
  if (!req.date)           errors.push('יש לבחור תאריך');
  if (!req.start_time)     errors.push('יש לבחור שעת התחלה');
  if (!req.customer_name?.trim()) errors.push('יש להזין שם לקוח');

  const maxGuests = req.is_private ? 16 : 6;
  if (req.num_participants < 1 || req.num_participants > maxGuests) {
    errors.push(`מספר המשתתפים חייב להיות בין 1 ל-${maxGuests}`);
  }

  if (req.customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(req.customer_email)) {
    errors.push('כתובת האימייל אינה תקינה');
  }

  if (req.payment_status !== 'paid' && req.payment_status !== 'unpaid') {
    errors.push('סטטוס תשלום חייב להיות "שולם" או "לא שולם"');
  }

  if (errors.length > 0) {
    throw { code: 'VALIDATION_ERROR', message: errors.join('. ') } as any;
  }

  // ── Normalize time format (accept '10:00' or '10:00:00') ──
  const normalizedTime = req.start_time.length === 5
    ? `${req.start_time}:00`
    : req.start_time;

  // ── Call the atomic PG function ──
  const { data, error } = await supabase.rpc('admin_create_manual_booking', {
    p_package_slug:     req.package_slug,
    p_date:             req.date,
    p_start_time:       normalizedTime,
    p_num_participants: req.num_participants,
    p_customer_name:    req.customer_name.trim(),
    p_customer_email:   req.customer_email?.trim() || null,
    p_customer_phone:   req.customer_phone?.trim() || null,
    p_customer_notes:   req.customer_notes?.trim() || null,
    p_has_minors:       req.has_minors ?? false,
    p_is_private:       req.is_private ?? false,
    p_payment_status:   req.payment_status,
    p_payment_method:   req.payment_method || 'manual',
  });

  if (error) {
    // Parse the structured error from PostgreSQL — same CODE: message
    // shape as create_booking, overridden with the Hebrew dictionary
    // instead of the tourist-facing English one.
    const bookingError = parseBookingError(error.message);
    const userMessage = MANUAL_BOOKING_ERROR_MESSAGES_HE[bookingError.code] || bookingError.message;
    throw { ...bookingError, message: userMessage };
  }

  if (!data || data.length === 0) {
    throw { code: 'UNKNOWN_ERROR', message: MANUAL_BOOKING_ERROR_MESSAGES_HE.UNKNOWN_ERROR };
  }

  const confirmation = data[0] as ManualBookingConfirmation;

  // A manual booking marked "already paid" comes back 'confirmed'
  // immediately (see admin_create_manual_booking) — send the same
  // confirmation emails an online-paid booking gets, via the same
  // server route the Pay Later flow already uses for this (see
  // confirmPayLaterBooking above): this function runs in the browser
  // with the anon key, so it can't send emails directly
  // (RESEND_API_KEY is server-only). Fire-and-forget — a booking
  // that's confirmed and paid must not fail because the email
  // couldn't be sent.
  if (confirmation.payment_status === 'paid') {
    fetch('/api/bookings/notify-confirmed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_ref: confirmation.booking_ref }),
    }).catch((err) => console.error('notify-confirmed request failed:', err?.message));
  }

  return confirmation;
}


// ────────────────────────────────────────────────────────────
// 5. CANCEL BOOKING
// ────────────────────────────────────────────────────────────
// Cancels by reference code and releases capacity back to the pool.
// Works on both 'confirmed' and 'pending_payment' bookings — the
// Payment step calls this if the customer backs out (goes Back, or
// closes the flow) before completing payment, so the slot frees up
// immediately instead of waiting for the 30-min abandonment cleanup.
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
// 5b. CANCEL BOOKING  (admin dashboard)
// ────────────────────────────────────────────────────────────
// Admin-only sibling of cancelBooking() above — cancels by internal
// booking id (not booking_ref) via admin_cancel_booking, which
// requires an active admin_staff session (checked server-side via
// is_admin() — raises FORBIDDEN otherwise). Idempotent: cancelling an
// already-cancelled booking is a no-op that returns the current row
// rather than erroring (see the RPC's own comment).
//
// Unlike admin_create_manual_booking, this RPC RETURNS the full
// `bookings` row directly (not a TABLE(...) set), so the response is
// a single object, not an array — no `data[0]` here.
//
// Usage:
//   const result = await cancelBookingAsAdmin('a1b2c3d4-...');
//   → { booking_ref: 'URI-20260728-001', status: 'cancelled', ... }

export async function cancelBookingAsAdmin(
  bookingId: string
): Promise<AdminCancelBookingResult> {
  if (!bookingId) {
    throw { code: 'BOOKING_NOT_FOUND', message: 'Booking id is required' };
  }

  const { data, error } = await supabase.rpc('admin_cancel_booking', {
    p_booking_id: bookingId,
  });

  if (error) {
    const bookingError = parseBookingError(error.message);
    throw { ...bookingError, message: ERROR_MESSAGES[bookingError.code] || bookingError.message };
  }

  if (!data) {
    throw { code: 'BOOKING_NOT_FOUND', message: ERROR_MESSAGES.BOOKING_NOT_FOUND };
  }

  const cancelled = data as AdminCancelBookingResult;

  // Best-effort cancellation email — same reasoning as
  // confirmPayLaterBooking()'s notify-confirmed call above: this runs
  // in the browser with the anon key and can't send emails directly
  // (RESEND_API_KEY is server-only). A cancellation that already
  // succeeded in the database must not fail because the email
  // couldn't be sent.
  fetch('/api/bookings/notify-cancelled', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ booking_ref: cancelled.booking_ref }),
  }).catch((err) => console.error('notify-cancelled request failed:', err?.message));

  return cancelled;
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
