'use client';

// ============================================================
// /reschedule/[token] — customer self-reschedule page
// ============================================================
// Reached from the "Change date or time" link in the customer's
// confirmation email. Same workshop + same guests; only date/time can
// change (owner rule, 2026-09-25). Allowed until 2 hours before the
// current workshop, unlimited times. Server re-checks everything.
// ============================================================

import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { C, FONT_BODY, FONT_DISPLAY } from '@/lib/theme';
import MiniCalendar from '@/components/booking/MiniCalendar';

type Summary = {
  booking_ref: string;
  first_name: string;
  package_name: string;
  package_slug: string | null;
  calendar_type: string | null;
  slot_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  is_private: boolean;
  status: string;
  can_reschedule: boolean;
  too_late: boolean;
  rescheduled?: boolean;
};
type Time = { start_time: string; end_time: string; is_available: boolean };

const ERROR_TEXT: Record<string, string> = {
  not_found: "We couldn't find this booking. Please check the link in your confirmation email, or contact us.",
  not_reschedulable: "This booking can't be rescheduled online (it may have been cancelled). Please contact us.",
  too_late: 'Online rescheduling closes 2 hours before your workshop. Please message us on WhatsApp.',
  same_slot: 'That is already your current date and time. Please pick a different one.',
  slot_full: 'Sorry, that time has just filled up. Please choose another time.',
  slot_unavailable: 'That time is no longer available. Please choose another time.',
  slots_failed: "We couldn't load the times for that date. Please try again.",
  reschedule_failed: 'Something went wrong. Please try again, or contact us on WhatsApp.',
  pick_first: 'Please choose a new date and time first.',
};

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function fmtTime(t: string) {
  const h = parseInt(t.split(':')[0], 10);
  const m = t.split(':')[1] || '00';
  return `${h % 12 === 0 ? 12 : h % 12}:${m} ${h >= 12 ? 'PM' : 'AM'}`;
}

