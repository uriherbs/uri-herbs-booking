'use client';

// ============================================================
// /agency/[token] — travel-agency partner page
// ============================================================
// The agency's own page (secret link from the welcome email):
//   • New booking — workshop, shared table or private session, guests,
//     date + live times (same availability engine as the public site),
//     client name; shows retail and the partner price (retail on the
//     workshop date − commission).
//   • Bookings 14+ days ahead are held unpaid until the due date
//     (14 days before); closer bookings must be paid right away
//     (30-minute hold, same as the public site).
//   • Pay online (card / PayPal) or upload a bank-transfer slip.
//   • Cancel: 7+ days = full refund · 1–6 days = 30% fee · same day = none.
// ============================================================

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAvailableSlots } from '@/lib/hooks';
import {
  AgencyPortal, AgencyBooking, PortalPackage, getAgencyPortal, loadPortalPackages, retailOn,
  agencyCreateBooking, agencyCancelBooking, uploadTransferSlip,
} from '@/lib/agency';
import { StripeCardForm } from '@/components/payments/StripeCardForm';
import { PayPalCheckoutButtons } from '@/components/payments/PayPalCheckoutButtons';

const C = {
  sage: '#6B8F71', sageDark: '#4A7050', sageLight: '#E7EFEA', forest: '#2D4639', parchment: '#F8F5EF',
  white: '#FFFFFF', gold: '#A89068', goldLight: '#F5F0E5', bark: '#5C4A3D', barkLight: '#8A7668',
  sand: '#E8E2D8', mist: '#F0EDE6', coral: '#C07A6E', coralLight: '#FCEAE6',
};
const PAYPAL_ENABLED = process.env.NEXT_PUBLIC_PAYPAL_ENABLED === 'true';
// Bank details for transfers are set by the owner in Vercel
// (NEXT_PUBLIC_BANK_TRANSFER_INFO) — never hard-coded here.
const BANK_INFO = process.env.NEXT_PUBLIC_BANK_TRANSFER_INFO || '';
const WHATSAPP = 'https://wa.me/66643349890';

