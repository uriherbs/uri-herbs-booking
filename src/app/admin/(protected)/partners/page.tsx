// ============================================================
// src/app/admin/(protected)/partners/page.tsx
// ============================================================
// Partners (influencers / affiliates) — admin screen (owner request
// 2026-10-01). Create a partner with a commission %, link coupons to
// them (Coupons screen → "Partner"), copy their private dashboard link,
// see per-month commission (only bookings whose guests were marked
// "arrived") and mark months as paid.
// ============================================================

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Partner, PartnerInput, PartnerDashboard, listPartners, savePartner, setMonthPaid,
  getPartnerDashboard, partnerLink, monthLabel,
} from '@/lib/partners';

const C = {
  sage: '#6B8F71', sageDark: '#4A7050', sageLight: '#E7EFEA', sagePale: '#F2F7F3',
  forest: '#2D4639', parchment: '#F5F2EC', white: '#FFFFFF', gold: '#A89068',
  goldLight: '#F5F0E5', bark: '#5C4A3D', barkLight: '#8A7668', sand: '#E8E2D8',
  mist: '#F0EDE6', coral: '#C07A6E', coralPale: '#FCEAE6',
};

const EMPTY: PartnerInput = {
  name: '', handle: '', email: '', commission_pct: 12,
  notify_each_booking: false, monthly_email: true, is_active: true, note: '',
};

const baht = (n: number) => `฿${Math.round(n || 0).toLocaleString()}`;
const label: React.CSSProperties = { fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: C.bark, marginBottom: 5, display: 'block' };
const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.sand}`,
  fontFamily: "'DM Sans'", fontSize: 14, color: C.forest, background: C.white, outline: 'none',
};
const hint: React.CSSProperties = { fontFamily: "'DM Sans'", fontSize: 11.5, color: C.barkLight, marginTop: 4, lineHeight: 1.4 };
const btn: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${C.sand}`, background: C.white,
  fontFamily: "'DM Sans'", fontSize: 12.5, fontWeight: 600, color: C.forest, cursor: 'pointer', whiteSpace: 'nowrap',
};

function Toggle({ on, onChange, text, sub }: { on: boolean; onChange: (v: boolean) => void; text: string; sub?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', textAlign: 'left',
      background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer',
    }}>
      <span style={{ width: 38, height: 22, borderRadius: 11, flexShrink: 0, position: 'relative', marginTop: 1, background: on ? C.sage : C.sand }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: C.white, boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
      </span>
      <span>
        <span style={{ fontFamily: "'DM Sans'", fontSize: 13.5, fontWeight: 600, color: C.forest }}>{text}</span>
        {sub && <span style={{ display: 'block', ...hint, marginTop: 1 }}>{sub}</span>}
      </span>
    </button>
  );
}

