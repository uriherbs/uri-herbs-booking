// ============================================================
// URI HERBS WORKSHOP — Booking Engine Types
// ============================================================

// ── Database Enums ──

export type CalendarType = 'herbal' | 'aromatherapy';
// 'pending_payment' is the state every booking is created in now (see
// migration add_online_payment_integration) — capacity is reserved
// immediately, but it only becomes 'confirmed' once a real payment is
// verified server-side (or the customer picks Pay Later). Abandoned
// pending_payment bookings are auto-cancelled after 30 min by a
// scheduled DB job.
export type BookingStatus = 'pending_payment' | 'confirmed' | 'cancelled' | 'no_show' | 'completed';

export type PaymentMethod = 'stripe' | 'paypal' | 'later';

// ── API Response Types ──

export interface AvailableSlot {
  start_time: string;       // '10:00:00'
  end_time: string;         // '11:00:00'
  remaining_capacity: number;
  // 'A' | 'B' = one table; null = either not yet assigned (unavailable),
  // or — when the request was for a 9-16 whole-space private booking —
  // "both tables together".
  instructor_group: 'A' | 'B' | null;
  is_available: boolean;
}

export interface CalendarDay {
  slot_date: string;        // '2026-07-28'
  status: 'open' | 'limited' | 'full' | 'closed';
  available_times: number;
  total_times: number;
}

export interface BookingConfirmation {
  booking_id: string;
  booking_ref: string;      // 'URI-20260728-001'
  package_name: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  // null only for a whole-space (9-16 guest) private booking, which
  // occupies both tables rather than being assigned to just one.
  instructor_group: 'A' | 'B' | null;
  is_private: boolean;
  total_price_thb: number;
  status: string; // 'pending_payment' — always, straight out of create_booking now
}

// Returned by confirm_pay_later_booking / (indirectly) by the payment
// routes once confirm_booking_payment succeeds server-side.
export interface PaymentConfirmation {
  booking_id: string;
  booking_ref: string;
  status: string; // 'confirmed'
  total_price_thb: number;
}

export interface CancelConfirmation {
  booking_ref: string;
  status: 'cancelled';
  freed_spots: number;
}

// Returned by admin_cancel_booking — that RPC RETURNS the full
// `bookings` row (not a curated TABLE like the other admin RPCs), so
// this only names the columns the admin dashboard actually reads off
// it rather than mirroring every column.
export interface AdminCancelBookingResult {
  id: string;
  booking_ref: string;
  status: string; // 'cancelled' (or unchanged if it already was — see the RPC's own no-op-on-double-cancel note)
  customer_name: string;
  customer_email: string | null;
  slot_date: string;
  start_time: string;
  num_participants: number;
}

export interface DashboardBlock {
  block_start_time: string;
  block_end_time: string;
  calendar: CalendarType;
  booked: number;
  capacity: number;
  remaining: number;
  is_blocked: boolean;
  group_a_count: number;
  group_b_count: number;
}

// ── Package Display Info (from DB) ──

export interface Package {
  id: string;
  name: string;
  slug: string;
  calendar_type: CalendarType;
  price_thb: number;
  duration_minutes: number;
  description: string | null;
  highlights: string[] | null;
  sort_order: number;
}

export interface Workshop {
  id: string;
  name: string;
  slug: string;
  calendar_type: CalendarType;
  duration_minutes: number;
  takeaway_description: string | null;
}

// ── Request Types ──

export interface CreateBookingRequest {
  package_slug: string;
  date: string;             // 'YYYY-MM-DD'
  start_time: string;       // 'HH:MM'
  num_participants: number;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_notes?: string;
  has_minors?: boolean;
  // Private session (own table, up to 8 — or the whole space, 9-16)
  // vs. a public group join (shares a table, capped at 6). Defaults
  // to false (group) server-side if omitted.
  is_private?: boolean;
}

export interface AvailabilityRequest {
  date: string;
  package_slug: string;
  num_participants?: number;
  is_private?: boolean;
}

export interface CalendarRequest {
  start_date: string;
  end_date: string;
  package_slug: string;
  num_participants?: number;
  is_private?: boolean;
}

// ── Error Types ──

export type BookingErrorCode =
  | 'INVALID_PACKAGE'
  | 'INVALID_PARTICIPANTS'
  | 'INVALID_DATE'
  | 'INVALID_TIME'
  | 'INVALID_CUSTOMER'
  | 'DATE_BLOCKED'
  | 'CUTOFF_PASSED'
  | 'SLOT_MISSING'
  | 'SLOT_BLOCKED'
  | 'CAPACITY_FULL'
  | 'BOOKING_NOT_FOUND'
  | 'BOOKING_NOT_PAYABLE'
  // Raised only by admin_create_manual_booking (see migration
  // add_admin_create_manual_booking) — the caller isn't an active
  // admin_staff member.
  | 'FORBIDDEN'
  // Raised only by admin_create_manual_booking when p_payment_status isn't
  // 'paid' or 'unpaid'.
  | 'INVALID_PAYMENT_STATUS'
  | 'UNKNOWN_ERROR';

