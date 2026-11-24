'use client';

// ============================================================
// src/components/CreatorsPage.tsx
// ============================================================
// "Work with us" landing page for influencers / content creators.
// Rendered by /creators (English) and /creators/zh (Chinese); all
// text lives in src/lib/creators-content.ts. The form posts to
// /api/creators, which emails the application to the shop inbox.
// After approval the owner creates the partner and their code in
// admin → Partners, as today.
// Same palette and section styling as /trade.
// ============================================================

import { useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { PillButton } from '@/components/PillButton';
import { CREATORS_COPY, type CreatorsLang } from '@/lib/creators-content';

const C = {
  sage: '#6B8F71',
  sageDark: '#4A7050',
  sageLight: '#E7EFEA',
  forest: '#2D4639',
  parchment: '#F8F5EF',
  white: '#FFFFFF',
  gold: '#A89068',
  goldLight: '#F5F0E5',
  bark: '#5C4A3D',
  barkLight: '#8A7668',
  sand: '#E8E2D8',
  coral: '#C07A6E',
  coralLight: '#FCEAE6',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gold, marginBottom: 8 }}>
      {children}
    </div>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "'Crimson Pro', serif", fontSize: 26, fontWeight: 700, color: C.forest, marginBottom: 20 }}>{children}</h2>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.sage} strokeWidth="2.4" style={{ flexShrink: 0, marginTop: 2 }}>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      <span style={{ fontSize: 14, color: C.bark, lineHeight: 1.6 }}>{children}</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${C.sand}`,
  background: C.white, fontSize: 14, color: C.forest,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.bark, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

export default function CreatorsPage({ lang }: { lang: CreatorsLang }) {
  const t = CREATORS_COPY[lang];
  const [f, setF] = useState({ name: '', email: '', handle: '', followers: '', contact: '', dates: '', message: '', company: '' });
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [workshop, setWorkshop] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((prev) => ({ ...prev, [k]: e.target.value }));

  const togglePlatform = (p: string) =>
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim() || !EMAIL_RE.test(f.email.trim()) || !f.handle.trim() || !f.followers.trim()) {
      setStatus('error');
      setErrorMsg(t.f.errorRequired);
      return;
    }
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, platforms, workshop, lang }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('success');
    } catch {
      setStatus('error');
      setErrorMsg(t.f.errorGeneric);
    }
  }

  return (
    <div lang={t.htmlLang} style={{ background: C.parchment, minHeight: '100vh', fontFamily: "'DM Sans', 'PingFang SC', 'Microsoft YaHei', sans-serif" }}>
      {/* dangerouslySetInnerHTML, not a text child: the Google Fonts URL
          has `&` (same reason as /trade and the other pages). */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url(https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap);
            * { box-sizing: border-box; }
            a { text-decoration: none; }
            input, textarea { font-family: inherit; }
            input:focus, textarea:focus { outline: none; border-color: ${C.gold}; }
            .cr-hero { position: relative; padding: 64px 24px 52px; background: ${C.forest}; overflow: hidden; text-align: center; }
            .cr-section { max-width: 720px; margin: 0 auto; padding: 48px 24px 8px; }
            .cr-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-width: 720px; margin: -28px auto 0; padding: 0 24px; position: relative; }
            @media (min-width: 640px) { .cr-stats { grid-template-columns: repeat(4, 1fr); } }
            .cr-grid { display: grid; gap: 14px; }
            @media (min-width: 640px) { .cr-grid { grid-template-columns: 1fr 1fr; } }
            .cr-row { display: flex; gap: 12px; flex-wrap: wrap; }
            .cr-row > * { flex: 1; min-width: 220px; }
            .cr-chip { font-size: 12.5px; padding: 8px 14px; border-radius: 999px; border: 1.5px solid ${C.sand}; color: ${C.barkLight}; background: transparent; cursor: pointer; font-family: inherit; }
            .cr-chip.active { border-color: ${C.sage}; background: ${C.sageLight}; color: ${C.sageDark}; font-weight: 600; }
          `,
        }}
      />

      <SiteHeader />

      {/* ══════════ HERO ══════════ */}
      <div className="cr-hero">
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.14 }} viewBox="0 0 800 300" fill="none" stroke="#fff" strokeWidth="1" preserveAspectRatio="none">
          <path d="M-20 60 C120 20 240 100 400 40 C560 -20 680 80 820 20" />
          <path d="M-20 180 C140 130 260 220 420 160 C580 100 700 190 820 140" />
        </svg>
        <div style={{ position: 'relative', textAlign: 'right', maxWidth: 720, margin: '-36px auto 20px' }}>
          <Link href={t.switchHref} style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 999, padding: '6px 14px' }}>
            {t.switchLabel}
          </Link>
        </div>
        <div style={{ position: 'relative', fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.gold, marginBottom: 16 }}>
          {t.heroEyebrow}
        </div>
        <h1 style={{ position: 'relative', fontFamily: "'Crimson Pro', serif", fontSize: 'clamp(30px,5vw,44px)', fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 16, whiteSpace: 'pre-line' }}>
          {t.heroTitle}
        </h1>
        <p style={{ position: 'relative', fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.85)', maxWidth: 440, margin: '0 auto 30px' }}>
          {t.heroSub}
        </p>
        <PillButton href="#apply" variant="primary" size="lg" style={{ position: 'relative', background: C.gold, color: C.forest }}>
          {t.heroCta}
        </PillButton>
        <div style={{ height: 28 }} />
      </div>

      {/* ══════════ KEY NUMBERS ══════════ */}
      <div className="cr-stats">
        {t.stats.map((s) => (
          <div key={s.label} style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 16, padding: '16px 12px', textAlign: 'center', boxShadow: '0 8px 24px rgba(45,70,57,0.08)' }}>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 28, fontWeight: 700, color: C.sageDark, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: C.barkLight, marginTop: 6, lineHeight: 1.4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ══════════ WHAT YOU GET ══════════ */}
      <div className="cr-section">
        <Eyebrow>{t.offerEyebrow}</Eyebrow>
        <H2>{t.offerTitle}</H2>
        <div className="cr-grid">
          {t.benefits.map((b, i) => (
            <div key={b.title} style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 16, padding: 18, gridColumn: i === 0 ? '1 / -1' : undefined }}>
              <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 17, fontWeight: 600, color: C.forest, marginBottom: 4 }}>{b.title}</div>
              <div style={{ fontSize: 13.5, color: C.barkLight, lineHeight: 1.6 }}>{b.body}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════ WHO / WHAT WE ASK ══════════ */}
      <div className="cr-section">
        <div className="cr-grid">
          <div style={{ background: C.goldLight, borderRadius: 16, padding: 20 }}>
            <Eyebrow>{t.whoEyebrow}</Eyebrow>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 20, fontWeight: 700, color: C.forest, marginBottom: 12 }}>{t.whoTitle}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {t.whoItems.map((x) => <Check key={x}>{x}</Check>)}
            </div>
          </div>
          <div style={{ background: C.sageLight, borderRadius: 16, padding: 20 }}>
            <Eyebrow>{t.askEyebrow}</Eyebrow>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 20, fontWeight: 700, color: C.forest, marginBottom: 12 }}>{t.askTitle}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {t.askItems.map((x) => <Check key={x}>{x}</Check>)}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <div className="cr-section">
        <Eyebrow>{t.stepsEyebrow}</Eyebrow>
        <H2>{t.stepsTitle}</H2>
        <div>
          {t.steps.map((s, i) => {
            const last = i === t.steps.length - 1;
            return (
              <div key={s.title} style={{ display: 'flex', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.sage, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{i + 1}</div>
                  {!last && <div style={{ width: 2, flex: 1, background: C.sand, margin: '4px 0' }} />}
                </div>
                <div style={{ paddingBottom: last ? 0 : 24 }}>
                  <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 17, fontWeight: 600, color: C.forest, marginBottom: 3 }}>{s.title}</div>
                  <div style={{ fontSize: 13.5, color: C.barkLight, lineHeight: 1.6, maxWidth: 460 }}>{s.body}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════ PAYMENT ══════════ */}
      <div className="cr-section">
        <Eyebrow>{t.payEyebrow}</Eyebrow>
        <H2>{t.payTitle}</H2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: C.white, border: `1px solid ${C.sand}`, borderRadius: 16, padding: 20 }}>
          {t.payItems.map((x) => <Check key={x}>{x}</Check>)}
        </div>
      </div>

      {/* ══════════ APPLY FORM ══════════ */}
      <div className="cr-section" id="apply" style={{ paddingBottom: 64 }}>
        <Eyebrow>{t.formEyebrow}</Eyebrow>
        <H2>{t.formTitle}</H2>
        <p style={{ fontSize: 14, color: C.barkLight, lineHeight: 1.6, marginTop: -8, marginBottom: 20 }}>{t.formSub}</p>

        {status === 'success' ? (
          <div style={{ background: C.sageLight, borderRadius: 16, padding: 28, textAlign: 'center' }}>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 24, fontWeight: 700, color: C.forest }}>{t.f.successTitle}</div>
            <p style={{ fontSize: 14, color: C.bark, marginTop: 6 }}>{t.f.successBody}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, background: C.white, border: `1px solid ${C.sand}`, borderRadius: 18, padding: 22 }}>
            {/* Honeypot: hidden from people, bots fill it in. */}
            <input type="text" name="company" value={f.company} onChange={set('company')} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />

            <div className="cr-row">
              <Field label={t.f.name}><input style={inputStyle} value={f.name} onChange={set('name')} required maxLength={120} /></Field>
              <Field label={t.f.email}><input style={inputStyle} type="email" value={f.email} onChange={set('email')} required maxLength={200} /></Field>
            </div>

            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.bark, marginBottom: 8 }}>{t.f.platforms}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {t.platformOptions.map((p) => (
                  <button type="button" key={p} className={`cr-chip${platforms.includes(p) ? ' active' : ''}`} onClick={() => togglePlatform(p)}>{p}</button>
                ))}
              </div>
            </div>

            <div className="cr-row">
              <Field label={t.f.handle}><input style={inputStyle} value={f.handle} onChange={set('handle')} placeholder={t.f.handlePh} required maxLength={300} /></Field>
              <Field label={t.f.followers}><input style={inputStyle} value={f.followers} onChange={set('followers')} placeholder={t.f.followersPh} required maxLength={40} inputMode="numeric" /></Field>
            </div>

            <Field label={t.f.contact}><input style={inputStyle} value={f.contact} onChange={set('contact')} placeholder={t.f.contactPh} maxLength={120} /></Field>

            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.bark, marginBottom: 8 }}>{t.f.workshop}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {t.workshopOptions.map((w) => (
                  <button type="button" key={w} className={`cr-chip${workshop === w ? ' active' : ''}`} onClick={() => setWorkshop(workshop === w ? '' : w)}>{w}</button>
                ))}
              </div>
            </div>

            <Field label={t.f.dates}><input style={inputStyle} value={f.dates} onChange={set('dates')} placeholder={t.f.datesPh} maxLength={200} /></Field>

            <Field label={t.f.message}>
              <textarea style={{ ...inputStyle, minHeight: 96, resize: 'vertical' }} value={f.message} onChange={set('message')} placeholder={t.f.messagePh} maxLength={3000} />
            </Field>

            {status === 'error' && errorMsg && (
              <div style={{ background: C.coralLight, color: C.coral, borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>{errorMsg}</div>
            )}

            <button type="submit" disabled={status === 'submitting'} style={{ background: C.sage, color: '#fff', border: 0, borderRadius: 999, padding: '14px 22px', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: status === 'submitting' ? 0.7 : 1 }}>
              {status === 'submitting' ? t.f.sending : t.f.submit}
            </button>
          </form>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}