const baht = (n: number) => `฿${Math.round(n || 0).toLocaleString('en-US')}`;
const todayStr = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const addDays = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtTime = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`; };

const input: React.CSSProperties = {
  width: '100%', padding: '11px 12px', borderRadius: 10, border: `1.5px solid ${C.sand}`,
  fontFamily: "'DM Sans'", fontSize: 14.5, color: C.forest, background: C.white, outline: 'none',
};
const label: React.CSSProperties = { display: 'block', fontSize: 12.5, fontWeight: 700, color: C.bark, margin: '0 0 6px' };

function Badge({ text, tone }: { text: string; tone: 'ok' | 'warn' | 'bad' | 'muted' }) {
  const t = { ok: [C.sageLight, C.sageDark], warn: [C.goldLight, '#8A6A2E'], bad: [C.coralLight, C.coral], muted: [C.mist, C.barkLight] }[tone];
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 10, background: t[0], color: t[1], whiteSpace: 'nowrap' }}>{text}</span>;
}

function PayPanel({ booking, onPaid }: { booking: { booking_id: string; net: number }; onPaid: () => void }) {
  const [method, setMethod] = useState<'card' | 'paypal'>(PAYPAL_ENABLED ? 'paypal' : 'card');
  const done = () => {
    fetch('/api/agency/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'paid', booking_id: booking.booking_id }) }).catch(() => {});
    onPaid();
  };
  return (
    <div style={{ marginTop: 10 }}>
      {PAYPAL_ENABLED && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {(['paypal', 'card'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMethod(m)} style={{
              flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13,
              border: `1.5px solid ${method === m ? C.sage : C.sand}`, background: method === m ? C.sageLight : C.white, color: C.forest,
            }}>{m === 'paypal' ? 'PayPal / card' : 'Card (Stripe)'}</button>
          ))}
        </div>
      )}
      {method === 'paypal' && PAYPAL_ENABLED
        ? <PayPalCheckoutButtons bookingId={booking.booking_id} onSuccess={done} />
        : <StripeCardForm bookingId={booking.booking_id} amountLabel={baht(booking.net)} onSuccess={done} />}
    </div>
  );
}

function NewBooking({ token, packages, commission, onCreated }: {
  token: string; packages: PortalPackage[]; commission: number; onCreated: () => void;
}) {
  const [slug, setSlug] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [guests, setGuests] = useState(2);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [client, setClient] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [payNow, setPayNow] = useState<{ booking_id: string; booking_ref: string; net: number } | null>(null);
  const [created, setCreated] = useState<{ ref: string; net: number; due: string } | null>(null);

  const pkg = packages.find(p => p.slug === slug) || null;
  const isAroma = pkg?.calendar === 'aromatherapy';
  const maxGuests = isAroma ? 4 : isPrivate ? 16 : 12;
  useEffect(() => { setGuests(g => Math.min(g, maxGuests)); }, [maxGuests]);
  useEffect(() => { setTime(''); }, [slug, date, isPrivate, guests]);

  const { slots, loading } = useAvailableSlots(date || null, slug || null, guests, isPrivate);
  const charged = isAroma && isPrivate ? 4 : isPrivate ? Math.max(guests, 4) : guests;
  const retailEach = pkg ? retailOn(pkg, date || null) : 0;
  const retail = retailEach * charged;
  const net = Math.round(retail * (100 - commission) / 100);
  const daysAhead = date ? daysBetween(todayStr(), date) : null;
  const mustPayNow = daysAhead !== null && daysAhead < 14;

  const submit = async () => {
    setErr(null);
    if (!pkg || !date || !time) { setErr('Choose a workshop, date and time.'); return; }
    if (!client.trim()) { setErr('Enter the client / group name.'); return; }
    setBusy(true);
    try {
      const r = await agencyCreateBooking(token, { package_slug: pkg.slug, date, start_time: time, guests, is_private: isPrivate, client_name: client.trim(), notes });
      if (r.pay_now) setPayNow({ booking_id: r.booking_id, booking_ref: r.booking_ref, net: r.total_price_thb });
      else { setCreated({ ref: r.booking_ref, net: r.total_price_thb, due: r.payment_due_date }); onCreated(); }
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  if (created) {
    return (
      <div style={{ background: C.white, border: `1.5px solid ${C.sage}`, borderRadius: 16, padding: 18 }}>
        <div style={{ fontFamily: "'Crimson Pro'", fontSize: 21, fontWeight: 700 }}>✓ Booking reserved — {created.ref}</div>
        <p style={{ fontSize: 14, color: C.bark, lineHeight: 1.6 }}>
          Please pay <strong>{baht(created.net)}</strong> by <strong>{fmtDate(created.due)}</strong> (in “My bookings”). We’ll remind you 18 days before the workshop and on the due date.
        </p>
        <button type="button" onClick={() => { setCreated(null); setClient(''); setNotes(''); setDate(''); }} style={{ padding: '10px 16px', borderRadius: 10, border: `1.5px solid ${C.sage}`, background: C.white, fontWeight: 700, color: C.forest, cursor: 'pointer' }}>
          Make another booking
        </button>
      </div>
    );
  }

  if (payNow) {
    return (
      <div style={{ background: C.white, border: `1.5px solid ${C.gold}`, borderRadius: 16, padding: 18 }}>
        <div style={{ fontFamily: "'Crimson Pro'", fontSize: 21, fontWeight: 700 }}>Pay now to confirm — {payNow.booking_ref}</div>
        <p style={{ fontSize: 13.5, color: C.bark, lineHeight: 1.6 }}>
          This workshop is less than 14 days away, so payment is needed now. The places are held for 30 minutes. Amount: <strong>{baht(payNow.net)}</strong>
        </p>
        <PayPanel booking={{ booking_id: payNow.booking_id, net: payNow.net }} onPaid={() => { setPayNow(null); setCreated(null); onCreated(); }} />
      </div>
    );
  }

  return (
    <div style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 16, padding: 16, display: 'grid', gap: 14 }}>
      <div>
        <span style={label}>Workshop</span>
        <select value={slug} onChange={e => setSlug(e.target.value)} style={input}>
          <option value="">Choose…</option>
          {packages.map(p => <option key={p.slug} value={p.slug}>{p.name} · {p.duration} min</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {[{ v: false, t: 'Shared table', s: 'per person' }, { v: true, t: 'Private session', s: isAroma ? 'whole class, priced as 4' : 'own table · from 4 guests' }].map(o => (
          <button key={String(o.v)} type="button" onClick={() => setIsPrivate(o.v)} style={{
            flex: 1, textAlign: 'left', padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
            border: `1.5px solid ${isPrivate === o.v ? C.sage : C.sand}`, background: isPrivate === o.v ? C.sageLight : C.white,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.forest }}>{o.t}</div>
            <div style={{ fontSize: 11.5, color: C.barkLight }}>{o.s}</div>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <span style={label}>Guests (max {maxGuests})</span>
          <input type="number" min={1} max={maxGuests} value={guests} style={input}
            onChange={e => setGuests(Math.max(1, Math.min(maxGuests, parseInt(e.target.value, 10) || 1)))} />
        </div>
        <div>
          <span style={label}>Date</span>
          <input type="date" min={todayStr()} value={date} onChange={e => setDate(e.target.value)} style={input} />
        </div>
      </div>

      {slug && date && (
        <div>
          <span style={label}>Time</span>
          {loading ? <div style={{ fontSize: 13, color: C.barkLight }}>Checking availability…</div>
            : slots.length === 0 ? <div style={{ fontSize: 13, color: C.coral }}>No times on this date for this workshop.</div>
            : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {slots.map(s => (
                  <button key={s.start_time} type="button" disabled={!s.is_available} onClick={() => setTime(s.start_time)} style={{
                    padding: '9px 14px', borderRadius: 10, cursor: s.is_available ? 'pointer' : 'default', fontWeight: 700, fontSize: 13.5,
                    border: `1.5px solid ${time === s.start_time ? C.sage : C.sand}`, background: time === s.start_time ? C.sageLight : C.white,
                    color: s.is_available ? C.forest : C.barkLight, opacity: s.is_available ? 1 : 0.5,
                  }}>
                    {fmtTime(String(s.start_time))}{' '}
                    <span style={{ fontWeight: 500, fontSize: 11.5, color: C.barkLight }}>
                      {s.is_available ? (isPrivate ? 'available' : `${s.remaining_capacity} left`) : 'full'}
                    </span>
                  </button>
                ))}
              </div>
            )}
        </div>
      )}

      <div>
        <span style={label}>Client / group name</span>
        <input value={client} onChange={e => setClient(e.target.value)} placeholder="e.g. Smith family" style={input} />
      </div>
      <div>
        <span style={label}>Notes (optional)</span>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Allergies, language, children's ages…" style={input} />
      </div>

      {pkg && (
        <div style={{ background: C.goldLight, borderRadius: 12, padding: '12px 14px', fontSize: 13.5, lineHeight: 1.6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Retail ({baht(retailEach)} × {charged})</span><span>{baht(retail)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}><span>You pay ({100 - commission}%)</span><span>{baht(net)}</span></div>
          {date && (
            <div style={{ fontSize: 12.5, color: mustPayNow ? C.coral : C.bark, marginTop: 4 }}>
              {mustPayNow ? 'Less than 14 days away — payment is needed right after booking.' : `Payment due by ${fmtDate(addDays(date, -14))}.`}
            </div>
          )}
          {isPrivate && guests < 4 && !isAroma && <div style={{ fontSize: 12, color: C.barkLight }}>Private sessions are priced for at least 4 guests.</div>}
        </div>
      )}

      {err && <div style={{ background: C.coralLight, color: C.coral, padding: '10px 12px', borderRadius: 10, fontSize: 13 }}>{err}</div>}
      <button type="button" onClick={submit} disabled={busy} style={{
        padding: '14px', borderRadius: 12, border: 'none', background: busy ? C.sand : C.forest, color: C.white,
        fontWeight: 700, fontSize: 15, cursor: busy ? 'default' : 'pointer',
      }}>{busy ? 'Booking…' : mustPayNow ? 'Book & pay now' : 'Book for my client'}</button>
    </div>
  );
}

function BookingCard({ b, token, onChange }: { b: AgencyBooking; token: string; onChange: () => void }) {
  const [open, setOpen] = useState<'pay' | 'slip' | 'cancel' | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const today = todayStr();
  const days = daysBetween(today, b.date);
  const paid = b.payment_status === 'paid';
  const cancelled = b.status === 'cancelled';
  const awaiting = b.status === 'confirmed' && !paid;
  const holding = b.status === 'pending_payment';
  const refundPct = !paid ? 0 : days >= 7 ? 100 : days >= 1 ? 70 : 0;

  const status = cancelled ? <Badge text="Cancelled" tone="muted" />
    : paid ? <Badge text="Paid ✓" tone="ok" />
    : holding ? <Badge text="Awaiting payment (30 min)" tone="bad" />
    : b.proof_sent ? <Badge text="Slip sent — checking" tone="warn" />
    : <Badge text={`Unpaid · due ${b.due ? fmtDate(b.due) : ''}`} tone={b.due && b.due <= today ? 'bad' : 'warn'} />;

  const doCancel = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await agencyCancelBooking(token, b.booking_ref);
      setMsg(r.was_paid ? `Cancelled — refund ${r.refund_pct}% (${baht(r.refund_thb)}).` : 'Cancelled.');
      onChange();
    } catch (e: any) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setMsg(null);
    try { await uploadTransferSlip(token, b.id, file); setMsg('Slip received — we’ll confirm the payment shortly.'); onChange(); }
    catch (e: any) { setMsg(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 14, padding: 14, opacity: cancelled ? 0.7 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5 }}>{fmtDate(b.date)} · {fmtTime(String(b.start_time))}</div>
          <div style={{ fontSize: 13.5, color: C.bark }}>{b.package} · {b.guests} guest{b.guests > 1 ? 's' : ''}{b.private ? ' · private' : ''}</div>
          <div style={{ fontSize: 13, color: C.barkLight }}>{b.client} · {b.booking_ref}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 19, fontWeight: 700 }}>{baht(b.net)}</div>
          {status}
        </div>
      </div>
      {cancelled && b.cancel_reason && <div style={{ fontSize: 12.5, color: C.barkLight, marginTop: 6 }}>{b.cancel_reason}</div>}

      {!cancelled && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {(awaiting || holding) && <button type="button" onClick={() => setOpen(open === 'pay' ? null : 'pay')} style={btn(true)}>Pay online</button>}
          {awaiting && <button type="button" onClick={() => setOpen(open === 'slip' ? null : 'slip')} style={btn()}>Bank transfer</button>}
          {!holding && <button type="button" onClick={() => setOpen(open === 'cancel' ? null : 'cancel')} style={btn()}>Cancel</button>}
        </div>
      )}

      {open === 'pay' && <PayPanel booking={{ booking_id: b.id, net: b.net }} onPaid={() => { setOpen(null); onChange(); }} />}
      {open === 'slip' && (
        <div style={{ marginTop: 10, background: C.parchment, borderRadius: 12, padding: 12, fontSize: 13.5, lineHeight: 1.6 }}>
          {BANK_INFO
            ? <div style={{ whiteSpace: 'pre-line', marginBottom: 8 }}>{BANK_INFO}</div>
            : <div style={{ marginBottom: 8 }}>For our bank details, message us on <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={{ color: C.sageDark, fontWeight: 700 }}>WhatsApp</a>.</div>}
          Transfer <strong>{baht(b.net)}</strong> (reference {b.booking_ref}), then upload the slip:
          <input type="file" accept="image/*,application/pdf" disabled={busy} onChange={e => onFile(e.target.files?.[0])} style={{ display: 'block', marginTop: 8 }} />
        </div>
      )}
      {open === 'cancel' && (
        <div style={{ marginTop: 10, background: C.coralLight, borderRadius: 12, padding: 12, fontSize: 13.5, lineHeight: 1.6 }}>
          {paid
            ? <>Cancelling {days} day{days === 1 ? '' : 's'} before the workshop: <strong>{refundPct}% refund ({baht(Math.round(b.net * refundPct / 100))})</strong>.</>
            : <>This booking is not paid yet — cancelling releases the places, nothing to refund.</>}
          <div style={{ marginTop: 8 }}>
            <button type="button" disabled={busy} onClick={doCancel} style={{ ...btn(), borderColor: C.coral, color: C.coral }}>{busy ? 'Cancelling…' : 'Yes, cancel this booking'}</button>
          </div>
        </div>
      )}
      {msg && <div style={{ marginTop: 8, fontSize: 13, color: C.bark }}>{msg}</div>}
    </div>
  );
}

function btn(primary = false): React.CSSProperties {
  return {
    padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13,
    border: primary ? 'none' : `1.5px solid ${C.sand}`, background: primary ? C.sage : C.white, color: primary ? C.white : C.forest,
  };
}

export default function AgencyPortalPage() {
  const params = useParams();
  const token = String(params?.token || '');
  const [data, setData] = useState<AgencyPortal | null>(null);
  const [packages, setPackages] = useState<PortalPackage[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'notfound'>('loading');
  const [tab, setTab] = useState<'new' | 'list'>('new');

  const load = useCallback(async () => {
    try {
      const d = await getAgencyPortal(token);
      if (!d) { setState('notfound'); return; }
      setData(d); setState('ok');
    } catch { setState('notfound'); }
  }, [token]);

  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(token)) { setState('notfound'); return; }
    load();
    loadPortalPackages().then(setPackages).catch(() => {});
  }, [token, load]);

  const upcoming = useMemo(() => (data?.bookings || []).filter(b => b.status !== 'cancelled' && b.date >= todayStr()), [data]);
  const toPay = upcoming.filter(b => b.payment_status !== 'paid').reduce((s, b) => s + (b.net || 0), 0);
  const active = data?.agency.status === 'active';

  return (
    <div style={{ minHeight: '100vh', background: C.parchment, fontFamily: "'DM Sans', sans-serif", color: C.forest }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url(https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap);
        * { box-sizing: border-box; }
      ` }} />
      <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 48 }}>
        {state === 'loading' && <div style={{ padding: 40, textAlign: 'center', color: C.barkLight }}>Loading…</div>}
        {state === 'notfound' && (
          <div style={{ padding: '60px 24px', textAlign: 'center', lineHeight: 1.6 }}>
            <div style={{ fontFamily: "'Crimson Pro'", fontSize: 22, fontWeight: 700, marginBottom: 6 }}>This agency link is not active</div>
            Get a fresh link on uriherbs.com/trade (“Already have an agency account?”) or WhatsApp +66 64 334 9890.
          </div>
        )}
        {state === 'ok' && data && (
          <>
            <div style={{ background: C.forest, color: C.white, padding: '22px 18px 18px' }}>
              <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gold, fontWeight: 700 }}>Uri Herbs Workshop · Agency page</div>
              <div style={{ fontFamily: "'Crimson Pro'", fontSize: 24, fontWeight: 700, marginTop: 4 }}>{data.agency.company_name}</div>
              <div style={{ fontSize: 13, opacity: 0.85, marginTop: 2 }}>
                Agency rate: retail − {Number(data.agency.commission_pct)}% ·{' '}
                <a href={`/agency/contract/${data.agency.contract_token}`} style={{ color: C.white, textDecoration: 'underline' }}>your agreement</a>
              </div>
            </div>

            {!active && (
              <div style={{ margin: '14px 16px 0', background: C.coralLight, color: C.coral, padding: '12px 14px', borderRadius: 12, fontSize: 13.5 }}>
                This account is paused — new bookings are not possible. Please contact us.
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '14px 16px 0' }}>
              <div style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 14, padding: 12 }}>
                <div style={{ fontFamily: "'Crimson Pro'", fontSize: 24, fontWeight: 700 }}>{upcoming.length}</div>
                <div style={{ fontSize: 12, color: C.barkLight }}>Upcoming bookings</div>
              </div>
              <div style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 14, padding: 12 }}>
                <div style={{ fontFamily: "'Crimson Pro'", fontSize: 24, fontWeight: 700, color: toPay ? C.gold : C.forest }}>{baht(toPay)}</div>
                <div style={{ fontSize: 12, color: C.barkLight }}>Still to pay</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, margin: '16px 16px 12px' }}>
              {([['new', 'New booking'], ['list', `My bookings (${data.bookings.length})`]] as const).map(([k, t]) => (
                <button key={k} type="button" onClick={() => setTab(k)} style={{
                  flex: 1, padding: '11px 0', borderRadius: 12, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                  border: `1.5px solid ${tab === k ? C.forest : C.sand}`, background: tab === k ? C.forest : C.white, color: tab === k ? C.white : C.forest,
                }}>{t}</button>
              ))}
            </div>

            <div style={{ margin: '0 16px' }}>
              {tab === 'new' && active && (
                <NewBooking token={token} packages={packages} commission={Number(data.agency.commission_pct)} onCreated={load} />
              )}
              {tab === 'list' && (
                <div style={{ display: 'grid', gap: 10 }}>
                  {data.bookings.length === 0 && <div style={{ color: C.barkLight, fontSize: 14, padding: 10 }}>No bookings yet.</div>}
                  {data.bookings.map(b => <BookingCard key={b.id} b={b} token={token} onChange={load} />)}
                </div>
              )}
            </div>

            <div style={{ margin: '20px 16px 0', fontSize: 12.5, color: C.barkLight, lineHeight: 1.6 }}>
              Payment is due 14 days before each workshop (we remind you 18 days before and on the due date; unpaid bookings are cancelled after the due date).
              Cancellation: 7+ days before = full refund · 1–6 days = 30% fee · same day = no refund. Questions? <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" style={{ color: C.sageDark }}>WhatsApp us</a>.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
