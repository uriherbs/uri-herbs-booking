// ============================================================
// URI HERBS WORKSHOP — React Hooks (Live Supabase Integration)
// ============================================================
// Drop-in hooks for the booking flow UI. Handles:
//   - Fetching availability (calendar + time slots)
//   - Real-time capacity updates via Supabase Realtime
//   - Submitting bookings with loading/error states
//
// Usage in a component:
//   const { slots, loading, error } = useAvailableSlots(date, pkgSlug, guests);
//   const { submit, submitting, error, result } = useCreateBooking();
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import {
  getAvailableSlots,
  getCalendarAvailability,
  createBooking,
} from './booking-service';
import type {
  AvailableSlot,
  CalendarDay,
  BookingConfirmation,
  CreateBookingRequest,
  BookingError,
} from './types';


// ────────────────────────────────────────────────────────────
// 1. useAvailableSlots  (time grid for a single date)
// ────────────────────────────────────────────────────────────
// Fetches available slots AND subscribes to realtime changes on
// daily_slots for that date. If another customer books a spot
// while this user is viewing the page, the capacity bar updates
// live — no refresh needed.

export function useAvailableSlots(
  date: string | null,
  packageSlug: string | null,
  numParticipants: number = 1
) {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!date || !packageSlug) {
      setSlots([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getAvailableSlots(date, packageSlug, numParticipants);
      setSlots(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load availability');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [date, packageSlug, numParticipants]);

  // Initial fetch + refetch whenever inputs change
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription: any change to daily_slots on this date
  // triggers a re-fetch of availability (debounced via refresh call).
  useEffect(() => {
    if (!date) return;

    const channel = supabase
      .channel(`slots-${date}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_slots',
          filter: `slot_date=eq.${date}`,
        },
        () => {
          // A booking was made/cancelled on this date — refresh capacity
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, refresh]);

  return { slots, loading, error, refresh };
}


// ────────────────────────────────────────────────────────────
// 2. useCalendarAvailability  (date picker, month view)
// ────────────────────────────────────────────────────────────
// Fetches open/limited/full/closed status for a date range.
// Also subscribes to realtime updates so the calendar dots
// (green/gold/gray) reflect live bookings from other users.

export function useCalendarAvailability(
  startDate: string | null,
  endDate: string | null,
  packageSlug: string | null,
  numParticipants: number = 1
) {
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!startDate || !endDate || !packageSlug) {
      setDays([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getCalendarAvailability(startDate, endDate, packageSlug, numParticipants);
      setDays(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load calendar');
      setDays([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, packageSlug, numParticipants]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime: any daily_slots change within the visible range
  // refreshes the whole month view. Debounced to avoid refetch storms
  // when many rows change at once (e.g. a 3-hour Journey booking
  // touches 3 rows in a single transaction).
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!startDate || !endDate) return;

    const channel = supabase
      .channel(`calendar-${startDate}-${endDate}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_slots',
          filter: `slot_date=gte.${startDate}`,
        },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(refresh, 400);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [startDate, endDate, refresh]);

  return { days, loading, error, refresh };
}


// ────────────────────────────────────────────────────────────
// 3. useCreateBooking  (submit + confirmation state)
// ────────────────────────────────────────────────────────────
// Wraps createBooking() with loading/error/result state, ready
// to bind directly to the "Confirm Booking" button.
//
// On CAPACITY_FULL errors (someone else booked the last spot
// first), the caller should re-run availability and prompt the
// user to pick a different time — the error message already
// says this in plain language.

export function useCreateBooking() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<BookingError | null>(null);
  const [result, setResult] = useState<BookingConfirmation | null>(null);

  const submit = useCallback(async (req: CreateBookingRequest) => {
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const confirmation = await createBooking(req);
      setResult(confirmation);
      return confirmation;
    } catch (err: any) {
      const bookingError: BookingError = err.code
        ? err
        : { code: 'UNKNOWN_ERROR', message: err.message || 'Something went wrong' };
      setError(bookingError);
      throw bookingError;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setSubmitting(false);
    setError(null);
    setResult(null);
  }, []);

  return { submit, submitting, error, result, reset };
}


// ────────────────────────────────────────────────────────────
// 4. useSlotCapacityLive  (single-slot live counter, optional)
// ────────────────────────────────────────────────────────────
// Lightweight hook for showing "X spots left" on a single card
// without re-fetching the whole availability list. Useful for a
// "hot slot" badge on a landing page hero.

export function useSlotCapacityLive(
  date: string | null,
  startTime: string | null,
  calendarType: 'herbal' | 'aromatherapy' = 'herbal'
) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [maxCapacity, setMaxCapacity] = useState<number>(12);

  useEffect(() => {
    if (!date || !startTime) return;

    let cancelled = false;

    async function loadInitial() {
      const { data } = await supabase
        .from('daily_slots')
        .select('booked_count, max_capacity')
        .eq('slot_date', date)
        .eq('start_time', startTime)
        .eq('calendar_type', calendarType)
        .maybeSingle();

      if (!cancelled && data) {
        setRemaining(data.max_capacity - data.booked_count);
        setMaxCapacity(data.max_capacity);
      }
    }
    loadInitial();

    const channel = supabase
      .channel(`slot-${date}-${startTime}-${calendarType}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'daily_slots',
          filter: `slot_date=eq.${date}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row.start_time === startTime && row.calendar_type === calendarType) {
            setRemaining(row.max_capacity - row.booked_count);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [date, startTime, calendarType]);

  return { remaining, maxCapacity };
}


// ────────────────────────────────────────────────────────────
// 5. useAdminDayData  (admin dashboard: bookings + slots for a day)
// ────────────────────────────────────────────────────────────
// Fetches everything the admin dashboard needs for one date —
// individual bookings (joined with their package for name/duration/
// calendar) plus the authoritative daily_slots rows (for is_blocked
// and the true booked_count, which may not perfectly match a sum of
// booking.num_participants if a slot was manually adjusted). Also
// subscribes to realtime so the dashboard updates if a customer
// books/cancels on the live site while staff are looking at it.
//
// Requires the viewer to be an authenticated admin_staff member —
// RLS ("Admins can read all bookings") enforces this server-side
// regardless of what this hook does client-side.

export interface AdminBookingRow {
  id: string;
  booking_ref: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  instructor_group: 'A' | 'B';
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  customer_notes: string | null;
  has_minors: boolean;
  total_price_thb: number;
  status: string;
  attendance_status: 'pending' | 'arrived' | 'no_show';
  payment_status: 'unpaid' | 'paid';
  packages: {
    name: string;
    slug: string;
    duration_minutes: number;
    calendar_type: 'herbal' | 'aromatherapy';
  };
}

export interface AdminSlotRow {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  calendar_type: 'herbal' | 'aromatherapy';
  max_capacity: number;
  booked_count: number;
  is_blocked: boolean;
  blocked_reason: string | null;
}

export function useAdminDayData(date: string | null) {
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [slots, setSlots] = useState<AdminSlotRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      // Ensure daily_slots rows exist for this date before reading them
      await supabase.rpc('generate_daily_slots', { target_date: date });

      const [bookingsRes, slotsRes] = await Promise.all([
        supabase
          .from('bookings')
          .select(`
            id, booking_ref, slot_date, start_time, end_time, num_participants,
            instructor_group, customer_name, customer_email, customer_phone,
            customer_notes, has_minors, total_price_thb, status,
            attendance_status, payment_status,
            packages ( name, slug, duration_minutes, calendar_type )
          `)
          .eq('slot_date', date)
          .neq('status', 'cancelled')
          .order('start_time'),
        supabase
          .from('daily_slots')
          .select('id, slot_date, start_time, end_time, calendar_type, max_capacity, booked_count, is_blocked, blocked_reason')
          .eq('slot_date', date)
          .order('start_time'),
      ]);

      if (bookingsRes.error) throw new Error(bookingsRes.error.message);
      if (slotsRes.error) throw new Error(slotsRes.error.message);

      setBookings((bookingsRes.data ?? []) as unknown as AdminBookingRow[]);
      setSlots((slotsRes.data ?? []) as AdminSlotRow[]);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!date) return;

    const channel = supabase
      .channel(`admin-day-${date}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `slot_date=eq.${date}` },
        () => refresh()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_slots', filter: `slot_date=eq.${date}` },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, refresh]);

  return { bookings, slots, loading, error, refresh };
}

// ────────────────────────────────────────────────────────────
// 6. Admin action helpers — thin wrappers around the RPCs
// ────────────────────────────────────────────────────────────
// Not hooks themselves (no internal state) — just typed, reusable
// functions the dashboard's button handlers call directly, then
// rely on useAdminDayData's realtime subscription to reflect the
// change rather than managing a second copy of the result.

export async function adminUpdateBookingStatus(
  bookingId: string,
  updates: { attendance?: 'pending' | 'arrived' | 'no_show'; payment?: 'unpaid' | 'paid' }
) {
  const { error } = await supabase.rpc('admin_update_booking_status', {
    p_booking_id: bookingId,
    p_attendance: updates.attendance ?? null,
    p_payment: updates.payment ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function adminToggleSlotBlock(
  date: string,
  startTime: string,
  calendarType: 'herbal' | 'aromatherapy',
  blocked: boolean,
  reason?: string
) {
  const { error } = await supabase.rpc('admin_toggle_slot_block', {
    p_date: date,
    p_start_time: startTime,
    p_calendar: calendarType,
    p_blocked: blocked,
    p_reason: reason ?? null,
  });
  if (error) throw new Error(error.message);
}
