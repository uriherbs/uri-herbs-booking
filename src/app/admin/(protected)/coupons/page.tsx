// ============================================================
// src/app/admin/(protected)/coupons/page.tsx
// ============================================================
// Coupons — admin screen (owner request 2026-10-01). List of every
// discount code with its usage, a create/edit form with every option
// (percent or fixed ฿, dates, max uses, workshops, private allowed,
// minimum guests, online-prepayment-only, on/off) and a per-coupon
// history of the bookings that used it. Same look as the other admin
// screens (Workshop Content).
// ============================================================

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getPackages } from '@/lib/booking-service';
import {
  Coupon, CouponInput, CouponUsage, CouponBookingUse,
  listCoupons, listCouponUsage, saveCoupon, setCouponActive, listCouponBookings,
} from '@/lib/admin-coupons-service';

const C = {
  sage: '#6B8F71', sageDark: '#4A7050', sageLight: '#E7EFEA', sagePale: '#F2F7F3',
  forest: '#2D4639', parchment: '#F5F2EC', white: '#FFFFFF', gold: '#A89068',
  goldLight: '#F5F0E5', bark: '#5C4A3D', barkLight: '#8A7668', sand: '#E8E2D8',
  mist: '#F0EDE6', coral: '#C07A6E', coralPale: '#FCEAE6',
};

const EMPTY: CouponInput = {
  code: '', note: '', discount_type: 'percent', discount_value: 10,
  valid_from: null, valid_until: null, max_uses: null, package_slugs: null,
  allow_private: true, min_participants: null, prepay_only: false, is_active: true,
};

const todayStr = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10); // Bangkok date

function discountLabel(c: Pick<Coupon, 'discount_type' | 'discount_value'>) {
  return c.discount_type === 'percent' ? `${c.discount_value}% off` : `฿${c.discount_value.toLocaleString()} off`;
}

function statusOf(c: Coupon, usage?: CouponUsage): { label: string; bg: string; fg: string } {
  const t = todayStr();
  if (!c.is_active) return { label: 'Off', bg: C.mist, fg: C.barkLight };
  if (c.valid_until && t > c.valid_until) return { label: 'Expired', bg: C.mist, fg: C.barkLight };
  if (c.valid_from && t < c.valid_from) return { label: 'Starts ' + fmtDate(c.valid_from), bg: C.goldLight, fg: '#8A6A2E' };
  if (c.max_uses !== null && (usage?.uses || 0) >= c.max_uses) return { label: 'Used up', bg: C.coralPale, fg: C.coral };
  return { label: 'Active', bg: C.sageLight, fg: C.sageDark };
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const label: React.CSSProperties = { fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: C.bark, marginBottom: 5, display: 'block' };
const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: `1.5px solid ${C.sand}`,
  fontFamily: "'DM Sans'", fontSize: 14, color: C.forest, background: C.white, outline: 'none',
};
const hint: React.CSSProperties = { fontFamily: "'DM Sans'", fontSize: 11.5, color: C.barkLight, marginTop: 4, lineHeight: 1.4 };

function Toggle({ on, onChange, text, sub }: { on: boolean; onChange: (v: boolean) => void; text: string; sub?: string }) {
  return (
    <button type="button" onClick={() => onChange(!on)} style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', textAlign: 'left',
      background: 'none', border: 'none', padding: '6px 0', cursor: 'pointer',
    }}>
      <span style={{
        width: 38, height: 22, borderRadius: 11, flexShrink: 0, position: 'relative', marginTop: 1,
        background: on ? C.sage : C.sand, transition: 'background 0.15s',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: '50%',
          background: C.white, transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }} />
      </span>
      <span>
        <span style={{ fontFamily: "'DM Sans'", fontSize: 13.5, fontWeight: 600, color: C.forest }}>{text}</span>
        {sub && <span style={{ display: 'block', ...hint, marginTop: 1 }}>{sub}</span>}
      </span>
    </button>
  );
}

