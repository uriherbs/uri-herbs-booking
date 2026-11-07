// ============================================================
// src/app/admin/(protected)/leads/page.tsx
// ============================================================
// Leads from the landing pages (owner request 2026-11-04). Read with
// the signed-in admin's session — RLS ("Admins read leads",
// is_admin()) blocks everyone else. Filter by page and source (e.g.
// the event QR code) and download as CSV for Excel / Google Sheets.
// ============================================================

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const C = {
  sage: '#6B8F71', sageDark: '#4A7050', sageLight: '#E7EFEA', forest: '#2D4639',
  parchment: '#F5F2EC', white: '#FFFFFF', bark: '#5C4A3D', barkLight: '#8A7668', sand: '#E8E2D8',
};

interface Lead {
  id: string;
  created_at: string;
  landing: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  source: string | null;
  tags: string[] | null;
  utm_source: string | null;
  utm_campaign: string | null;
  coupon_code: string | null;
  email_sent_at: string | null;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function toCsv(rows: Lead[]) {
  const cols: (keyof Lead)[] = ['created_at', 'landing', 'source', 'tags', 'name', 'email', 'phone', 'country', 'coupon_code', 'utm_source', 'utm_campaign', 'email_sent_at'];
  const q = (v: unknown) => `"${(Array.isArray(v) ? v.join(' ') : String(v ?? '')).replace(/"/g, '""')}"`;
  return [cols.join(','), ...rows.map((r) => cols.map((c) => q(r[c])).join(','))].join('\n');
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [landing, setLanding] = useState('all');
  const [source, setSource] = useState('all');
  const [tag, setTag] = useState('all');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(5000);
      if (error) setError(error.message);
      else setLeads((data as Lead[]) || []);
      setLoading(false);
    })();
  }, []);

  const landings = useMemo(() => Array.from(new Set(leads.map((l) => l.landing))), [leads]);
  const sources = useMemo(() => Array.from(new Set(leads.map((l) => l.source || '—'))), [leads]);
  // Group tags (event, shop-customer, social, website); the src:… tags are covered by the Source filter.
  const tagList = useMemo(() => Array.from(new Set(leads.flatMap((l) => (l.tags || []).filter((t) => !t.startsWith('src:'))))), [leads]);
  const shown = leads.filter(
    (l) =>
      (landing === 'all' || l.landing === landing) &&
      (source === 'all' || (l.source || '—') === source) &&
      (tag === 'all' || (l.tags || []).includes(tag))
  );

  function download() {
    const blob = new Blob(['﻿' + toCsv(shown)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `uri-herbs-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const select: React.CSSProperties = { padding: '9px 10px', borderRadius: 10, border: `1.5px solid ${C.sand}`, fontFamily: "'DM Sans'", fontSize: 14, background: C.white, color: C.forest };

  return (
    <div className="ua-page" style={{ maxWidth: 600, margin: '0 auto', padding: '18px 14px 60px', fontFamily: "'DM Sans'", color: C.forest, background: C.parchment, minHeight: '100vh' }}>
      <Link href="/admin" style={{ color: C.sageDark, fontSize: 14, textDecoration: 'none' }}>← Dashboard</Link>
      <h1 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 30, margin: '10px 0 4px' }}>Leads</h1>
      <p style={{ margin: '0 0 8px', color: C.barkLight, fontSize: 14 }}>People who left their details on a landing page (event, shop, social, website).</p>
      <Link href="/admin/leads/links" style={{ display: 'inline-block', marginBottom: 16, color: C.sageDark, fontWeight: 700, fontSize: 14 }}>Make a link or QR code →</Link>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <select aria-label="Page" value={landing} onChange={(e) => setLanding(e.target.value)} style={select}>
          <option value="all">All pages</option>
          {landings.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <select aria-label="Source" value={source} onChange={(e) => setSource(e.target.value)} style={select}>
          <option value="all">All sources</option>
          {sources.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select aria-label="Group" value={tag} onChange={(e) => setTag(e.target.value)} style={select}>
          <option value="all">All groups</option>
          {tagList.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button onClick={download} disabled={!shown.length} style={{ marginLeft: 'auto', padding: '10px 16px', borderRadius: 999, border: 'none', background: C.sageDark, color: C.white, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: shown.length ? 1 : 0.5 }}>
          Download CSV ({shown.length})
        </button>
      </div>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: '#9A4F43' }}>Could not load leads: {error}</p>}
      {!loading && !error && shown.length === 0 && (
        <div style={{ background: C.white, borderRadius: 14, padding: 18, color: C.barkLight }}>No leads yet. They appear here as soon as someone fills in a landing page form.</div>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {shown.map((l) => (
          <div key={l.id} style={{ background: C.white, borderRadius: 14, padding: '12px 14px', border: `1px solid ${C.sand}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <strong style={{ fontSize: 15 }}>{l.name}</strong>
              <span style={{ fontSize: 12, color: C.barkLight, whiteSpace: 'nowrap' }}>{fmt(l.created_at)}</span>
            </div>
            <div style={{ fontSize: 14, marginTop: 2, wordBreak: 'break-all' }}>{l.email}{l.phone ? ` · ${l.phone}` : ''}{l.country ? ` · ${l.country}` : ''}</div>
            <div style={{ fontSize: 12, color: C.barkLight, marginTop: 4 }}>
              {l.landing} · {l.source || '—'} · {l.email_sent_at ? 'gift email sent' : 'email not sent'}
              {l.coupon_code ? ` · code ${l.coupon_code}` : ''}
            </div>
            {(l.tags || []).filter((t) => !t.startsWith('src:')).length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {(l.tags || []).filter((t) => !t.startsWith('src:')).map((t) => (
                  <span key={t} style={{ fontSize: 11.5, background: C.sageLight, color: C.sageDark, borderRadius: 999, padding: '2px 9px', fontWeight: 700 }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
