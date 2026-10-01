'use client';

// ============================================================
// /partner/[token] — partner (influencer) dashboard
// ============================================================
// Private page reached by the secret link the owner copies from
// admin → Partners. Shows the partner's code(s), a shareable booking
// link with the code pre-filled, this month's numbers, recent
// bookings made with their code (date / workshop / guests / status —
// never customer names or contact details) and monthly payouts.
// Data: partner_dashboard(token) RPC. Commission counts only bookings
// whose guests were marked "arrived".
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { getPartnerDashboard, PartnerDashboard, bookingLinkWithCode, monthLabel } from '@/lib/partners';

const C = {
  sage: '#6B8F71', sageDark: '#4A7050', sageLight: '#E7EFEA', forest: '#2D4639', parchment: '#F8F5EF',
  white: '#FFFFFF', gold: '#A89068', goldLight: '#F5F0E5', bark: '#5C4A3D', barkLight: '#8A7668',
  sand: '#E8E2D8', mist: '#F0EDE6', coral: '#C07A6E', coralPale: '#FCEAE6',
};

const STATE: Record<string, { label: string; bg: string; fg: string }> = {
  came: { label: 'Came', bg: C.sageLight, fg: C.sageDark },
  upcoming: { label: 'Upcoming', bg: C.goldLight, fg: '#8A6A2E' },
  not_marked: { label: 'Checking', bg: C.goldLight, fg: '#8A6A2E' },
  no_show: { label: 'No-show', bg: C.mist, fg: C.barkLight },
  cancelled: { label: 'Cancelled', bg: C.mist, fg: C.barkLight },
  pending: { label: 'Pending', bg: C.mist, fg: C.barkLight },
};

const baht = (n: number) => `฿${Math.round(n).toLocaleString()}`;
const fmtDay = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function CopyButton({ text, label, primary }: { text: string; label: string; primary?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ }
      }}
      style={{
        padding: '8px 14px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
        fontFamily: "'DM Sans'", fontSize: 12.5, fontWeight: 700,
        background: primary ? C.sage : C.white, color: primary ? C.white : C.forest,
        border: primary ? 'none' : `1.5px solid ${C.sage}`,
      }}>{done ? 'Copied ✓' : label}</button>
  );
}