function CouponForm({ initial, editingId, packages, onCancel, onSaved }: {
  initial: CouponInput; editingId?: string; packages: { slug: string; name: string }[];
  onCancel: () => void; onSaved: () => void;
}) {
  const [f, setF] = useState<CouponInput>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (patch: Partial<CouponInput>) => setF(x => ({ ...x, ...patch }));
  const allWorkshops = f.package_slugs === null; // [] while picking = none ticked yet

  const submit = async () => {
    setErr(null);
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(f.code.trim())) { setErr('Code: 3–30 characters, letters, numbers, - or _ only (no spaces).'); return; }
    if (!f.discount_value || f.discount_value <= 0) { setErr('Enter the discount amount.'); return; }
    if (f.discount_type === 'percent' && f.discount_value > 100) { setErr('A percentage discount can be at most 100%.'); return; }
    if (f.package_slugs !== null && f.package_slugs.length === 0) { setErr('Tick at least one workshop, or turn “All workshops” back on.'); return; }
    setSaving(true);
    try { await saveCoupon(f, editingId); onSaved(); }
    catch (e: any) { setErr(e.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  const toggleSlug = (slug: string) => {
    const cur = f.package_slugs || [];
    set({ package_slugs: cur.includes(slug) ? cur.filter(s => s !== slug) : [...cur, slug] });
  };

  return (
    <div style={{ background: C.white, border: `1.5px solid ${C.sage}`, borderRadius: 16, padding: 16 }}>
      <div style={{ fontFamily: "'Crimson Pro'", fontSize: 19, fontWeight: 700, color: C.forest, marginBottom: 12 }}>
        {editingId ? `Edit ${initial.code}` : 'New coupon'}
      </div>

      <div style={{ display: 'grid', gap: 14 }}>
        <div>
          <span style={label}>Code</span>
          <input style={{ ...input, letterSpacing: '0.05em', fontWeight: 600 }}
            value={f.code} placeholder="e.g. WELCOME10" autoCapitalize="characters"
            onChange={e => set({ code: e.target.value.toUpperCase().replace(/\s/g, '') })} />
          <div style={hint}>What the customer types. Letters and numbers, no spaces.</div>
        </div>

        <div>
          <span style={label}>Discount</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${C.sand}`, flexShrink: 0 }}>
              {(['percent', 'fixed'] as const).map(t => (
                <button key={t} type="button" onClick={() => set({ discount_type: t })} style={{
                  padding: '0 14px', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700,
                  background: f.discount_type === t ? C.sage : C.white, color: f.discount_type === t ? C.white : C.bark,
                }}>{t === 'percent' ? '%' : '฿'}</button>
              ))}
            </div>
            <input style={input} type="number" inputMode="numeric" min={1}
              value={f.discount_value || ''} onChange={e => set({ discount_value: parseInt(e.target.value, 10) || 0 })} />
          </div>
          <div style={hint}>
            {f.discount_type === 'percent' ? 'Percent off the booking total.' : 'Fixed amount off the whole booking (not per person).'}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <span style={label}>Valid from</span>
            <input style={input} type="date" value={f.valid_from || ''} onChange={e => set({ valid_from: e.target.value || null })} />
          </div>
          <div>
            <span style={label}>Valid until</span>
            <input style={input} type="date" value={f.valid_until || ''} onChange={e => set({ valid_until: e.target.value || null })} />
          </div>
        </div>
        <div style={{ ...hint, marginTop: -8 }}>Days the code can be entered. Leave empty for no limit.</div>

        <div>
          <span style={label}>How many times can it be used?</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {[{ v: null, t: 'Unlimited' }, { v: 1, t: 'One-time' }].map(o => (
              <button key={o.t} type="button" onClick={() => set({ max_uses: o.v })} style={{
                padding: '9px 12px', borderRadius: 10, cursor: 'pointer', fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600,
                border: `1.5px solid ${f.max_uses === o.v ? C.sage : C.sand}`,
                background: f.max_uses === o.v ? C.sageLight : C.white, color: C.forest,
              }}>{o.t}</button>
            ))}
            <input style={{ ...input, width: 90 }} type="number" inputMode="numeric" min={1} placeholder="Other"
              value={f.max_uses && f.max_uses > 1 ? f.max_uses : ''}
              onChange={e => { const n = parseInt(e.target.value, 10); set({ max_uses: n > 0 ? n : null }); }} />
          </div>
          <div style={hint}>"One-time" = a personal code for one customer. Each booking counts as one use.</div>
        </div>

        <div>
          <span style={label}>Which workshops?</span>
          <Toggle on={allWorkshops} onChange={v => set({ package_slugs: v ? null : [] })} text="All workshops" />
          {!allWorkshops && (
            <div style={{ display: 'grid', gap: 6, marginTop: 6, paddingLeft: 4 }}>
              {packages.map(p => {
                const on = (f.package_slugs || []).includes(p.slug);
                return (
                  <label key={p.slug} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: "'DM Sans'", fontSize: 13.5, color: C.forest, cursor: 'pointer' }}>
                    <input type="checkbox" checked={on} onChange={() => toggleSlug(p.slug)} style={{ width: 17, height: 17, accentColor: C.sage }} />
                    {p.name}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <span style={label}>Minimum guests (optional)</span>
          <input style={{ ...input, width: 120 }} type="number" inputMode="numeric" min={1} placeholder="Any"
            value={f.min_participants || ''} onChange={e => { const n = parseInt(e.target.value, 10); set({ min_participants: n > 0 ? n : null }); }} />
          <div style={hint}>e.g. 4 = the code only works for bookings of 4 people or more.</div>
        </div>

        <div style={{ display: 'grid', gap: 2 }}>
          <Toggle on={f.allow_private} onChange={v => set({ allow_private: v })} text="Also valid for Private Sessions" />
          <Toggle on={f.prepay_only} onChange={v => set({ prepay_only: v })} text="Online prepayment only"
            sub="When on, the code can't be used with “Pay Later” (cash on arrival) — only card / PayPal." />
          <Toggle on={f.is_active} onChange={v => set({ is_active: v })} text="Coupon is on" />
        </div>

        <div>
          <span style={label}>Internal note (optional)</span>
          <input style={input} value={f.note || ''} placeholder="e.g. Instagram campaign, October"
            onChange={e => set({ note: e.target.value })} />
          <div style={hint}>Only you see this.</div>
        </div>

        {err && (
          <div style={{ padding: '10px 12px', borderRadius: 10, background: C.coralPale, color: C.coral, fontFamily: "'DM Sans'", fontSize: 13 }}>{err}</div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onCancel} style={{
            flex: 1, padding: '12px 0', borderRadius: 12, border: `1.5px solid ${C.sand}`, background: C.white,
            fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, color: C.bark, cursor: 'pointer',
          }}>Cancel</button>
          <button type="button" onClick={submit} disabled={saving} style={{
            flex: 2, padding: '12px 0', borderRadius: 12, border: 'none', background: saving ? C.sand : C.sage,
            fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, color: C.white, cursor: saving ? 'default' : 'pointer',
          }}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Create coupon'}</button>
        </div>
      </div>
    </div>
  );
}

function CouponCard({ c, usage, packagesBySlug, onEdit, onToggle }: {
  c: Coupon; usage?: CouponUsage; packagesBySlug: Record<string, string>;
  onEdit: () => void; onToggle: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<CouponBookingUse[] | null>(null);
  const [histErr, setHistErr] = useState<string | null>(null);
  const st = statusOf(c, usage);
  const uses = usage?.uses || 0;

  useEffect(() => {
    if (!showHistory || history) return;
    listCouponBookings(c.id).then(setHistory).catch(e => setHistErr(e.message));
  }, [showHistory, history, c.id]);

  const rules: string[] = [];
  if (c.valid_from || c.valid_until) rules.push(`${c.valid_from ? fmtDate(c.valid_from) : '…'} – ${c.valid_until ? fmtDate(c.valid_until) : '…'}`);
  if (c.package_slugs && c.package_slugs.length > 0) rules.push(c.package_slugs.map(s => packagesBySlug[s] || s).join(', '));
  if (!c.allow_private) rules.push('not for private');
  if (c.min_participants) rules.push(`${c.min_participants}+ guests`);
  if (c.prepay_only) rules.push('online prepayment only');

  return (
    <div style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 14, padding: 14, opacity: c.is_active ? 1 : 0.75 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 700, color: C.forest, letterSpacing: '0.04em' }}>{c.code}</div>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 17, fontWeight: 700, color: C.gold }}>{discountLabel(c)}</div>
          {c.note && <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight, marginTop: 2 }}>{c.note}</div>}
        </div>
        <span style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: st.bg, color: st.fg, whiteSpace: 'nowrap' }}>{st.label}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 10, fontFamily: "'DM Sans'", fontSize: 12.5, color: C.bark }}>
        <span><strong>{uses}</strong>{c.max_uses !== null ? ` / ${c.max_uses}` : ''} used</span>
        {(usage?.total_discount_thb || 0) > 0 && <span>฿{usage!.total_discount_thb.toLocaleString()} given</span>}
      </div>
      {rules.length > 0 && (
        <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight, marginTop: 4 }}>{rules.join(' · ')}</div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" onClick={onEdit} style={btn()}>Edit</button>
        <button type="button" onClick={onToggle} style={btn()}>{c.is_active ? 'Turn off' : 'Turn on'}</button>
        <button type="button" onClick={() => setShowHistory(s => !s)} style={btn()}>{showHistory ? 'Hide uses' : `Uses (${uses})`}</button>
      </div>

      {showHistory && (
        <div style={{ marginTop: 10, borderTop: `1px solid ${C.sand}`, paddingTop: 8 }}>
          {histErr ? (
            <div style={{ fontFamily: "'DM Sans'", fontSize: 12.5, color: C.coral }}>{histErr}</div>
          ) : !history ? (
            <div style={{ fontFamily: "'DM Sans'", fontSize: 12.5, color: C.barkLight }}>Loading…</div>
          ) : history.length === 0 ? (
            <div style={{ fontFamily: "'DM Sans'", fontSize: 12.5, color: C.barkLight }}>Not used yet.</div>
          ) : history.map(h => (
            <div key={h.booking_ref} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '5px 0', fontFamily: "'DM Sans'", fontSize: 12.5, color: h.status === 'cancelled' ? C.barkLight : C.forest, textDecoration: h.status === 'cancelled' ? 'line-through' : 'none' }}>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {fmtDate(h.slot_date)} · {h.customer_name} <span style={{ color: C.barkLight }}>({h.booking_ref})</span>
              </span>
              <span style={{ whiteSpace: 'nowrap', color: C.sageDark }}>−฿{Number(h.discount_thb).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function btn(): React.CSSProperties {
  return {
    flex: 1, padding: '8px 0', borderRadius: 10, border: `1.5px solid ${C.sand}`, background: C.white,
    fontFamily: "'DM Sans'", fontSize: 12.5, fontWeight: 600, color: C.forest, cursor: 'pointer',
  };
}

export default function CouponsAdminPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [usage, setUsage] = useState<Record<string, CouponUsage>>({});
  const [packages, setPackages] = useState<{ slug: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id?: string; data: CouponInput } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [cs, us] = await Promise.all([listCoupons(), listCouponUsage()]);
      setCoupons(cs); setUsage(us);
    } catch (e: any) { setError(e.message || 'Could not load coupons'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    getPackages().then(ps => setPackages(ps.map(p => ({ slug: p.slug, name: p.name })))).catch(() => {});
  }, []);

  const packagesBySlug = useMemo(() => Object.fromEntries(packages.map(p => [p.slug, p.name])), [packages]);

  const toggle = async (c: Coupon) => {
    try { await setCouponActive(c.id, !c.is_active); refresh(); }
    catch (e: any) { setError(e.message); }
  };

  return (
    <div className="ua-page" style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.parchment, fontFamily: "'DM Sans', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url(https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap);
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        button:active { transform: scale(0.98); }
        a { text-decoration: none; }
      ` }} />

      <div style={{ background: C.forest, padding: '18px 16px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ fontFamily: "'Crimson Pro'", fontSize: 19, fontWeight: 700, color: C.white }}>Uri Herbs Admin</span>
      </div>

      <div style={{ background: C.white, borderBottom: `1px solid ${C.sand}`, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/admin" aria-label="Back to dashboard" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8, background: C.sagePale, flexShrink: 0,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 700, color: C.forest }}>Coupons</div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 11.5, color: C.barkLight }}>
            {loading ? 'Loading…' : `${coupons.length} coupon${coupons.length === 1 ? '' : 's'} · customers enter the code at payment`}
          </div>
        </div>
        {!editing && (
          <button type="button" onClick={() => setEditing({ data: { ...EMPTY } })} style={{
            padding: '9px 14px', borderRadius: 20, border: 'none', background: C.sage, color: C.white,
            fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
          }}>+ New coupon</button>
        )}
      </div>

      {error && (
        <div style={{ margin: '12px 16px 0', padding: '10px 14px', borderRadius: 10, background: '#FFF5F3', border: '1px solid rgba(192,122,110,0.3)', fontSize: 13, color: C.coral }}>
          {error}{' '}
          <button onClick={refresh} style={{ color: C.coral, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}>Retry</button>
        </div>
      )}

      <div style={{ padding: '16px 16px 40px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {editing && (
          <CouponForm
            key={editing.id || 'new'}
            initial={editing.data} editingId={editing.id} packages={packages}
            onCancel={() => setEditing(null)}
            onSaved={() => { setEditing(null); refresh(); }}
          />
        )}

        {!loading && coupons.length === 0 && !editing && (
          <div style={{ textAlign: 'center', padding: '40px 16px', fontSize: 14, color: C.barkLight, lineHeight: 1.6 }}>
            No coupons yet.<br />Tap “+ New coupon” to create your first one.
          </div>
        )}

        {coupons.map(c => (
          <CouponCard
            key={c.id} c={c} usage={usage[c.id]} packagesBySlug={packagesBySlug}
            onEdit={() => {
              const { id, created_at, ...data } = c;
              setEditing({ id, data });
              window.scrollTo?.({ top: 0, behavior: 'smooth' });
            }}
            onToggle={() => toggle(c)}
          />
        ))}
      </div>
    </div>
  );
}
