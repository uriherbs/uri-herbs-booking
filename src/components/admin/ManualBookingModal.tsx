'use client';

// ============================================================
// src/components/admin/ManualBookingModal.tsx
// ============================================================
// "New Booking" — lets Mali/staff key in a booking taken over the
// phone or in person (walk-in, or a guest who paid by cash/PromptPay
// before Uri Herbs had online payment). All capacity/pricing/blocked-
// date logic lives in the already-tested admin_create_manual_booking
// Postgres RPC (see migration add_admin_create_manual_booking) — this
// component is just a thin form around createManualBooking()
// (src/lib/booking-service.ts), which wraps that RPC. No capacity or
// pricing logic is duplicated here.
//
// If the booking is created already marked "paid", createManualBooking()
// itself fires the same customer-confirmation-email flow a normal paid
// booking gets (via POST /api/bookings/notify-confirmed →
// sendBookingConfirmationEmails) — nothing extra to do here for that.
//
// Internal admin tool — English throughout, including error messages
// (see MANUAL_BOOKING_ERROR_MESSAGES_HE in src/lib/types.ts).
// ============================================================

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { C } from '@/lib/admin-theme';
import { HERBAL_BLOCKS, getAromaBlocksForDate } from '@/lib/admin-schedule';
import { getPackages, createManualBooking } from '@/lib/booking-service';
import type { Package, CreateManualBookingRequest, ManualBookingConfirmation } from '@/lib/types';

interface ManualBookingModalProps {
  open: boolean;
  /** 'YYYY-MM-DD' — defaults to today if omitted. Pre-fills the date
   *  field with whatever day the admin is currently looking at. */
  initialDate?: string;
  onClose: () => void;
  /** Fired after a successful create — the dashboard passes its own
   *  `refresh` so the new booking shows up immediately even if it
   *  falls outside the realtime subscription's current date filter. */
  onCreated?: (confirmation: ManualBookingConfirmation) => void;
}