function Stat({ value, label, gold }: { value: string; label: string; gold?: boolean }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 14, padding: 12 }}>
      <div style={{ fontFamily: "'Crimson Pro'", fontSize: 24, fontWeight: 700, color: gold ? C.gold : C.forest, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontFamily: "'DM Sans'", fontSize: 11.5, color: C.barkLight, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function PartnerDashboardPage() {
  const params = useParams();
  const token = String(params?.token || '');
  const [data, setData] = useState<PartnerDashboard | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'notfound' | 'error'>('loading');

  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(token)) { setState('notfound'); return; }
    getPartnerDashboard(token)
      .then(d => { if (d) { setData(d); setState('ok'); } else setState('notfound'); })
      .catch(() => setState('error'));
  }, [token]);

  const thisMonth = useMemo(() => {
    const now = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 7); // Bangkok YYYY-MM
    return data?.months.find(m => m.month.slice(0, 7) === now) || null;
  }, [data]);

  const monthName = new Date(Date.now() + 7 * 3600 * 1000).toLocaleDateString('en-GB', { month: 'long', timeZone: 'UTC' });

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', minHeight: '100vh', background: C.parchment, fontFamily: "'DM Sans', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url(https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap);
        * { box-sizing: border-box; }
      ` }} />

      {state === 'loading' && <div style={{ padding: '60px 20px', textAlign: 'center', color: C.barkLight }}>Loading…</div>}
      {(state === 'notfound' || state === 'error') && (
        <div style={{ padding: '60px 24px', textAlign: 'center', color: C.bark, lineHeight: 1.6 }}>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 22, fontWeight: 700, color: C.forest, marginBottom: 8 }}>
            {state === 'notfound' ? 'This partner link is not active' : 'Something went wrong'}
          </div>
          Please contact Uri Herbs Workshop on WhatsApp or at uherbhouse@gmail.com.
        </div>
      )}

      {state === 'ok' && data && (
        <>
          <div style={{ background: C.forest, color: C.white, padding: '22px 18px 18px' }}>
            <div style={{ fontFamily: "'Crimson Pro'", fontSize: 24, fontWeight: 700 }}>Hi {data.partner.name.split(' ')[0]} 👋</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 3 }}>
              Your Uri Herbs Workshop partner page · {Number(data.partner.commission_pct)}% commission
            </div>
          </div>

          {data.codes.filter(c => c.active).map(c => (
            <div key={c.code} style={{ margin: '14px 16px 0' }}>
              <div style={{
                background: C.white, border: `1.5px dashed ${C.sage}`, borderRadius: 14, padding: '12px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, color: C.barkLight }}>
                    Your code — {c.discount_type === 'percent' ? `${c.discount_value}%` : baht(c.discount_value)} off for your followers
                    {c.valid_until ? ` · until ${fmtDay(c.valid_until)}` : ''}
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 700, color: C.forest, letterSpacing: '0.06em' }}>{c.code}</div>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <CopyButton text={c.code} label="Copy code" primary />
                  <CopyButton text={bookingLinkWithCode(c.code)} label="Copy link" />
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: C.barkLight, margin: '6px 2px 0', lineHeight: 1.45 }}>
                The link opens booking with your code already applied — perfect for your bio or stories.
              </div>
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '16px 16px 0' }}>
            <Stat value={String(thisMonth?.bookings || 0)} label={`Bookings · ${monthName}`} />
            <Stat value={String(thisMonth?.guests || 0)} label={`Guests · ${monthName}`} />
            <Stat value={baht(thisMonth?.earned || 0)} label="Earned (guests who came)" gold />
            <Stat value={baht(thisMonth?.expected || 0)} label="Pending (upcoming bookings)" />
          </div>

          <h3 style={{ fontFamily: "'Crimson Pro'", fontSize: 17, fontWeight: 700, color: C.forest, margin: '20px 16px 8px' }}>Bookings with your code</h3>
          <div style={{ margin: '0 16px', background: C.white, border: `1px solid ${C.sand}`, borderRadius: 14, overflow: 'hidden' }}>
            {data.bookings.length === 0 ? (
              <div style={{ padding: 16, fontSize: 13, color: C.barkLight }}>No bookings yet — share your code to get started!</div>
            ) : data.bookings.map((b, i) => {
              const s = STATE[b.state] || STATE.pending;
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  padding: '10px 12px', borderTop: i ? `1px solid ${C.mist}` : 'none', fontSize: 12.5, color: C.forest,
                }}>
                  <span style={{ minWidth: 0 }}>{fmtDay(b.date)} · {b.package} · {b.guests} guest{b.guests > 1 ? 's' : ''}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: s.bg, color: s.fg }}>{s.label}</span>
                    {b.commission > 0 && <strong>{baht(b.commission)}</strong>}
                  </span>
                </div>
              );
            })}
          </div>

          <h3 style={{ fontFamily: "'Crimson Pro'", fontSize: 17, fontWeight: 700, color: C.forest, margin: '20px 16px 8px' }}>Monthly payouts</h3>
          <div style={{ margin: '0 16px', background: C.white, border: `1px solid ${C.sand}`, borderRadius: 14, overflow: 'hidden' }}>
            {data.months.length === 0 ? (
              <div style={{ padding: 16, fontSize: 13, color: C.barkLight }}>Nothing yet.</div>
            ) : data.months.map((m, i) => {
              const paid = !!m.paid_at;
              return (
                <div key={m.month} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
                  padding: '10px 12px', borderTop: i ? `1px solid ${C.mist}` : 'none', fontSize: 12.5, color: C.forest,
                }}>
                  <span>{monthLabel(m.month)} · {m.bookings} booking{m.bookings === 1 ? '' : 's'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                    <strong>{baht(paid && m.paid_amount !== null ? m.paid_amount : m.earned)}</strong>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                      background: paid ? C.sageLight : C.goldLight, color: paid ? C.sageDark : '#8A6A2E',
                    }}>{paid ? 'Paid ✓' : 'Open'}</span>
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{
            margin: '16px 16px 30px', fontSize: 12, color: C.bark, lineHeight: 1.55,
            background: C.goldLight, border: `1px dashed ${C.gold}`, borderRadius: 10, padding: '10px 12px',
          }}>
            Commission is {Number(data.partner.commission_pct)}% of what your guests actually paid, counted once they
            attended. Payouts are made monthly. Questions? Message us on WhatsApp or email uherbhouse@gmail.com.
          </div>
        </>
      )}
    </div>
  );
}