function PartnerForm({ initial, editingId, onCancel, onSaved }: {
  initial: PartnerInput; editingId?: string; onCancel: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState<PartnerInput>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (p: Partial<PartnerInput>) => setF(x => ({ ...x, ...p }));

  const submit = async () => {
    setErr(null);
    if (!f.name.trim()) { setErr('Enter the partner name.'); return; }
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setErr('Email address looks wrong.'); return; }
    if (!(f.commission_pct >= 0 && f.commission_pct <= 50)) { setErr('Commission must be between 0 and 50%.'); return; }
    setSaving(true);
    try { await savePartner(f, editingId); onSaved(); }
    catch (e: any) { setErr(e.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ background: C.white, border: `1.5px solid ${C.sage}`, borderRadius: 16, padding: 16 }}>
      <div style={{ fontFamily: "'Crimson Pro'", fontSize: 19, fontWeight: 700, color: C.forest, marginBottom: 12 }}>
        {editingId ? `Edit ${initial.name}` : 'New partner'}
      </div>
      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <span style={label}>Name</span>
          <input style={input} value={f.name} placeholder="e.g. Noa" onChange={e => set({ name: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <span style={label}>Instagram / TikTok</span>
            <input style={input} value={f.handle || ''} placeholder="@handle" onChange={e => set({ handle: e.target.value })} />
          </div>
          <div>
            <span style={label}>Commission %</span>
            <input style={input} type="number" inputMode="decimal" min={0} max={50} step={0.5}
              value={f.commission_pct} onChange={e => set({ commission_pct: parseFloat(e.target.value) || 0 })} />
          </div>
        </div>
        <div>
          <span style={label}>Email</span>
          <input style={input} type="email" value={f.email || ''} placeholder="for monthly summaries" onChange={e => set({ email: e.target.value })} />
        </div>
        <div style={{ display: 'grid', gap: 2 }}>
          <Toggle on={f.monthly_email} onChange={v => set({ monthly_email: v })} text="Monthly summary email"
            sub="On the 2nd of every month: last month's bookings and commission (to the partner and to you)." />
          <Toggle on={f.notify_each_booking} onChange={v => set({ notify_each_booking: v })} text="Email on every booking"
            sub="The partner gets a short email each time someone books with their code." />
          <Toggle on={f.is_active} onChange={v => set({ is_active: v })} text="Partner is active"
            sub="When off, their dashboard link stops working." />
        </div>
        <div>
          <span style={label}>Internal note (optional)</span>
          <input style={input} value={f.note || ''} placeholder="e.g. agreed by WhatsApp, Oct 2026" onChange={e => set({ note: e.target.value })} />
        </div>
        {err && <div style={{ padding: '10px 12px', borderRadius: 10, background: C.coralPale, color: C.coral, fontFamily: "'DM Sans'", fontSize: 13 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onCancel} style={{ ...btn, flex: 1, padding: '12px 0', borderRadius: 12 }}>Cancel</button>
          <button type="button" onClick={submit} disabled={saving} style={{
            flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', background: saving ? C.sand : C.sage,
            fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, color: C.white, cursor: saving ? 'default' : 'pointer',
          }}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create partner'}</button>
        </div>
        {!editingId && <div style={hint}>Next: in Coupons, create a code and choose this partner under “Partner”.</div>}
      </div>
    </div>
  );
}

function PartnerCard({ p, onEdit }: { p: Partner; onEdit: () => void }) {
  const [d, setD] = useState<PartnerDashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showMonths, setShowMonths] = useState(false);
  const [busyMonth, setBusyMonth] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!p.is_active) return;
    getPartnerDashboard(p.dashboard_token).then(setD).catch(e => setErr(e.message));
  }, [p.dashboard_token, p.is_active]);
  useEffect(() => { load(); }, [load]);

  const nowMonth = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 7);
  const cur = d?.months.find(m => m.month.slice(0, 7) === nowMonth);
  const prev = d?.months.find(m => m.month.slice(0, 7) < nowMonth);

  const togglePaid = async (month: string, amount: number, paid: boolean) => {
    setBusyMonth(month);
    try { await setMonthPaid(p.id, month, amount, paid); load(); }
    catch (e: any) { setErr(e.message); }
    finally { setBusyMonth(null); }
  };

  return (
    <div style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 14, padding: 14, opacity: p.is_active ? 1 : 0.7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 700, color: C.forest }}>
            {p.name}{p.handle ? <span style={{ fontWeight: 600, color: C.barkLight, fontSize: 15 }}> {p.handle}</span> : null}
          </div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight, marginTop: 1 }}>
            {Number(p.commission_pct)}% commission
            {d && d.codes.length > 0 ? ` · ${d.codes.map(c => c.code).join(', ')}` : ' · no coupon yet'}
            {p.email ? ` · ${p.email}` : ''}
          </div>
          {p.note && <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight }}>{p.note}</div>}
        </div>
        <span style={{
          fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap',
          background: p.is_active ? C.sageLight : C.mist, color: p.is_active ? C.sageDark : C.barkLight,
        }}>{p.is_active ? 'Active' : 'Off'}</span>
      </div>

      {err && <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.coral, marginTop: 6 }}>{err}</div>}

      {d && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', marginTop: 10, fontFamily: "'DM Sans'", fontSize: 12.5, color: C.forest }}>
          <span><strong>{cur?.bookings || 0}</strong> bookings this month</span>
          <span><strong>{baht(cur?.earned || 0)}</strong> earned · {baht(cur?.expected || 0)} pending</span>
          {prev && (
            <span>
              {monthLabel(prev.month).split(' ')[0]}: {baht(prev.paid_at && prev.paid_amount !== null ? prev.paid_amount : prev.earned)}{' '}
              <span style={{
                fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                background: prev.paid_at ? C.sageLight : C.coralPale, color: prev.paid_at ? C.sageDark : C.coral,
              }}>{prev.paid_at ? 'Paid' : 'Unpaid'}</span>
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        <button type="button" style={btn} onClick={async () => {
          try { await navigator.clipboard.writeText(partnerLink(p.dashboard_token)); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
        }}>{copied ? 'Copied ✓' : 'Copy partner link'}</button>
        {prev && !prev.paid_at && prev.earned > 0 && (
          <button type="button" style={btn} disabled={busyMonth === prev.month}
            onClick={() => togglePaid(prev.month, prev.earned, true)}>
            Mark {monthLabel(prev.month).split(' ')[0]} paid ({baht(prev.earned)})
          </button>
        )}
        <button type="button" style={btn} onClick={() => setShowMonths(s => !s)}>{showMonths ? 'Hide months' : 'All months'}</button>
        <button type="button" style={btn} onClick={onEdit}>Edit</button>
        <Link href={`/admin/coupons?partner=${p.id}`} style={{ ...btn, textDecoration: 'none' }}>+ Coupon</Link>
      </div>

      {showMonths && d && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${C.sand}`, paddingTop: 6 }}>
          {d.months.length === 0 ? (
            <div style={{ fontFamily: "'DM Sans'", fontSize: 12.5, color: C.barkLight, padding: '6px 0' }}>No bookings yet.</div>
          ) : d.months.map(m => (
            <div key={m.month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '6px 0', fontFamily: "'DM Sans'", fontSize: 12.5, color: C.forest }}>
              <span>{monthLabel(m.month)} · {m.bookings} bookings · {m.came_guests} guests came</span>
              <span style={{ display: 'flex', gap: 6, alignItems: 'center', whiteSpace: 'nowrap' }}>
                <strong>{baht(m.paid_at && m.paid_amount !== null ? m.paid_amount : m.earned)}</strong>
                <button type="button" disabled={busyMonth === m.month}
                  onClick={() => togglePaid(m.month, m.paid_at && m.paid_amount !== null ? m.paid_amount : m.earned, !m.paid_at)}
                  style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 10, cursor: 'pointer', border: 'none',
                    background: m.paid_at ? C.sageLight : C.goldLight, color: m.paid_at ? C.sageDark : '#8A6A2E',
                  }}>{m.paid_at ? 'Paid ✓' : 'Mark paid'}</button>
              </span>
            </div>
          ))}
          <div style={hint}>Earned = commission on bookings marked “Arrived”. Mark guests as arrived in the daily view so partners get credit.</div>
        </div>
      )}
    </div>
  );
}

export default function PartnersAdminPage() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id?: string; data: PartnerInput } | null>(null);
  const [version, setVersion] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { setPartners(await listPartners()); setVersion(v => v + 1); }
    catch (e: any) { setError(e.message || 'Could not load partners'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

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
        <Link href="/admin" aria-label="Back to dashboard" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: C.sagePale, flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 700, color: C.forest }}>Partners</div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 11.5, color: C.barkLight }}>Influencers · commission on guests who came</div>
        </div>
        {!editing && (
          <button type="button" onClick={() => setEditing({ data: { ...EMPTY } })} style={{
            padding: '9px 14px', borderRadius: 20, border: 'none', background: C.sage, color: C.white,
            fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>+ New partner</button>
        )}
      </div>

      {error && (
        <div style={{ margin: '12px 16px 0', padding: '10px 14px', borderRadius: 10, background: '#FFF5F3', border: '1px solid rgba(192,122,110,0.3)', fontSize: 13, color: C.coral }}>{error}</div>
      )}

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {editing && (
          <PartnerForm key={editing.id || 'new'} initial={editing.data} editingId={editing.id}
            onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
        )}
        {!loading && partners.length === 0 && !editing && (
          <div style={{ textAlign: 'center', padding: '40px 16px', fontSize: 14, color: C.barkLight, lineHeight: 1.6 }}>
            No partners yet.<br />Tap “+ New partner”, then create a coupon for them in Coupons.
          </div>
        )}
        {partners.map(p => (
          <PartnerCard key={`${p.id}-${version}`} p={p} onEdit={() => {
            setEditing({ id: p.id, data: {
              name: p.name, handle: p.handle, email: p.email, commission_pct: Number(p.commission_pct),
              notify_each_booking: p.notify_each_booking, monthly_email: p.monthly_email, is_active: p.is_active, note: p.note,
            } });
            window.scrollTo?.({ top: 0, behavior: 'smooth' });
          }} />
        ))}
      </div>
    </div>
  );
}
