// ============================================================
// src/app/admin/(protected)/agencies/page.tsx
// ============================================================
// Travel agencies (B2B) — admin screen (owner spec 2026-10-01):
//   • New applications from /trade → Approve (emails the agreement to
//     sign online) or Reject.
//   • Approved, waiting for signature → resend / copy agreement link.
//   • Active partners → copy their partner-page link, pause, commission.
//   • Agency payments → unpaid bookings with due dates, uploaded
//     transfer slips (view), Mark paid.
// ============================================================

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AgencyRow, AdminAgencyBooking, listAgencies, updateAgency, notifyAgency,
  listAgencyBookings, markAgencyBookingPaid, getSlipUrl,
} from '@/lib/agency';

const C = {
  sage: '#6B8F71', sageDark: '#4A7050', sageLight: '#E7EFEA', sagePale: '#F2F7F3',
  forest: '#2D4639', parchment: '#F5F2EC', white: '#FFFFFF', gold: '#A89068',
  goldLight: '#F5F0E5', bark: '#5C4A3D', barkLight: '#8A7668', sand: '#E8E2D8',
  mist: '#F0EDE6', coral: '#C07A6E', coralPale: '#FCEAE6',
};
const SITE = 'https://www.uriherbs.com';
const baht = (n: number) => `฿${Math.round(n || 0).toLocaleString('en-US')}`;
const fmtDate = (d: string) => new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const todayStr = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const btn: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${C.sand}`, background: C.white,
  fontFamily: "'DM Sans'", fontSize: 12.5, fontWeight: 600, color: C.forest, cursor: 'pointer', whiteSpace: 'nowrap',
};
const primary: React.CSSProperties = { ...btn, border: 'none', background: C.sage, color: C.white };

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 700, color: C.forest, margin: '18px 0 8px' }}>
        {title}{typeof count === 'number' ? <span style={{ color: C.barkLight, fontWeight: 600 }}> ({count})</span> : null}
      </div>
      <div style={{ display: 'grid', gap: 10 }}>{children}</div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 14, padding: 14, fontFamily: "'DM Sans'" }}>{children}</div>;
}

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return <button type="button" style={btn} onClick={async () => {
    try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); } catch { /* ignore */ }
  }}>{ok ? 'Copied ✓' : label}</button>;
}

function Details({ a }: { a: AgencyRow }) {
  const rows: [string, string | null][] = [
    ['Contact', a.contact_name], ['Email', a.email], ['Phone', a.phone], ['Country', a.country],
    ['Website', a.website], ['Licence', a.license_no], ['Type', a.business_type], ['Groups / month', a.monthly_groups],
  ];
  return (
    <div style={{ fontSize: 12.5, color: C.bark, lineHeight: 1.6, marginTop: 4 }}>
      {rows.filter(r => r[1]).map(([k, v]) => <div key={k}><span style={{ color: C.barkLight }}>{k}:</span> {v}</div>)}
      {a.message && <div style={{ marginTop: 4, fontStyle: 'italic' }}>“{a.message}”</div>}
    </div>
  );
}

export default function AgenciesAdminPage() {
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [bookings, setBookings] = useState<AdminAgencyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [commission, setCommission] = useState<Record<string, number>>({});

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [a, b] = await Promise.all([listAgencies(), listAgencyBookings()]);
      setAgencies(a); setBookings(b);
    } catch (e: any) { setError(e.message || 'Could not load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setError(null);
    try { await fn(); await refresh(); } catch (e: any) { setError(e.message); }
    finally { setBusy(null); }
  };

  const byStatus = (s: string) => agencies.filter(a => a.status === s);
  const agencyName = useMemo(() => Object.fromEntries(agencies.map(a => [a.id, a.company_name])), [agencies]);
  const today = todayStr();
  const unpaid = bookings.filter(b => b.status === 'confirmed' && b.payment_status === 'unpaid');
  const recentPaid = bookings.filter(b => b.status === 'confirmed' && b.payment_status === 'paid' && b.slot_date >= today).slice(0, 30);

  return (
    <div className="ua-page" style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.parchment, fontFamily: "'DM Sans', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url(https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap);
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        button:active { transform: scale(0.98); }
      ` }} />
      <div style={{ background: C.forest, padding: '18px 16px 14px' }}>
        <span style={{ fontFamily: "'Crimson Pro'", fontSize: 19, fontWeight: 700, color: C.white }}>Uri Herbs Admin</span>
      </div>
      <div style={{ background: C.white, borderBottom: `1px solid ${C.sand}`, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/admin" aria-label="Back to dashboard" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: C.sagePale, flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <div>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 700, color: C.forest }}>Agencies</div>
          <div style={{ fontSize: 11.5, color: C.barkLight }}>Travel agencies & group leaders · applications, agreements, payments</div>
        </div>
      </div>

      {error && <div style={{ margin: '12px 16px 0', padding: '10px 14px', borderRadius: 10, background: '#FFF5F3', border: '1px solid rgba(192,122,110,0.3)', fontSize: 13, color: C.coral }}>{error}</div>}

      <div style={{ padding: '4px 16px 40px' }}>
        {loading && <div style={{ padding: 30, textAlign: 'center', color: C.barkLight }}>Loading…</div>}

        {!loading && (
          <>
            <Section title="Payments to check" count={unpaid.length}>
              {unpaid.length === 0 && <div style={{ fontSize: 13, color: C.barkLight }}>No unpaid agency bookings.</div>}
              {unpaid.map(b => {
                const overdue = b.payment_due_date && b.payment_due_date < today;
                return (
                  <Card key={b.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ fontSize: 13.5, color: C.forest, minWidth: 0 }}>
                        <strong>{agencyName[b.agency_id] || 'Agency'}</strong> · {b.customer_name}<br />
                        {fmtDate(b.slot_date)} · {b.packages?.name} · {b.num_participants} guests{b.is_private ? ' · private' : ''}<br />
                        <span style={{ color: C.barkLight }}>{b.booking_ref}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 700 }}>{baht(b.total_price_thb)}</div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: overdue ? C.coral : '#8A6A2E' }}>
                          {b.payment_proof_at ? 'Slip uploaded' : `due ${b.payment_due_date ? fmtDate(b.payment_due_date) : ''}`}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                      {b.payment_proof_path && (
                        <button type="button" style={btn} onClick={() => run(`slip-${b.id}`, async () => { const url = await getSlipUrl(b.id); window.open(url, '_blank'); })}>View slip</button>
                      )}
                      <button type="button" style={primary} disabled={busy === `paid-${b.id}`}
                        onClick={() => run(`paid-${b.id}`, () => markAgencyBookingPaid(b.id, true))}>Mark paid</button>
                    </div>
                  </Card>
                );
              })}
            </Section>

            <Section title="New applications" count={byStatus('pending').length}>
              {byStatus('pending').length === 0 && <div style={{ fontSize: 13, color: C.barkLight }}>No new applications.</div>}
              {byStatus('pending').map(a => (
                <Card key={a.id}>
                  <div style={{ fontFamily: "'Crimson Pro'", fontSize: 17, fontWeight: 700, color: C.forest }}>{a.company_name}</div>
                  <div style={{ fontSize: 11.5, color: C.barkLight }}>Applied {fmtDate(a.created_at)}</div>
                  <Details a={a} />
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                    <label style={{ fontSize: 12.5, color: C.bark }}>Commission %</label>
                    <input type="number" min={0} max={50} value={commission[a.id] ?? Number(a.commission_pct)}
                      onChange={e => setCommission(c => ({ ...c, [a.id]: parseFloat(e.target.value) || 0 }))}
                      style={{ width: 70, padding: '7px 8px', borderRadius: 8, border: `1.5px solid ${C.sand}`, fontSize: 13 }} />
                    <button type="button" style={primary} disabled={busy === `ok-${a.id}`} onClick={() => run(`ok-${a.id}`, async () => {
                      await updateAgency(a.id, { status: 'approved', commission_pct: commission[a.id] ?? Number(a.commission_pct), approved_at: new Date().toISOString() });
                      await notifyAgency('approved', a.id);
                    })}>Approve & send agreement</button>
                    <button type="button" style={btn} disabled={busy === `no-${a.id}`} onClick={() => run(`no-${a.id}`, () => updateAgency(a.id, { status: 'rejected' }))}>Reject</button>
                  </div>
                </Card>
              ))}
            </Section>

            <Section title="Waiting for signature" count={byStatus('approved').length}>
              {byStatus('approved').map(a => (
                <Card key={a.id}>
                  <div style={{ fontFamily: "'Crimson Pro'", fontSize: 17, fontWeight: 700, color: C.forest }}>{a.company_name}</div>
                  <div style={{ fontSize: 12.5, color: C.bark }}>{a.email} · approved {a.approved_at ? fmtDate(a.approved_at) : ''} · {Number(a.commission_pct)}%</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                    <button type="button" style={btn} disabled={busy === `re-${a.id}`} onClick={() => run(`re-${a.id}`, () => notifyAgency('approved', a.id))}>Resend agreement email</button>
                    <CopyBtn text={`${SITE}/agency/contract/${a.contract_token}`} label="Copy agreement link" />
                  </div>
                </Card>
              ))}
            </Section>

            <Section title="Active agencies" count={byStatus('active').length + byStatus('suspended').length}>
              {[...byStatus('active'), ...byStatus('suspended')].map(a => {
                const mine = bookings.filter(b => b.agency_id === a.id && b.status === 'confirmed' && b.slot_date >= today);
                const owed = mine.filter(b => b.payment_status === 'unpaid').reduce((s, b) => s + b.total_price_thb, 0);
                return (
                  <Card key={a.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div>
                        <div style={{ fontFamily: "'Crimson Pro'", fontSize: 17, fontWeight: 700, color: C.forest }}>{a.company_name}</div>
                        <div style={{ fontSize: 12.5, color: C.bark }}>
                          {a.contact_name ? `${a.contact_name} · ` : ''}{a.email} · {Number(a.commission_pct)}%<br />
                          Signed by {a.signed_name} {a.signed_at ? `on ${fmtDate(a.signed_at)}` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, height: 22, whiteSpace: 'nowrap',
                        background: a.status === 'active' ? C.sageLight : C.mist, color: a.status === 'active' ? C.sageDark : C.barkLight }}>
                        {a.status === 'active' ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: C.forest, marginTop: 8 }}>
                      <strong>{mine.length}</strong> upcoming bookings · <strong>{baht(owed)}</strong> unpaid
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                      <CopyBtn text={`${SITE}/agency/${a.portal_token}`} label="Copy agency page link" />
                      <CopyBtn text={`${SITE}/agency/contract/${a.contract_token}`} label="Agreement link" />
                      <button type="button" style={btn} disabled={busy === `st-${a.id}`} onClick={() => run(`st-${a.id}`, () => updateAgency(a.id, { status: a.status === 'active' ? 'suspended' : 'active' }))}>
                        {a.status === 'active' ? 'Pause' : 'Re-activate'}
                      </button>
                    </div>
                  </Card>
                );
              })}
            </Section>

            {recentPaid.length > 0 && (
              <Section title="Upcoming paid agency bookings" count={recentPaid.length}>
                {recentPaid.map(b => (
                  <Card key={b.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, color: C.forest }}>
                      <span>{fmtDate(b.slot_date)} · <strong>{agencyName[b.agency_id]}</strong> · {b.customer_name} · {b.num_participants} guests</span>
                      <span style={{ whiteSpace: 'nowrap' }}>{baht(b.total_price_thb)} <span style={{ color: C.sageDark, fontWeight: 700 }}>Paid ✓</span></span>
                    </div>
                  </Card>
                ))}
              </Section>
            )}

            {byStatus('rejected').length > 0 && (
              <div style={{ fontSize: 12, color: C.barkLight, marginTop: 18 }}>
                Rejected: {byStatus('rejected').map(a => a.company_name).join(', ')}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