interface FormState {
  packageSlug: string;
  date: string;
  startTime: string;
  numParticipants: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes: string;
  hasMinors: boolean;
  isPrivate: boolean;
  paymentStatus: 'paid' | 'unpaid';
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function emptyForm(date: string): FormState {
  return {
    packageSlug: '',
    date,
    startTime: '',
    numParticipants: 1,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerNotes: '',
    hasMinors: false,
    isPrivate: false,
    paymentStatus: 'unpaid',
  };
}

function formatTime12(t: string): string {
  const h = parseInt(t.split(':')[0], 10);
  const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour12}:00 ${h >= 12 ? 'PM' : 'AM'}`;
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: `1.5px solid ${C.sand}`, background: C.white,
  fontFamily: "'DM Sans'", fontSize: 14, color: C.forest,
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600,
  color: C.barkLight, marginBottom: 6,
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>
        {label}{required && <span style={{ color: C.coral }}> *</span>}
      </label>
      {children}
    </div>
  );
}

export default function ManualBookingModal({ open, initialDate, onClose, onCreated }: ManualBookingModalProps) {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(() => emptyForm(initialDate || todayStr()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ManualBookingConfirmation | null>(null);

  // Reset the form and (re-)load the package list every time the
  // modal opens, so it never shows stale state from a previous booking.
  useEffect(() => {
    if (!open) return;
    setForm(emptyForm(initialDate || todayStr()));
    setError(null);
    setSuccess(null);
    setSubmitting(false);
    setLoadingPackages(true);
    setPackagesError(null);
    getPackages()
      .then(setPackages)
      .catch((err: any) => setPackagesError(err?.message || 'Failed to load package list'))
      .finally(() => setLoadingPackages(false));
  }, [open, initialDate]);

  const selectedPackage = useMemo(
    () => packages.find((p) => p.slug === form.packageSlug) || null,
    [packages, form.packageSlug]
  );

  // Which hourly blocks to offer depends on the selected package's
  // calendar, and — for aromatherapy — the chosen date's day of week.
  // Same display grid the dashboard itself renders bookings into
  // (src/lib/admin-schedule.ts); the RPC has no cutoff/time-rule check
  // for a manual booking, but a start time still has to land on an
  // existing hourly `daily_slots` block, so sticking to this grid
  // keeps the common case error-free without hardcoding it twice.
  const timeOptions = useMemo(() => {
    if (!selectedPackage) return [];
    if (selectedPackage.calendar_type === 'aromatherapy') {
      if (!form.date) return [];
      return getAromaBlocksForDate(new Date(`${form.date}T00:00:00`)).map((b) => b.time);
    }
    return HERBAL_BLOCKS.map((b) => b.time);
  }, [selectedPackage, form.date]);

  // Drop a previously-chosen time that's no longer valid for the
  // current package/date combination.
  useEffect(() => {
    setForm((f) => (f.startTime && !timeOptions.includes(f.startTime) ? { ...f, startTime: '' } : f));
  }, [timeOptions]);

  if (!open) return null;

  const update = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const maxGuests = form.isPrivate ? 16 : 6;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const req: CreateManualBookingRequest = {
        package_slug: form.packageSlug,
        date: form.date,
        start_time: form.startTime,
        num_participants: form.numParticipants,
        customer_name: form.customerName,
        customer_email: form.customerEmail.trim() || undefined,
        customer_phone: form.customerPhone.trim() || undefined,
        customer_notes: form.customerNotes.trim() || undefined,
        has_minors: form.hasMinors,
        is_private: form.isPrivate,
        payment_status: form.paymentStatus,
      };
      const confirmation = await createManualBooking(req);
      setSuccess(confirmation);
      onCreated?.(confirmation);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const startAnother = () => {
    setForm(emptyForm(initialDate || todayStr()));
    setSuccess(null);
    setError(null);
  };

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(45,70,57,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto',
          background: C.parchment, borderRadius: 20,
          boxShadow: '0 20px 60px rgba(45,70,57,0.35)',
        }}
      >
        {/* Header */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 1,
          background: C.forest, padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: "'Crimson Pro'", fontSize: 19, fontWeight: 700, color: C.white }}>
            🌿 New Manual Booking
          </span>
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.15)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white,
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          // ── Success screen ──
          <div style={{ padding: '24px 20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: C.sageLight, border: `1.5px solid ${C.sage}`, borderRadius: 14,
              padding: '18px 16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>✅</div>
              <div style={{ fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 700, color: C.forest, marginBottom: 4 }}>
                Booking created successfully
              </div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 13, color: C.sageDark, fontWeight: 600 }}>
                Booking ref: {success.booking_ref}
              </div>
            </div>

            <div style={{
              background: C.white, border: `1px solid ${C.sand}`, borderRadius: 12,
              padding: '14px 16px', fontFamily: "'DM Sans'", fontSize: 13, color: C.bark, lineHeight: 1.8,
            }}>
              <div>{success.package_name} · {success.num_participants} guests</div>
              <div>{success.slot_date} · {formatTime12(String(success.start_time).slice(0, 5))}</div>
              <div>Total: ฿{success.total_price_thb.toLocaleString()}</div>
              <div>
                Payment: {success.payment_status === 'paid' ? 'Paid ✓' : 'Unpaid'}
                {success.payment_status === 'paid' && ' — confirmation email sent to customer'}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={startAnother} style={{
                flex: 1, padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px solid ${C.sage}`, background: C.white, color: C.sageDark,
                fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600,
              }}>
                Add Another Booking
              </button>
              <button onClick={handleClose} style={{
                flex: 1, padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                border: 'none', background: C.sage, color: C.white,
                fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600,
              }}>
                Close
              </button>
            </div>
          </div>
        ) : (
          // ── Form ──
          <form onSubmit={handleSubmit} style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(error || packagesError) && (
              <div style={{
                background: C.coralPale, border: `1px solid rgba(192,122,110,0.4)`, borderRadius: 10,
                padding: '10px 12px', fontFamily: "'DM Sans'", fontSize: 13, color: C.coral, lineHeight: 1.5,
              }}>
                {error || packagesError}
              </div>
            )}

            <Field label="Package" required>
              <select
                value={form.packageSlug}
                onChange={(e) => update({ packageSlug: e.target.value, startTime: '' })}
                required
                disabled={loadingPackages}
                style={inputStyle}
              >
                <option value="">{loadingPackages ? 'Loading packages…' : 'Select a package'}</option>
                {packages.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name} — ฿{p.price_thb.toLocaleString()} ({p.calendar_type === 'aromatherapy' ? 'Aromatherapy' : 'Herbal'})
                  </option>
                ))}
              </select>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Date" required>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => update({ date: e.target.value, startTime: '' })}
                  required
                  style={inputStyle}
                />
              </Field>
              <Field label="Time" required>
                <select
                  value={form.startTime}
                  onChange={(e) => update({ startTime: e.target.value })}
                  required
                  disabled={!selectedPackage || timeOptions.length === 0}
                  style={inputStyle}
                >
                  <option value="">
                    {!selectedPackage ? '— Select a package first —' : timeOptions.length === 0 ? 'No slots available on this day' : 'Select a time'}
                  </option>
                  {timeOptions.map((t) => (
                    <option key={t} value={t}>{formatTime12(t)}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Group / Private */}
            <Field label="Booking Type">
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { value: false, label: 'Group' },
                  { value: true, label: 'Private' },
                ] as const).map((opt) => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => update({ isPrivate: opt.value })}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${form.isPrivate === opt.value ? C.sage : C.sand}`,
                      background: form.isPrivate === opt.value ? C.sageLight : C.white,
                      color: form.isPrivate === opt.value ? C.sageDark : C.bark,
                      fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </Field>

            <Field label={`Number of Guests (up to ${maxGuests})`} required>
              <input
                type="number"
                min={1}
                max={maxGuests}
                value={form.numParticipants}
                onChange={(e) => update({ numParticipants: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                required
                style={inputStyle}
              />
            </Field>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.hasMinors}
                onChange={(e) => update({ hasMinors: e.target.checked })}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontFamily: "'DM Sans'", fontSize: 13, color: C.bark }}>Group includes minors (under 18)</span>
            </label>

            <div style={{ height: 1, background: C.sand, margin: '2px 0' }} />

            <Field label="Customer Name" required>
              <input
                type="text"
                value={form.customerName}
                onChange={(e) => update({ customerName: e.target.value })}
                required
                style={inputStyle}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Phone">
                <input
                  type="tel"
                  value={form.customerPhone}
                  onChange={(e) => update({ customerPhone: e.target.value })}
                  style={inputStyle}
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => update({ customerEmail: e.target.value })}
                  style={inputStyle}
                />
              </Field>
            </div>

            <Field label="Notes">
              <textarea
                value={form.customerNotes}
                onChange={(e) => update({ customerNotes: e.target.value })}
                rows={2}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: "'DM Sans'" }}
              />
            </Field>

            <div style={{ height: 1, background: C.sand, margin: '2px 0' }} />

            {/* Already paid? */}
            <Field label="Payment Status">
              <div style={{ display: 'flex', gap: 8 }}>
                {([
                  { value: 'unpaid', label: 'Unpaid' },
                  { value: 'paid', label: 'Paid ✓' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ paymentStatus: opt.value })}
                    style={{
                      flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${form.paymentStatus === opt.value ? C.sage : C.sand}`,
                      background: form.paymentStatus === opt.value ? C.sageLight : C.white,
                      color: form.paymentStatus === opt.value ? C.sageDark : C.bark,
                      fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600,
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {form.paymentStatus === 'paid' && (
                <div style={{ marginTop: 6, fontFamily: "'DM Sans'", fontSize: 11.5, color: C.barkLight }}>
                  The booking will be marked confirmed immediately, and the customer (if an email was entered) will receive a confirmation email.
                </div>
              )}
            </Field>

            <button
              type="submit"
              disabled={submitting || loadingPackages}
              style={{
                marginTop: 4, padding: '13px 14px', borderRadius: 12, cursor: submitting ? 'default' : 'pointer',
                border: 'none', background: C.sage, color: C.white, opacity: submitting ? 0.7 : 1,
                fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 700,
              }}
            >
              {submitting ? 'Creating booking…' : 'Create Booking'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
