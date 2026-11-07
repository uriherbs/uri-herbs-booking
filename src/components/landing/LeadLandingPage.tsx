'use client';

// ============================================================
// src/components/landing/LeadLandingPage.tsx
// ============================================================
// Template for every lead-collection landing page (one per workshop,
// owner request 2026-11-04). All copy comes from a LandingPageConfig
// in src/lib/landing-pages.ts — this file holds only layout + form.
//
// Built for a phone at an event: one column, big tap targets, the
// form near the top, and the gift (coupon + PDF) shown on screen the
// moment the form is sent, not only by email.
//
// No site header/nav on purpose — a landing page has one job. Logo
// links home; footer has the booking link, map and Instagram.
// ============================================================

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { REDNOTE, type LandingPageConfig } from '@/lib/landing-pages';
import { EMAIL_RE, suggestEmail } from '@/lib/email-typos';
import { C, FONT_DISPLAY, FONT_BODY, FONT_IMPORT } from '@/lib/theme';

const CONSENT_TEXT =
  'Send me the recipes and occasional news and offers from Uri Herbs Workshop. I can unsubscribe at any time.';
const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=Uri%20Herbs%20Workshop&query_place_id=ChIJxecF1bQ72jAREMxTp8PDykE';

type Status = 'idle' | 'sending' | 'done';

