'use client';

// ============================================================
// /agency/contract/[token] — partner agreement (read + sign)
// ============================================================
// Reached from the "your application is approved" email. Shows the
// agreement with the agency's details and the live partner rate table;
// the agency ticks "I agree", types its name and signs. Signing is
// recorded server-side (/api/agency/sign: name, time, IP, version and
// a text copy) and the partner-page link is emailed. Already-signed
// agreements show who signed and when, with a print/PDF button.
// ============================================================

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getAgencyContract, loadPortalPackages, AgencyContractInfo } from '@/lib/agency';
import { contractSections, rateRows, BUSINESS, CONTRACT_VERSION } from '@/lib/agency-contract';

const C = {
  sage: '#6B8F71', sageDark: '#4A7050', sageLight: '#E7EFEA', forest: '#2D4639', parchment: '#F8F5EF',
  white: '#FFFFFF', gold: '#A89068', goldLight: '#F5F0E5', bark: '#5C4A3D', barkLight: '#8A7668',
  sand: '#E8E2D8', coral: '#C07A6E', coralLight: '#FCEAE6',
};
const baht = (n: number) => `฿${Math.round(n).toLocaleString('en-US')}`;
const fmtPeriod = (p: string) => p === 'current'
  ? 'Current rates'
  : `Workshops from ${new Date(p + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`;

export default function AgencyContractPage() {
  const params = useParams();
  const token = String(params?.token || '');
  const [info, setInfo] = useState<AgencyContractInfo | null>(null);
  const [rates, setRates] = useState<ReturnType<typeof rateRows>>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'notfound'>('loading');
  const [agree, setAgree] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [portalToken, setPortalToken] = useState<string | null>(null);

  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(token)) { setState('notfound'); return; }
    Promise.all([getAgencyContract(token), loadPortalPackages()])
      .then(([c, pk]) => {
        if (!c) { setState('notfound'); return; }
        setInfo(c);
        setRates(rateRows(pk, Number(c.commission_pct)));
        setState('ok');
      })
      .catch(() => setState('notfound'));
  }, [token]);

  const sign = async () => {
    setErr(null);
    if (!agree || name.trim().length < 3) { setErr('Please tick the box and type your full name.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/agency/sign', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name: name.trim(), agree }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Could not sign');
      setPortalToken(json.portal_token || null);
      const c = await getAgencyContract(token);
      if (c) setInfo(c);
    } catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };

  const signed = info?.status === 'active' || info?.status === 'suspended';
  let period = '';

  return (
    <div style={{ minHeight: '100vh', background: C.parchment, fontFamily: "'DM Sans', sans-serif", color: C.forest }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url(https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap);
        * { box-sizing: border-box; }
      ` }} />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 0 48px' }}>
        <div style={{ background: C.forest, color: C.white, padding: '24px 20px 20px' }}>
          <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gold, fontWeight: 700 }}>Partner agreement</div>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 26, fontWeight: 700, marginTop: 4 }}>
            {BUSINESS.name}{info ? ` × ${info.company_name}` : ''}
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.75, marginTop: 2 }}>Version {info?.contract_version || CONTRACT_VERSION}</div>
        </div>

        {state === 'loading' && <div style={{ padding: 40, textAlign: 'center', color: C.barkLight }}>Loading…</div>}
        {state === 'notfound' && (
          <div style={{ padding: '40px 24px', textAlign: 'center', lineHeight: 1.6 }}>
            This agreement link is not valid. Please contact us at {BUSINESS.email} or WhatsApp {BUSINESS.phone}.
          </div>
        )}

        {state === 'ok' && info && (
          <div style={{ padding: '8px 20px 0' }}>
            {contractSections(info).map(sct => (
              <div key={sct.title} style={{ marginTop: 18 }}>
                <h2 style={{ fontFamily: "'Crimson Pro'", fontSize: 19, fontWeight: 700, margin: '0 0 6px' }}>{sct.title}</h2>
                {sct.body.map((b, i) => <p key={i} style={{ margin: '0 0 6px', fontSize: 14, lineHeight: 1.6, color: C.bark }}>{b}</p>)}
              </div>
            ))}

            <h2 style={{ fontFamily: "'Crimson Pro'", fontSize: 19, fontWeight: 700, margin: '22px 0 8px' }}>Rate table (per person)</h2>
            <div style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 14, overflow: 'hidden' }}>
              {rates.map((r, i) => {
                const head = r.period !== period ? (period = r.period, true) : false;
                return (
                  <div key={i}>
                    {head && <div style={{ padding: '8px 14px', background: C.goldLight, fontSize: 12, fontWeight: 700, color: C.bark }}>{fmtPeriod(r.period)}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 14px', fontSize: 13.5, borderTop: head ? 'none' : `1px solid ${C.sand}` }}>
                      <span>{r.label}</span>
                      <span style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ color: C.barkLight }}>retail {baht(r.retail)}</span> · <strong>you pay {baht(r.partner)}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 24, background: C.white, border: `1.5px solid ${signed ? C.sage : C.gold}`, borderRadius: 16, padding: 18 }}>
              {signed ? (
                <>
                  <div style={{ fontFamily: "'Crimson Pro'", fontSize: 19, fontWeight: 700 }}>✓ Signed</div>
                  <p style={{ fontSize: 14, color: C.bark, margin: '6px 0 0', lineHeight: 1.6 }}>
                    Accepted by <strong>{info.signed_name}</strong> on behalf of {info.company_name}
                    {info.signed_at ? ` on ${new Date(info.signed_at).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' })} (Chiang Mai time)` : ''}.
                  </p>
                  {portalToken && (
                    <a href={`/agency/${portalToken}`} className="no-print" style={{ display: 'inline-block', marginTop: 14, background: C.sage, color: C.white, padding: '12px 20px', borderRadius: 999, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                      Open my partner page →
                    </a>
                  )}
                  <button type="button" className="no-print" onClick={() => window.print()} style={{ display: 'block', marginTop: 12, background: 'none', border: 'none', padding: 0, color: C.sageDark, textDecoration: 'underline', cursor: 'pointer', fontSize: 13 }}>
                    Print / save as PDF
                  </button>
                </>
              ) : (
                <div className="no-print">
                  <div style={{ fontFamily: "'Crimson Pro'", fontSize: 19, fontWeight: 700 }}>Accept the agreement</div>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 12, cursor: 'pointer', fontSize: 14, lineHeight: 1.5 }}>
                    <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1, accentColor: C.sage }} />
                    I have read this agreement and accept it on behalf of {info.company_name.replace(/\.$/, '')}.
                  </label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Type your full name"
                    style={{ width: '100%', marginTop: 12, padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.sand}`, fontSize: 15, fontFamily: "'DM Sans'", color: C.forest }} />
                  {err && <div style={{ marginTop: 10, background: C.coralLight, color: C.coral, padding: '10px 12px', borderRadius: 10, fontSize: 13 }}>{err}</div>}
                  <button type="button" onClick={sign} disabled={busy} style={{
                    marginTop: 14, width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                    background: busy ? C.sand : C.forest, color: C.white, fontWeight: 700, fontSize: 15, cursor: busy ? 'default' : 'pointer',
                  }}>{busy ? 'Signing…' : 'Sign agreement'}</button>
                  <p style={{ fontSize: 12, color: C.barkLight, margin: '10px 0 0', lineHeight: 1.5 }}>
                    Your name, the date/time and your IP address are recorded as your electronic signature. A copy is emailed to you.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