export interface BookingError {
  code: BookingErrorCode;
  message: string;
}

// Parse PG exception message into structured error
export function parseBookingError(pgMessage: string): BookingError {
  const codeMatch = pgMessage.match(/^([A-Z_]+):\s*(.+)$/);
  if (codeMatch) {
    return {
      code: codeMatch[1] as BookingErrorCode,
      message: codeMatch[2],
    };
  }
  return { code: 'UNKNOWN_ERROR', message: pgMessage };
}

// User-friendly error messages (Thai tourists + international visitors)
export const ERROR_MESSAGES: Record<BookingErrorCode, string> = {
  INVALID_PACKAGE:      'This workshop is not currently available.',
  INVALID_PARTICIPANTS: 'Please check your guest count — up to 6 for a shared group session, or up to 16 for a private booking.',
  INVALID_DATE:         'This date is not available for booking.',
  INVALID_TIME:         'This time slot is not available for the selected workshop.',
  INVALID_CUSTOMER:     'Please enter your name to complete the booking.',
  DATE_BLOCKED:         'Sorry, we are closed on this date.',
  CUTOFF_PASSED:        'This time slot has passed the booking deadline. Please choose a later time.',
  SLOT_MISSING:         'This time slot is no longer available.',
  SLOT_BLOCKED:         'This time slot has been closed. Please choose another.',
  CAPACITY_FULL:        'Sorry, this slot is fully booked. Please try a different time or date.',
  BOOKING_NOT_FOUND:    'Booking not found. Please check your reference number.',
  BOOKING_NOT_PAYABLE:  'This booking is no longer awaiting payment — it may have expired. Please start a new booking.',
  FORBIDDEN:            'You do not have admin access to do this.',
  INVALID_PAYMENT_STATUS: 'Payment status must be either paid or unpaid.',
  UNKNOWN_ERROR:        'Something went wrong. Please try again or contact us directly.',
};

// ── Manual Booking (Admin) ──
// The manual-booking form is an internal tool for Mali/staff. Same
// parseBookingError() codes, same override-the-raw-PG-message pattern
// as createBooking() uses, just a different dictionary of friendly
// text tailored to this form's copy.

export interface CreateManualBookingRequest extends CreateBookingRequest {
  payment_status: 'paid' | 'unpaid';
  // Defaults to 'manual' server-side (admin_create_manual_booking) if omitted.
  payment_method?: string;
}

// Returned by admin_create_manual_booking. Same shape as
// BookingConfirmation plus payment_status, since a manual booking can
// come back already 'confirmed' (paid) instead of always
// 'pending_payment' like the online flow.
export interface ManualBookingConfirmation {
  booking_id: string;
  booking_ref: string;
  package_name: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  instructor_group: 'A' | 'B' | null;
  is_private: boolean;
  total_price_thb: number;
  status: string; // 'confirmed' | 'pending_payment'
  payment_status: 'paid' | 'unpaid';
}

export const MANUAL_BOOKING_ERROR_MESSAGES_HE: Record<BookingErrorCode, string> = {
  INVALID_PACKAGE:      'This package is not currently available.',
  INVALID_PARTICIPANTS: 'Guest count is invalid — up to 6 for a group booking, or up to 16 for a private booking (depending on the package).',
  INVALID_DATE:         'This date can\'t be booked (e.g. it may already be in the past).',
  INVALID_TIME:         'This time is not available for this package.',
  INVALID_CUSTOMER:     'Please enter a customer name.',
  DATE_BLOCKED:         'This date is blocked for bookings. Remove the block first if this is intentional.',
  CUTOFF_PASSED:        'The booking cutoff for this time has passed.',
  SLOT_MISSING:         'This time slot doesn\'t exist. Please choose a different time.',
  SLOT_BLOCKED:         'This time slot has been manually blocked. Please choose a different time.',
  CAPACITY_FULL:        'There isn\'t enough room in this time slot. Please try a different time or date.',
  BOOKING_NOT_FOUND:    'Booking not found.',
  BOOKING_NOT_PAYABLE:  'This booking is no longer awaiting payment.',
  FORBIDDEN:            'You don\'t have admin permission to do this.',
  INVALID_PAYMENT_STATUS: 'Invalid payment status — please choose "Paid" or "Unpaid".',
  UNKNOWN_ERROR:        'Something went wrong. Please try again or contact technical support.',
};