export default function LeadLandingPage({ config }: { config: LandingPageConfig }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [consent, setConsent] = useState(false);
  const [company, setCompany] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [sentTo, setSentTo] = useState('');
  const [confirmEmail, setConfirmEmail] = useState(false); // guest kept an address we flagged as a possible typo
  const typoHint = !confirmEmail ? suggestEmail(email.trim()) : null;

  // ?src=event-nov26&utm_source=... from the QR code / link.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const t: Record<string, string> = {};
      for (const k of ['src', 'utm_source', 'utm_medium', 'utm_campaign']) {
        const v = q.get(k);
        if (v) t[k] = v.slice(0, 80);
      }
      setTracking(t);
    } catch { /* ignore */ }
  }, []);

  const bookHref = `${config.bookUrl}?utm_source=landing&utm_medium=web&utm_campaign=${config.slug}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Please enter your name.');
    if (!EMAIL_RE.test(email.trim())) return setError('Please enter a valid email address.');
    if (!consent) return setError('Please tick the box so we can send you the recipes.');
    setStatus('sending');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landing: config.slug, name, email, phone, country, consent, consentText: CONSENT_TEXT, company, confirmEmail, ...tracking,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
      setSentTo(data.email || email.trim().toLowerCase());
      setStatus('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message);
      setStatus('idle');
    }
  }

  return (
    <main style={{ background: C.parchment, minHeight: '100vh', fontFamily: FONT_BODY, color: C.forest }}>
      <style>{`${FONT_IMPORT}
        .lp-wrap { max-width: 1040px; margin: 0 auto; padding: 0 18px; }
        .lp-grid { display: grid; gap: 22px; grid-template-columns: 1fr; grid-template-areas: 'text' 'form' 'img'; align-items: start; }
        .lp-text { grid-area: text; } .lp-form { grid-area: form; } .lp-img { grid-area: img; }
        @media (min-width: 900px) { .lp-grid { grid-template-columns: 1.05fr 1fr; grid-template-areas: 'text form' 'img form'; column-gap: 44px; row-gap: 18px; } .lp-hero-img { aspect-ratio: 4/5 !important; } }
        .lp-input { width: 100%; padding: 14px 14px; border-radius: 12px; border: 1.5px solid ${C.sand}; font-family: ${FONT_BODY}; font-size: 16px; color: ${C.forest}; background: #fff; outline: none; box-sizing: border-box; }
        .lp-input:focus { border-color: ${C.sage}; box-shadow: 0 0 0 3px ${C.sageLight}; }
        .lp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 16px 22px; border-radius: 999px; border: none; font-family: ${FONT_BODY}; font-size: 16px; font-weight: 700; cursor: pointer; text-decoration: none; box-sizing: border-box; }
        .lp-btn:focus-visible, .lp-input:focus-visible { outline: 3px solid ${C.gold}; outline-offset: 2px; }
      `}</style>

      {/* Logo bar */}
      <div className="lp-wrap" style={{ paddingTop: 18, paddingBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: C.forest }}>
          <img src="/uri-herbs-logo.jpg" alt="Uri Herbs Workshop" width={40} height={40} style={{ borderRadius: '50%' }} />
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700 }}>Uri Herbs Workshop</span>
        </Link>
      </div>

      <section className="lp-wrap" style={{ paddingTop: 14, paddingBottom: 36 }}>
        <div className="lp-grid">
          {/* Hero text (phone: first; desktop: top left) */}
          <div className="lp-text">
            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: C.sageDark, fontWeight: 600 }}>{config.eyebrow}</div>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(32px, 7vw, 48px)', lineHeight: 1.08, margin: '10px 0 12px', color: C.forest, textWrap: 'balance' as any }}>
              {config.title}
            </h1>
            <p style={{ fontSize: 16.5, lineHeight: 1.6, color: C.bark, margin: 0, maxWidth: 520 }}>{config.subtitle}</p>
          </div>

          {/* Photo (phone: after the form; desktop: under the text) */}
          <div className="lp-img">
            <img
              className="lp-hero-img"
              src={config.heroImage}
              alt={`${config.workshopName} at Uri Herbs Workshop`}
              style={{ width: '100%', aspectRatio: '16/10', objectFit: 'cover', borderRadius: 22, display: 'block' }}
            />
          </div>

          {/* Form or gift (phone: right after the headline; desktop: right column) */}
          <div className="lp-form" style={{ background: C.white, borderRadius: 22, padding: '24px 20px', boxShadow: '0 10px 30px rgba(45,70,57,0.08)', border: `1px solid ${C.sand}` }}>
            {(tracking.src || '').toLowerCase().startsWith('shop-cn') && <RedNoteBox />}
            {status === 'done' ? (
              <Gift
                config={config}
                bookHref={bookHref}
                firstName={name.trim().split(/\s+/)[0]}
                sentTo={sentTo}
                onFix={() => { setStatus('idle'); setConfirmEmail(false); setTimeout(() => document.getElementById('lp-email')?.focus(), 50); }}
              />
            ) : (
              <form onSubmit={submit} noValidate>
                <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, margin: '0 0 6px' }}>{config.giftTitle}</h2>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', display: 'grid', gap: 8 }}>
                  {config.giftPoints.map((p) => (
                    <li key={p} style={{ display: 'flex', gap: 10, fontSize: 15, lineHeight: 1.45, color: C.bark }}>
                      <span aria-hidden style={{ color: C.sage, fontWeight: 700 }}>✓</span>{p}
                    </li>
                  ))}
                </ul>

                <div style={{ display: 'grid', gap: 12 }}>
                  <Field label="Your name" id="lp-name">
                    <input id="lp-name" className="lp-input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                  <Field label="Email (we send the recipes here)" id="lp-email">
                    <input id="lp-email" className="lp-input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setConfirmEmail(false); }} />
                    {typoHint && (
                      <div style={{ fontSize: 13.5, marginTop: 6, color: C.bark }}>
                        Did you mean{' '}
                        <button type="button" onClick={() => setEmail(typoHint)} style={{ background: 'none', border: 'none', padding: 0, color: C.sageDark, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer', fontSize: 13.5 }}>{typoHint}</button>
                        ?{' '}
                        <button type="button" onClick={() => setConfirmEmail(true)} style={{ background: 'none', border: 'none', padding: 0, color: C.barkLight, textDecoration: 'underline', cursor: 'pointer', fontSize: 12.5 }}>No, mine is correct</button>
                      </div>
                    )}
                  </Field>
                  <Field label="WhatsApp (optional)" id="lp-phone">
                    <input id="lp-phone" className="lp-input" type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </Field>
                  <Field label="Country (optional)" id="lp-country">
                    <input id="lp-country" className="lp-input" autoComplete="country-name" value={country} onChange={(e) => setCountry(e.target.value)} />
                  </Field>
                  {/* Honeypot — hidden from people, bots fill it */}
                  <input type="text" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} aria-hidden style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} />

                  <label htmlFor="lp-consent" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.5, color: C.bark, cursor: 'pointer' }}>
                    <input id="lp-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1, accentColor: C.sageDark, flexShrink: 0 }} />
                    <span>{CONSENT_TEXT} <Link href="/privacy" style={{ color: C.sageDark }}>Privacy policy</Link></span>
                  </label>

                  {error && (
                    <div role="alert" style={{ background: '#FCEAE6', color: '#9A4F43', borderRadius: 10, padding: '10px 12px', fontSize: 14 }}>{error}</div>
                  )}

                  <button type="submit" className="lp-btn" disabled={status === 'sending'} style={{ background: C.sageDark, color: C.white, opacity: status === 'sending' ? 0.7 : 1 }}>
                    {status === 'sending' ? 'Sending…' : 'Send me the recipes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Recipe teaser */}
      <section style={{ background: C.white, borderTop: `1px solid ${C.sand}`, borderBottom: `1px solid ${C.sand}` }}>
        <div className="lp-wrap" style={{ paddingTop: 36, paddingBottom: 36 }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, margin: '0 0 18px' }}>Inside the recipe card</h2>
          <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
            {config.recipes.map((r, i) => (
              <li key={r.name} style={{ background: C.parchment, borderRadius: 16, padding: '16px 16px' }}>
                <div style={{ fontSize: 12, color: C.gold, fontWeight: 700, letterSpacing: 1 }}>RECIPE {i + 1}</div>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 700, margin: '4px 0 2px' }}>{r.name}</div>
                <div style={{ fontSize: 14, color: C.barkLight }}>{r.tagline}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Workshop pitch */}
      <section className="lp-wrap" style={{ paddingTop: 36, paddingBottom: 40 }}>
        <div style={{ background: C.sageLight, borderRadius: 22, padding: '24px 22px', display: 'grid', gap: 10 }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, margin: 0 }}>Blend your own tea with us in Chiang Mai</h2>
          <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.6, color: C.bark, maxWidth: 640 }}>
            In our 1-hour {config.workshopName} workshop you taste fresh Thai herbal tea, learn what each herb brings, and mix two
            bags of your own blend to take home. Small groups, hands-on, in the Old City.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
            <Link href={bookHref} className="lp-btn" style={{ background: C.forest, color: C.white, width: 'auto' }}>Book a workshop</Link>
            <Link href={config.workshopUrl} className="lp-btn" style={{ background: 'transparent', color: C.forest, border: `1.5px solid ${C.forest}`, width: 'auto' }}>About the workshop</Link>
          </div>
        </div>
      </section>

      <footer className="lp-wrap" style={{ paddingBottom: 36, fontSize: 13.5, color: C.barkLight, display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center' }}>
        <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" style={{ color: C.sageDark }}>Find us on Google Maps</a>
        <span aria-hidden>·</span>
        <a href="https://www.instagram.com/uriherbsworkshop" target="_blank" rel="noopener noreferrer" style={{ color: C.sageDark }}>@uriherbsworkshop</a>
        <span aria-hidden>·</span>
        <Link href="/" style={{ color: C.sageDark }}>uriherbs.com</Link>
      </footer>
    </main>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.bark, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function Gift({ config, bookHref, firstName, sentTo, onFix }: { config: LandingPageConfig; bookHref: string; firstName: string; sentTo: string; onFix: () => void }) {
  return (
    <div style={{ textAlign: 'center', display: 'grid', gap: 12 }}>
      <div style={{ fontSize: 34 }} aria-hidden>🌿</div>
      <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 28, margin: 0 }}>Thank you{firstName ? `, ${firstName}` : ''}!</h2>
      <p style={{ margin: 0, fontSize: 15.5, lineHeight: 1.55, color: C.bark }}>
        We sent your {config.recipes.length} tea recipes and your personal 10% code to
      </p>
      <div style={{ fontWeight: 700, fontSize: 16, color: C.forest, wordBreak: 'break-all' }}>{sentTo}</div>
      <button type="button" onClick={onFix} style={{ background: 'none', border: 'none', color: C.sageDark, textDecoration: 'underline', cursor: 'pointer', fontSize: 14 }}>
        Not your email? Fix it
      </button>
      <div style={{ background: C.sageLight, borderRadius: 16, padding: '14px 14px', fontSize: 14, color: C.bark, lineHeight: 1.5 }}>
        It arrives within a minute. Can't see it? Check the <strong>Promotions</strong> or <strong>Spam</strong> folder.
      </div>
      <Link href={bookHref} className="lp-btn" style={{ background: C.forest, color: C.white }}>See our workshops</Link>
    </div>
  );
}

/** Chinese guests in the shop (?src=shop-cn): share on RedNote, tag us, get a small gift. */
function RedNoteBox() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(REDNOTE.id); setCopied(true); } catch { /* ignore */ }
  };
  return (
    <div lang="zh-CN" style={{ background: '#FFF4F4', border: '1px solid #F3C9C9', borderRadius: 16, padding: '16px 16px', marginBottom: 18, color: C.bark, fontSize: 15, lineHeight: 1.6 }}>
      <div style={{ fontWeight: 700, fontSize: 17, color: '#C0392B', marginBottom: 6 }}>🎁 小红书分享礼</div>
      <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 4 }}>
        <li>在小红书发一篇笔记，分享你今天的手作体验（照片或视频都可以）</li>
        <li>标记 <strong>@{REDNOTE.name}</strong></li>
        <li>把笔记给我们的工作人员看，即可领取一份小礼物 🌿</li>
      </ol>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
        <span>小红书号：<strong>{REDNOTE.id}</strong></span>
        <button type="button" onClick={copy} style={{ border: '1px solid #C0392B', background: C.white, color: '#C0392B', borderRadius: 999, padding: '4px 12px', fontSize: 13, cursor: 'pointer' }}>
          {copied ? '已复制 ✓' : '复制'}
        </button>
      </div>
      <div style={{ marginTop: 10, fontSize: 14 }}>下面留下邮箱，我们会把 5 款泰式草本茶配方和一张送给朋友的 9 折优惠码发给你。</div>
    </div>
  );
}