export default function RescheduleBookingPage({ params }: { params: { token: string } }) {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [times, setTimes] = useState<Time[] | null>(null);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [time, setTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previous, setPrevious] = useState<{ date: string; time: string } | null>(null);

  useEffect(() => {
    fetch(`/api/bookings/reschedule?token=${encodeURIComponent(params.token)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) setError(j.error || 'not_found');
        else setData(j);
      })
      .catch(() => setError('reschedule_failed'));
  }, [params.token]);

  useEffect(() => {
    if (!date) return;
    setTimes(null);
    setTime('');
    setLoadingTimes(true);
    setError(null);
    fetch(`/api/bookings/reschedule?token=${encodeURIComponent(params.token)}&date=${date}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) setError(j.error || 'slots_failed');
        else setTimes(j.times || []);
      })
      .catch(() => setError('slots_failed'))
      .finally(() => setLoadingTimes(false));
  }, [date, params.token]);

  const confirm = async () => {
    if (!data) return;
    if (!date || !time) { setError('pick_first'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch('/api/bookings/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token, date, time }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || 'reschedule_failed');
        if (j.error === 'slot_full' || j.error === 'slot_unavailable') {
          // refresh the list so the taken time disappears
          const d = date; setDate(''); setTimeout(() => setDate(d), 0);
        }
      } else {
        setPrevious({ date: data.slot_date, time: data.start_time });
        setData(j);
      }
    } catch {
      setError('reschedule_failed');
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
  const value: React.CSSProperties = { fontFamily: FONT_BODY, fontSize: 15, color: C.forest, marginTop: 2 };

  const done = !!data?.rescheduled;
  const available = (times || []).filter((t) => t.is_available);

  return (
    <div style={{ minHeight: '100vh', background: C.parchment, display: 'flex', flexDirection: 'column' }}>
      <SiteHeader />
      <main style={{ flex: 1, width: '100%', maxWidth: 520, margin: '0 auto', padding: '32px 16px 48px' }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 32, color: C.forest, margin: 0 }}>
          {done ? 'Booking rescheduled' : 'Change date or time'}
        </h1>

        {!data && !error && (
          <p style={{ fontFamily: FONT_BODY, color: C.barkLight, marginTop: 16 }}>Loading your booking…</p>
        )}

        {error && (
          <div style={note('#FBEFEA', '#EBC8BC')}>{ERROR_TEXT[error] || ERROR_TEXT.reschedule_failed}</div>
        )}

        {data && (
          <>
            <div style={card}>
              <div style={label}>Booking</div>
              <div style={{ ...value, fontWeight: 700 }}>{data.booking_ref}</div>
              <div style={{ ...label, marginTop: 14 }}>Workshop</div>
              <div style={value}>
                {data.package_name} · {data.num_participants} guest{data.num_participants > 1 ? 's' : ''}
                {data.is_private ? ' · Private' : ''}
              </div>
              <div style={{ ...label, marginTop: 14 }}>{done ? 'New date & time' : 'Current date & time'}</div>
              <div style={value}>
                {fmtDate(data.slot_date)}, {fmtTime(data.start_time)} – {fmtTime(data.end_time)}
              </div>
              {done && previous && (
                <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.barkLight, marginTop: 6 }}>
                  Was: {fmtDate(previous.date)}, {fmtTime(previous.time)}
                </div>
              )}
            </div>

            {done ? (
              <div style={note(C.sageLight, '#CFE0D4')}>
                {data.first_name ? `All set, ${data.first_name}! ` : 'All set! '}Your booking has been moved. We&apos;ve
                emailed you the updated details. See you then!
              </div>
            ) : data.status === 'cancelled' ? (
              <div style={note('#FBEFEA', '#EBC8BC')}>This booking has been cancelled, so it can&apos;t be rescheduled.</div>
            ) : data.too_late ? (
              <div style={note('#FBEFEA', '#EBC8BC')}>
                Online rescheduling closes 2 hours before your workshop. Please message us on WhatsApp.
              </div>
            ) : data.can_reschedule ? (
              <>
                <div style={note(C.sageLight, '#CFE0D4')}>
                  You can change the <strong>date and time</strong> only. The workshop and number of guests stay the same.
                  Want a different workshop or number of guests? Please{' '}
                  <Link href={`/cancel/${params.token}`} style={{ color: C.sageDark, fontWeight: 700 }}>cancel this booking</Link>{' '}
                  and book again, or contact us.
                </div>
                {data.calendar_type === 'aromatherapy' && (
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.barkLight, marginTop: 10 }}>
                    Skincare &amp; Aromatherapy runs Mon &amp; Wed at 2:00 PM, and Tue &amp; Thu at 11:00 AM.
                  </div>
                )}

                <div style={{ ...label, marginTop: 22, marginBottom: 8 }}>New date</div>
                <MiniCalendar
                  selectedDate={date || null}
                  onSelectDate={setDate}
                  packageSlug={data.package_slug}
                  participants={data.num_participants}
                  isPrivate={data.is_private}
                  markedDate={data.slot_date}
                />

                {date && (
                  <div style={{ marginTop: 18 }}>
                    <div style={label}>New time</div>
                    {loadingTimes && (
                      <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.barkLight }}>Checking availability…</p>
                    )}
                    {times && available.length === 0 && !loadingTimes && (
                      <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.bark }}>
                        No available times on this date. Please try another date.
                      </p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
                      {available.map((t) => {
                        const sel = time === t.start_time;
                        return (
                          <button
                            key={t.start_time}
                            type="button"
                            onClick={() => setTime(t.start_time)}
                            style={{
                              padding: '10px 16px', borderRadius: 999, cursor: 'pointer',
                              fontFamily: FONT_BODY, fontSize: 15, fontWeight: 600,
                              border: `1.5px solid ${sel ? C.forest : C.sand}`,
                              background: sel ? C.forest : C.white, color: sel ? C.white : C.forest,
                            }}
                          >
                            {fmtTime(t.start_time)} – {fmtTime(t.end_time)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={confirm}
                  disabled={submitting}
                  style={{
                    // Owner preference: light brown until tapped (even after a time is
                    // chosen); turns dark green once the customer taps it.
                    width: '100%', marginTop: 24, padding: '15px 20px', borderRadius: 999, border: 'none',
                    background: submitting ? C.forest : C.barkLight, color: C.white,
                    fontFamily: FONT_BODY, fontSize: 16, fontWeight: 700,
                    cursor: submitting ? 'default' : 'pointer',
                  }}
                >
                  {submitting ? 'Moving your booking…' : 'Confirm new date & time'}
                </button>
                <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.barkLight, textAlign: 'center', marginTop: 12 }}>
                  Changed your mind? Just close this page. Your booking stays as it is.
                </p>
              </>
            ) : (
              <div style={note('#FBEFEA', '#EBC8BC')}>This booking can&apos;t be rescheduled online. Please contact us.</div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
