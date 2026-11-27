// ============================================================
// src/app/admin/(protected)/customers/page.tsx
// ============================================================
// Customers — one list of everyone we know (owner request
// 2026-11-24). Built from bookings (all channels) + landing-page
// leads by src/lib/customers.ts. Read with the signed-in admin's
// session, so RLS keeps it admin-only. Search, filter by type and
// channel, tap a customer for their history, download as CSV.
// ============================================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  buildCustomers, customersToCsv, type Customer, type CustomerBookingRow, type CustomerLeadRow,
} from '@/lib/customers';

const C = {
  sage: '#6B8F71', sageDark: '#4A7050', sageLight: '#E7EFEA', forest: '#2D4639',
  parchment: '#F5F2EC', white: '#FFFFFF', bark: '#5C4A3D', barkLight: '#8A7668', sand: '#E8E2D8',
  gold: '#A89068', goldLight: '#F5F0E5', coral: '#9A4F43',
};

const TYPE_LABEL: Record<Customer['type'], string> = { lead: 'Sign-up only', cancelled: 'Cancelled only', customer: 'Customer', repeat: 'Repeat customer' };
const STATE_LABEL = { came: 'Came', upcoming: 'Upcoming', cancelled: 'Cancelled', 'no-show': 'No-show', past: 'Not marked' } as const;

const bkkToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
const fmtDate = (d: string) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const baht = (n: number) => `฿${n.toLocaleString('en-US')}`;

const BOOKING_COLS =
  'id, booking_ref, slot_date, created_at, num_participants, customer_name, customer_email, customer_phone, total_price_thb, status, attendance_status, booking_source, ota_platform, coupon_code, is_private, packages(name), agencies(company_name), coupons(partners(name))';
const LEAD_COLS = 'id, created_at, name, email, phone, country, source, landing, coupon_code, consent_marketing';

async function fetchAll<T>(table: string, cols: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(cols).order('created_at', { ascending: true }).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data as unknown as T[]) || []));
    if (!data || data.length < 1000) return out;
  }
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 14, padding: '10px 12px' }}>
      <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 24, fontWeight: 700, color: C.sageDark, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.barkLight }}>{label}</div>
    </div>
  );
}

