'use client';

// ============================================================
// /cancel/[token] — customer self-cancellation page
// ============================================================
// Reached only from the "Cancel my booking" link in the customer's
// confirmation email (the token is that booking's secret cancel_token).
// Shows the booking, the refund outcome under Terms §4 (48h rule), an
// optional reason box, and a confirm button. The server route
// /api/bookings/cancel re-checks everything before cancelling.
// ============================================================

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { C, FONT_BODY, FONT_DISPLAY } from '@/lib/theme';

type Summary = {
  booking_ref: string;
  first_name: string;
  package_name: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  total_price_thb: number;
  status: string;
  paid_online: boolean;
  refund_status: 'nothing_charged' | 'refund_due' | 'no_refund';
  already_started: boolean;
  cancelled?: boolean;
};

const ERROR_TEXT: Record<string, string> = {
  not_found: "We couldn't find this booking. Please check the link in your confirmation email, or contact us.",
  already_cancelled: 'This booking has already been cancelled.',
  already_started: 'This workshop has already started, so it can no longer be cancelled online.',
  not_cancellable: "This booking can't be cancelled online. Please contact us.",
  cancel_failed: 'Something went wrong. Please try again, or contact us on WhatsApp.',
};

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtTime(t: string) {
  const h = parseInt(t.split(':')[0], 10);
  const m = t.split(':')[1] || '00';
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function CancelBookingPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/bookings/cancel?token=${encodeURIComponent(params.token)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) setError(j.error || 'not_found');
        else setData(j);
      })
      .catch(() => setError('cancel_failed'));
  }, [params.token]);

  const confirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token, reason }),
      });
      const j = await r.json();
      if (!r.ok) setError(j.error || 'cancel_failed');
      else setData(j);
    } catch {
      setError('cancel_failed');
    } finally {
      setSubmitting(false);
    }
  };

  const card: React.CSSProperties = {
    background: C.white, border: `1px solid ${C.sand}`, borderRadius: 16, padding: '22px 20px', marginTop: 18,
  };
  const label: React.CSSProperties = {
    fontFamily: FONT_BODY, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: C.barkLight,
  };
  const note = (bg: string, border: string): React.CSSProperties => ({
    fontFamily: FONT_BODY, fontSize: 14, color: C.bark, lineHeight: 1.6,
    background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '12px 14px', marginTop: 16,
  });

  const cancelled = data?.status === 'cancelled';

  return (
    <div style={{ minHeight: '100vh', background: C.parchment, display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <main style={{ flex: 1, width: '100%', maxWidth: 520, margin: '0 auto', padding: '32px 16px 48px' }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: C.forest, margin: 0 }}>
          {cancelled ? 'Booking cancelled' : 'Cancel your booking'}
        </h1>

        {!data && !error && (
          <p style={{ fontFamily: FONT_BODY, color: C.barkLight, marginTop: 16 }}>Loading your booking…</p>
        )}

        {error && (!data || error !== 'not_found') && (
          <div style={note('#FBEFEA', '#EBC8BC')}>{ERROR_TEXT[error] || ERROR_TEXT.cancel_failed}</div>
        )}

        {data && (
          <>
            <div style={card}>
              <div style={label}>Booking</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: C.forest, marginTop: 2 }}>
                {data.booking_ref}
              </div>
              <div style={{ ...label, marginTop: 14 }}>Workshop</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: C.forest, marginTop: 2 }}>
                {data.package_name} · {data.num_participants} guest{data.num_participants > 1 ? 's' : ''}
              </div>
              <div style={{ ...label, marginTop: 14 }}>When</div>
              <div style={{ fontFamily: FONT_BODY, fontSize: 15, color: C.forest, marginTop: 2 }}>
                {fmtDate(data.slot_date)}, {fmtTime(data.start_time)} – {fmtTime(data.end_time)}
              </div>
            </div>

            {cancelled ? (
              <>
                <div style={note(C.sageLight, '#CFE0D4')}>
                  {data.first_name ? `Thank you, ${data.first_name}. ` : ''}Your booking has been cancelled and your spot released.
                  We've sent a confirmation to your email.
                </div>
                {data.refund_status === 'refund_due' && (
                  <div style={note('#FFF8E8', '#EADBB5')}>
                    You paid online, so your refund will go back to your original payment method. Please allow
                    5–10 business days for it to appear, depending on your bank.
                  </div>
                )}
                <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.bark, marginTop: 20 }}>
                  We hope to welcome you another time. <Link href="/book" style={{ color: C.sageDark, fontWeight: 700 }}>Book again</Link>
                </p>
              </>
            ) : data.already_started ? null : (
              <>
                {data.refund_status === 'refund_due' && (
                  <div style={note('#FFF8E8', '#EADBB5')}>
                    You paid online. Your refund will go back to your original payment method. Please allow
                    5–10 business days for it to appear, depending on your bank.
                  </div>
                )}
                {data.refund_status === 'no_refund' && (
                  <div style={note('#FBEFEA', '#EBC8BC')}>
                    Your workshop is less than 48 hours away. Cancellations within 48 hours are non-refundable.
                    You can still cancel to free your spot for someone else.
                  </div>
                )}
                {data.refund_status === 'nothing_charged' && (
                  <div style={note(C.sageLight, '#CFE0D4')}>
                    You chose to pay on arrival, so nothing has been charged.
                  </div>
                )}

                <label style={{ ...label, display: 'block', marginTop: 22 }} htmlFor="reason">
                  Reason (optional)
                </label>
                <textarea
                  id="reason"
                  rows={3}
                  maxLength={1000}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Let us know why you're cancelling"
                  style={{
                    width: '100%', boxSizing: 'border-box', marginTop: 6, padding: '12px 14px',
                    fontFamily: FONT_BODY, fontSize: 15, color: C.forest, lineHeight: 1.5,
                    border: `1.5px solid ${C.sand}`, borderRadius: 12, background: C.white, resize: 'vertical',
                  }}
                />

                <button
                  type="button"
                  onClick={confirm}
                  disabled={submitting}
                  style={{
                    width: '100%', marginTop: 18, padding: '15px 20px', borderRadius: 999, border: 'none',
                    background: submitting ? C.barkLight : C.forest, color: C.white,
                    fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700, cursor: submitting ? 'default' : 'pointer',
                  }}
                >
                  {submitting ? 'Cancelling…' : 'Confirm cancellation'}
                </button>
                <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.barkLight, textAlign: 'center', marginTop: 12 }}>
                  Changed your mind? Just close this page. Your booking stays as it is.
                </p>
              </>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