export default function CustomersPage() {
  const [all, setAll] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [type, setType] = useState<'all' | Customer['type'] | 'came' | 'code-unused'>('all');
  const [channel, setChannel] = useState('all');
  const [sort, setSort] = useState<'recent' | 'spent' | 'bookings'>('recent');
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [bookings, leads] = await Promise.all([
          fetchAll<CustomerBookingRow>('bookings', BOOKING_COLS),
          fetchAll<CustomerLeadRow>('leads', LEAD_COLS),
        ]);
        setAll(buildCustomers(bookings, leads, bkkToday()));
      } catch (e: any) {
        setError(e.message || 'Unknown error');
      }
      setLoading(false);
    })();
  }, []);

  const channels = useMemo(() => Array.from(new Set(all.flatMap((c) => c.channels))).sort(), [all]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const rows = all.filter((c) => {
      if (s && ![c.name, c.email, c.phone, c.country, ...c.visits.map((v) => v.ref)].join(' ').toLowerCase().includes(s)) return false;
      if (channel !== 'all' && !c.channels.includes(channel)) return false;
      if (type === 'came') return c.cameCount > 0;
      if (type === 'code-unused') return !!c.leadCode && !c.leadCodeUsed;
      return type === 'all' || c.type === type;
    });
    if (sort === 'spent') rows.sort((a, b) => b.spent - a.spent);
    else if (sort === 'bookings') rows.sort((a, b) => b.bookings - a.bookings || b.spent - a.spent);
    return rows;
  }, [all, q, type, channel, sort]);

  const totals = useMemo(() => ({
    people: shown.length,
    customers: shown.filter((c) => c.bookings > 0).length,
    repeat: shown.filter((c) => c.type === 'repeat').length,
    spent: shown.reduce((n, c) => n + c.spent, 0),
  }), [shown]);

  function download() {
    const blob = new Blob(['﻿' + customersToCsv(shown)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `uri-herbs-customers-${bkkToday()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const select: React.CSSProperties = { padding: '9px 10px', borderRadius: 10, border: `1.5px solid ${C.sand}`, fontFamily: "'DM Sans'", fontSize: 14, background: C.white, color: C.forest, maxWidth: '100%' };
  const chip = (bg: string, fg: string): React.CSSProperties => ({ fontSize: 11.5, background: bg, color: fg, borderRadius: 999, padding: '2px 9px', fontWeight: 700, whiteSpace: 'nowrap' });

  return (
    <div className="ua-page" style={{ maxWidth: 600, margin: '0 auto', padding: '18px 14px 60px', fontFamily: "'DM Sans'", color: C.forest, background: C.parchment, minHeight: '100vh' }}>
      <Link href="/admin" style={{ color: C.sageDark, fontSize: 14, textDecoration: 'none' }}>← Dashboard</Link>
      <h1 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 30, margin: '10px 0 4px' }}>Customers</h1>
      <p style={{ margin: '0 0 14px', color: C.barkLight, fontSize: 14 }}>
        Everyone who booked (website, OTAs, agencies, walk-ins) or signed up on a landing page, in one list.
        OTA guests usually come without an email, so each OTA booking may show as its own customer.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 14 }}>
        <Stat value={totals.people} label="People in this list" />
        <Stat value={totals.customers} label="Booked at least once" />
        <Stat value={totals.repeat} label="Booked more than once" />
        <Stat value={baht(totals.spent)} label="Total booked" />
      </div>

      <input
        aria-label="Search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, email, phone or booking ref"
        style={{ ...select, width: '100%', marginBottom: 10, padding: '11px 12px' }}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
        <select aria-label="Type" value={type} onChange={(e) => setType(e.target.value as typeof type)} style={select}>
          <option value="all">Everyone</option>
          <option value="customer">Booked once</option>
          <option value="repeat">Repeat customers</option>
          <option value="came">Came to a workshop</option>
          <option value="lead">Signed up, never booked</option>
          <option value="cancelled">Booked, then cancelled</option>
          <option value="code-unused">Got a code, didn&apos;t use it</option>
        </select>
        <select aria-label="Channel" value={channel} onChange={(e) => setChannel(e.target.value)} style={select}>
          <option value="all">All channels</option>
          {channels.map((ch) => <option key={ch} value={ch}>{ch}</option>)}
        </select>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} style={select}>
          <option value="recent">Most recent</option>
          <option value="spent">Highest total</option>
          <option value="bookings">Most bookings</option>
        </select>
        <button onClick={download} disabled={!shown.length} style={{ marginLeft: 'auto', padding: '10px 16px', borderRadius: 999, border: 'none', background: C.sageDark, color: C.white, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: shown.length ? 1 : 0.5 }}>
          Download CSV ({shown.length})
        </button>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: C.coral }}>Could not load customers: {error}</p>}
      {!loading && !error && shown.length === 0 && (
        <div style={{ background: C.white, borderRadius: 14, padding: 18, color: C.barkLight }}>No one matches these filters.</div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {shown.slice(0, 500).map((c) => {
          const isOpen = open === c.key;
          return (
            <div key={c.key} style={{ background: C.white, borderRadius: 14, border: `1px solid ${C.sand}` }}>
              <button
                onClick={() => setOpen(isOpen ? null : c.key)}
                aria-expanded={isOpen}
                style={{ all: 'unset', boxSizing: 'border-box', display: 'block', width: '100%', padding: '12px 14px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline' }}>
                  <strong style={{ fontSize: 15 }}>{c.name}</strong>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.sageDark, whiteSpace: 'nowrap' }}>{c.spent ? baht(c.spent) : ''}</span>
                </div>
                <div style={{ fontSize: 13.5, marginTop: 2, wordBreak: 'break-all', color: C.bark }}>
                  {[c.email, c.phone, c.country].filter(Boolean).join(' · ') || 'No contact details'}
                </div>
                <div style={{ fontSize: 12, color: C.barkLight, marginTop: 4 }}>
                  {c.bookings === 0 && c.cancelled > 0
                    ? `${c.cancelled} cancelled booking${c.cancelled > 1 ? 's' : ''}`
                    : c.bookings > 0
                    ? `${c.bookings} booking${c.bookings > 1 ? 's' : ''} · ${c.guests} guest${c.guests === 1 ? '' : 's'} · came ${c.cameCount}×${c.upcoming ? ` · ${c.upcoming} upcoming` : ''}`
                    : `Signed up ${fmtDate(c.firstSeen)}`}
                  {' · last '}{fmtDate(c.lastActivity)}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  <span style={chip(c.bookings ? C.sageLight : C.goldLight, c.bookings ? C.sageDark : C.bark)}>{TYPE_LABEL[c.type]}</span>
                  {c.channels.map((ch) => <span key={ch} style={chip(C.parchment, C.bark)}>{ch}</span>)}
                  {c.partner && <span style={chip(C.goldLight, C.bark)}>via {c.partner}</span>}
                  {c.leadCode && <span style={chip(c.leadCodeUsed ? C.sageLight : C.goldLight, c.leadCodeUsed ? C.sageDark : C.bark)}>code {c.leadCodeUsed ? 'used' : 'not used'}</span>}
                </div>
              </button>

              {isOpen && (
                <div style={{ borderTop: `1px solid ${C.sand}`, padding: '10px 14px 14px', fontSize: 13 }}>
                  {c.workshops.length > 0 && <div style={{ marginBottom: 8 }}><strong>Workshops:</strong> {c.workshops.join(', ')}</div>}
                  {c.leadSource && <div style={{ marginBottom: 8 }}><strong>Signed up from:</strong> {c.leadSource}{c.leadCode ? ` · code ${c.leadCode}` : ''}{c.marketingOk ? ' · OK to email offers' : ''}</div>}
                  {c.visits.length === 0 && <div style={{ color: C.barkLight }}>No bookings yet.</div>}
                  {c.visits.map((v, i) => (
                    <div key={`${v.ref}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0', borderTop: i ? `1px dashed ${C.sand}` : 'none', opacity: v.state === 'cancelled' ? 0.55 : 1 }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{fmtDate(v.date)} · {v.workshop}</div>
                        <div style={{ color: C.barkLight, fontSize: 12 }}>
                          {v.guests} guest{v.guests === 1 ? '' : 's'} · {v.channel}{v.code ? ` · code ${v.code}` : ''}{v.ref ? ` · ${v.ref}` : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div>{baht(v.price)}</div>
                        <div style={{ fontSize: 12, color: v.state === 'came' ? C.sageDark : C.barkLight }}>{STATE_LABEL[v.state]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {shown.length > 500 && <p style={{ color: C.barkLight, fontSize: 13, marginTop: 10 }}>Showing the first 500. Use search or the CSV for the rest.</p>}
    </div>
  );
}
