'use client';

// ============================================================
// src/app/trade/page.tsx
// ============================================================
// "Trade & Groups" — B2B landing page for travel agencies and
// tour guides who organize groups. Built from the design canvas
// draft (Aug 2026) after the owner confirmed the direction and
// supplied a real signed-style partnership contract with actual
// numbers (see the Claude project doc
// b2b-agency-partner-rates-2026-08-22.md for the source data).
//
// Scope, per the owner's explicit instructions: this is the
// funnel/landing page + lead form only. Two things are
// deliberately NOT built here yet:
//   1. Live self-serve calendar/scheduling for group bookings
//      (separate hours pool from B2C) — owner said this is a
//      later phase.
//   2. A real AI chat-automation backend with human escalation —
//      the owner wants this eventually, but there's no bot to
//      wire up yet. The "chat" section below is honest about
//      that: it shows an illustrative sample conversation (marked
//      as such) plus two REAL, working buttons — WhatsApp and
//      LINE — which is literally today's actual process (owner
//      described agencies reaching them via LINE/social chat).
//      When an AI concierge exists, swap the illustrative preview
//      for the real embedded chat widget; nothing else here needs
//      to change.
//
// The lead form at the bottom IS fully real — it posts to
// /api/trade, which emails the inquiry to Mali same as /contact.
// ============================================================

import { useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { PillButton } from '@/components/PillButton';

// Same palette as the rest of the site (Contact page redesign,
// homepage) — see src/lib/theme.ts's own comment on why pages
// still redeclare this locally rather than all importing one
// shared object.
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

// Same number FloatingWhatsApp.tsx falls back to when the env var
// isn't set, and the same LINE account linked from /contact.
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '66643349890';
const WHATSAPP_PREFILL = encodeURIComponent(
  "Hi! I'm with a travel agency / tour group and I'd like to ask about bringing a group to Uri Herbs Workshop."
);
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_PREFILL}`;
const LINE_LINK = 'https://line.me/R/ti/p/@458fguvz';
const TRADE_VIDEO_URL = process.env.NEXT_PUBLIC_TRADE_VIDEO_URL || '';


// ────────────────────────────────────────────────────────────
// Small shared bits
// ────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.gold, marginBottom: 8 }}>
      {children}
    </div>
  );
}

function BenefitCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: C.white, border: `1px solid ${C.sand}`, borderRadius: 16, padding: 18 }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: C.sageLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: "'Crimson Pro'", fontSize: 16, fontWeight: 600, color: C.forest }}>{title}</div>
        <div style={{ fontSize: 13.5, color: C.barkLight, lineHeight: 1.55, marginTop: 3 }}>{children}</div>
      </div>
    </div>
  );
}

function Step({ n, title, children, last = false }: { n: number; title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: C.sage, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Crimson Pro'", fontWeight: 700, fontSize: 14.5, flexShrink: 0 }}>
          {n}
        </div>
        {!last && <div style={{ width: 2, flex: 1, background: C.sand, margin: '4px 0' }} />}
      </div>
      <div style={{ paddingBottom: last ? 0 : 28 }}>
        <div style={{ fontFamily: "'Crimson Pro'", fontSize: 17, fontWeight: 600, color: C.forest, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13.5, color: C.barkLight, lineHeight: 1.6, maxWidth: 460 }}>{children}</div>
      </div>
    </div>
  );
}

function RateRow({ label, retail, partner }: { label: string; retail: string; partner: string }) {
  return (
    <div style={{ display: 'flex', padding: '12px 16px', borderTop: `1px solid ${C.sand}` }}>
      <div style={{ flex: 1.4, fontSize: 13.5, color: C.forest }}>{label}</div>
      <div style={{ flex: 1, fontSize: 13.5, color: C.barkLight, textAlign: 'right' }}>{retail}</div>
      <div style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: C.forest, textAlign: 'right' }}>{partner}</div>
    </div>
  );
}

function TermBullet({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
      <span style={{ color: C.gold, fontWeight: 700, fontSize: 14, lineHeight: 1.5 }}>&bull;</span>
      <span style={{ fontSize: 13, color: C.bark, lineHeight: 1.55 }}>{children}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────

export default function TradePage() {
  // Partner application (owner flow 2026-10-01): saved for admin approval,
  // then the agency signs the agreement online and gets its partner page.
  const [f, setF] = useState({
    company_name: '', contact_name: '', email: '', phone: '', country: '', website: '',
    license_no: '', business_type: '', monthly_groups: '', message: '', website_hp: '',
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginSent, setLoginSent] = useState(false);

  const canSubmit = f.company_name.trim() && EMAIL_RE.test(f.email.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || status === 'submitting') return;
    setStatus('submitting');
    setErrorMsg('');
    try {
      const res = await fetch('/api/agency/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }
      setStatus('success');
    } catch {
      setErrorMsg("Couldn't reach the server. Please check your connection and try again.");
      setStatus('error');
    }
  };

  const sendLoginLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(loginEmail.trim())) return;
    await fetch('/api/agency/login-link', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: loginEmail }),
    }).catch(() => {});
    setLoginSent(true);
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.sand}`, background: C.white, fontSize: 14, color: C.forest };

  return (
    <div style={{ background: C.parchment, minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      {/* dangerouslySetInnerHTML, not a text child — see theme.ts /
          other pages' identical comment: the Google Fonts URL has
          `&`, and <style> is a raw-text element that never gets
          entity-decoded, so an escaped child would mismatch
          hydration and break the page. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url(https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap);
            * { box-sizing: border-box; }
            a { text-decoration: none; }
            input, textarea { font-family: 'DM Sans', sans-serif; }
            input:focus, textarea:focus { outline: none; border-color: ${C.gold}; }

            .trade-hero { position: relative; padding: 72px 24px 56px; background: ${C.forest}; overflow: hidden; text-align: center; }
            .trade-section { max-width: 720px; margin: 0 auto; padding: 48px 24px 8px; }
            .trade-benefit-grid { display: grid; gap: 14px; }
            @media (min-width: 640px) { .trade-benefit-grid { grid-template-columns: 1fr 1fr; } }
            .trade-form-grid { display: flex; flex-direction: column; gap: 14px; }
            .trade-form-row { display: flex; gap: 12px; flex-wrap: wrap; }
            .trade-form-row > * { flex: 1; min-width: 220px; }
            .trade-chip { font-size: 12.5px; padding: 8px 14px; border-radius: 999px; border: 1.5px solid ${C.sand}; color: ${C.barkLight}; background: transparent; cursor: pointer; font-family: 'DM Sans'; }
            .trade-chip.active { border-color: ${C.sage}; background: ${C.sageLight}; color: ${C.sageDark}; font-weight: 600; }
          `,
        }}
      />

      <SiteHeader />

      {/* ══════════ HERO ══════════ */}
      <div className="trade-hero">
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.14 }} viewBox="0 0 800 300" fill="none" stroke="#fff" strokeWidth="1" preserveAspectRatio="none">
          <path d="M-20 60 C120 20 240 100 400 40 C560 -20 680 80 820 20" />
          <path d="M-20 180 C140 130 260 220 420 160 C580 100 700 190 820 140" />
        </svg>
        <div style={{ position: 'relative', fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.gold, marginBottom: 16 }}>
          For Travel Agencies &amp; Tour Guides
        </div>
        <h1 style={{ position: 'relative', fontFamily: "'Crimson Pro'", fontSize: 'clamp(30px,5vw,44px)', fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 16 }}>
          Bring Your Groups to<br />Uri Herbs Workshop
        </h1>
        <p style={{ position: 'relative', fontFamily: "'DM Sans'", fontSize: 15, lineHeight: 1.65, color: 'rgba(255,255,255,0.82)', maxWidth: 420, margin: '0 auto 30px' }}>
          Hands-on Thai herbal experiences in Chiang Mai&rsquo;s Old City — built for groups, priced for agencies.
        </p>
        <PillButton href="#apply" variant="primary" size="lg" style={{ position: 'relative', background: C.gold, color: C.forest }}>
          Apply for an Agency Account &rarr;
        </PillButton>
      </div>

      {/* ══════════ VIDEO (optional) ══════════
          Short explainer for agencies. Set NEXT_PUBLIC_TRADE_VIDEO_URL in
          Vercel to a YouTube/Vimeo *embed* URL (e.g.
          https://www.youtube.com/embed/VIDEO_ID) and redeploy — the
          section stays hidden until then. */}
      {TRADE_VIDEO_URL && (
        <div className="trade-section">
          <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 18, overflow: 'hidden', background: C.forest, boxShadow: '0 10px 30px rgba(45,70,57,0.12)' }}>
            <iframe src={TRADE_VIDEO_URL} title="Uri Herbs Workshop for travel agencies" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
          </div>
        </div>
      )}

      {/* ══════════ WHAT YOU GET ══════════ */}
      <div className="trade-section">
        <Eyebrow>Work With Us</Eyebrow>
        <h2 style={{ fontFamily: "'Crimson Pro'", fontSize: 26, fontWeight: 700, color: C.forest, marginBottom: 22 }}>What You Get</h2>
        <div className="trade-benefit-grid">
          <BenefitCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.sageDark} strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>}
            title="20% agency commission"
          >
            Built into every rate, on every workshop — see the full agency rate card below.
          </BenefitCard>
          <BenefitCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.sageDark} strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
            title="Flexible group scheduling"
          >
            Private sessions for your whole group, coordinated around your itinerary.
          </BenefitCard>
          <BenefitCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.sageDark} strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>}
            title="One host, start to finish"
          >
            Every group gets a dedicated instructor for the whole session — no mixing with drop-in guests.
          </BenefitCard>
          <BenefitCard
            icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.sageDark} strokeWidth="2"><path d="M8 4v4M16 4v4M4 10h16M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" /></svg>}
            title="A proper group agreement"
          >
            Once details are confirmed, we send a written agreement for your records — not just a chat thread.
          </BenefitCard>
        </div>
      </div>

      {/* ══════════ PARTNER RATE CARD ══════════ */}
      <div className="trade-section">
        <Eyebrow>2026 &amp; 2027 Rates</Eyebrow>
        <h2 style={{ fontFamily: "'Crimson Pro'", fontSize: 26, fontWeight: 700, color: C.forest, marginBottom: 12 }}>Agency Rate Card</h2>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: C.sageLight, borderRadius: 14, padding: '14px 16px', marginBottom: 18 }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.sageDark} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10" /><path d="M12 16v-5M12 8h.01" /></svg>
          <span style={{ fontSize: 13, color: C.forest, lineHeight: 1.6 }}>
            <strong>How it works:</strong> you pay us the <strong>You Pay</strong> column below. Charge your client the <strong>Retail</strong> price (or your own) — the gap is your <strong>20% commission</strong>, yours to keep.
          </span>
        </div>

        <div style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ display: 'flex', background: C.sageLight, padding: '11px 16px' }}>
            <div style={{ flex: 1.4, fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: C.sageDark }}>Duration</div>
            <div style={{ flex: 1, fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: C.sageDark, textAlign: 'right' }}>Retail</div>
            <div style={{ flex: 1, fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: C.sageDark, textAlign: 'right' }}>You Pay</div>
          </div>
          <div style={{ padding: '8px 16px', background: C.goldLight, fontSize: 11.5, fontWeight: 700, color: C.bark, letterSpacing: '0.04em' }}>WORKSHOPS UNTIL DEC 31, 2026</div>
          <RateRow label="1 Hour" retail="฿920" partner="฿736" />
          <RateRow label="2 Hours" retail="฿1,670" partner="฿1,336" />
          <RateRow label="3 Hours" retail="฿2,320" partner="฿1,856" />
          <RateRow label="Aromatherapy & Skincare (2h)" retail="฿2,700" partner="฿2,160" />
          {/* 2027 price list — owner decision 2026-10-01 (+25%), same as
              package_prices in the database. Partner = retail − 20%. */}
          <div style={{ padding: '8px 16px', background: C.goldLight, fontSize: 11.5, fontWeight: 700, color: C.bark, letterSpacing: '0.04em' }}>WORKSHOPS FROM JAN 1, 2027</div>
          <RateRow label="1 Hour" retail="฿1,150" partner="฿920" />
          <RateRow label="2 Hours" retail="฿2,090" partner="฿1,672" />
          <RateRow label="3 Hours" retail="฿2,900" partner="฿2,320" />
          <RateRow label="Aromatherapy & Skincare (2h)" retail="฿3,380" partner="฿2,704" />
        </div>
        <p style={{ fontSize: 12, color: C.barkLight, lineHeight: 1.6, margin: '10px 2px 0' }}>
          Per participant, inclusive of materials, instruction, welcome drink &amp; the final handcrafted product. The rate is set by the date of the workshop.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20, background: C.goldLight, borderRadius: 14, padding: 18 }}>
          <TermBullet><strong>20% commission</strong> is baked into every rate above — no separate invoice, no extra step</TermBullet>
          <TermBullet>100% payment confirms the booking, due 14 days before your session</TermBullet>
          <TermBullet>Free cancellation 7+ days out &middot; 30% fee within 3 days &middot; no refund same-day</TermBullet>
          <TermBullet>Groups up to 12 &middot; small groups of 1&ndash;4 book as a guaranteed private session at a flat 4-ticket rate</TermBullet>
        </div>
      </div>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <div className="trade-section">
        <Eyebrow>The Process</Eyebrow>
        <h2 style={{ fontFamily: "'Crimson Pro'", fontSize: 26, fontWeight: 700, color: C.forest, marginBottom: 22 }}>How It Works</h2>
        <div>
          <Step n={1} title="Apply in two minutes">
            Fill in the agency application below — company details, the kind of groups you bring.
          </Step>
          <Step n={2} title="Sign your agreement online">
            Once we approve, you get your agency agreement by email — read it, tick, type your name. Done.
          </Step>
          <Step n={3} title="Book on your agency page">
            Your own page with live availability: pick the workshop, date and guests and see your agency price instantly.
          </Step>
          <Step n={4} title="Pay 14 days before" last>
            Pay online or by bank transfer (upload the slip). We remind you 18 days before and on the due date.
          </Step>
        </div>
      </div>

      {/* ══════════ CHAT ══════════ */}
      <div className="trade-section" id="quote">
        <Eyebrow>Talk To Us</Eyebrow>
        <h2 style={{ fontFamily: "'Crimson Pro'", fontSize: 26, fontWeight: 700, color: C.forest, marginBottom: 8 }}>Start With a Quick Chat</h2>
        <p style={{ fontSize: 14, color: C.barkLight, lineHeight: 1.6, marginBottom: 22 }}>
          Message us directly on WhatsApp or LINE — a real person answers, today. (We&rsquo;re building an always-on assistant for instant quotes; here&rsquo;s a preview of where that&rsquo;s headed.)
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 9, background: C.white, border: `1px solid ${C.sand}`, borderRadius: 999, padding: '12px 20px', fontSize: 13.5, fontWeight: 700, color: C.forest }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.2"><path d="M20 12.5c0 4.4-4.5 8-8 8-1.1 0-2.2-.2-3.2-.6L5 21l1.2-3.6C5.4 16.2 4 14.5 4 12.5c0-4.4 4.5-8 8-8s8 3.6 8 8z" /></svg>
            Chat on WhatsApp
          </a>
          <a href={LINE_LINK} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 9, background: C.white, border: `1px solid ${C.sand}`, borderRadius: 999, padding: '12px 20px', fontSize: 13.5, fontWeight: 700, color: C.forest }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#06C755"><path d="M12 3.5C6.75 3.5 2.5 6.9 2.5 11.1c0 3.77 3.38 6.93 7.93 7.53l.9 2.87 2.6-2.6c5.02-.4 8.57-3.7 8.57-7.8 0-4.2-4.25-7.6-9.65-7.6z" /></svg>
            Chat on LINE
          </a>
        </div>

        <div style={{ position: 'relative', background: C.white, border: `1px solid ${C.sand}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 10px 30px rgba(45,70,57,0.08)', maxWidth: 400 }}>
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(45,70,57,0.85)', color: '#fff', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: 999, padding: '4px 10px', zIndex: 2 }}>
            Preview &middot; Coming Soon
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: C.forest }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.gold, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Crimson Pro'", fontWeight: 700, color: C.forest, fontSize: 13 }}>UH</div>
            <div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, color: '#fff' }}>Uri Herbs Agency Assistant</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#8FD19E' }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Illustrative example</span>
              </div>
            </div>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, background: C.parchment }}>
            <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: C.white, border: `1px solid ${C.sand}`, borderRadius: '14px 14px 14px 3px', padding: '10px 13px', fontSize: 13, color: C.forest, lineHeight: 1.5 }}>
              Hi! Happy to help plan your group visit 🌿 How many guests, and roughly which dates?
            </div>
            <div style={{ alignSelf: 'flex-end', maxWidth: '85%', background: C.sage, borderRadius: '14px 14px 3px 14px', padding: '10px 13px', fontSize: 13, color: '#fff', lineHeight: 1.5 }}>
              14 guests, mid-October, interested in Tea Blending + Massage Ball
            </div>
            <div style={{ alignSelf: 'flex-start', maxWidth: '85%', background: C.white, border: `1px solid ${C.sand}`, borderRadius: '14px 14px 14px 3px', padding: '10px 13px', fontSize: 13, color: C.forest, lineHeight: 1.5 }}>
              Tea + Massage Ball is our 2-hour combo — at your agency rate that&rsquo;s ฿1,336/person. Want me to hold mid-October dates for 14?
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '12px 14px', borderTop: `1px solid ${C.sand}` }}>
            <input type="text" disabled placeholder="AI concierge coming soon — chat above for now" style={{ width: '100%', borderRadius: 999, border: `1px solid ${C.sand}`, background: C.parchment, padding: '10px 14px', fontSize: 13, color: C.barkLight }} />
          </div>
        </div>
      </div>

      {/* ══════════ PARTNER APPLICATION ══════════ */}
      <div className="trade-section" id="apply">
        <Eyebrow>Apply for an Agency Account</Eyebrow>
        <h2 style={{ fontFamily: "'Crimson Pro'", fontSize: 26, fontWeight: 700, color: C.forest, marginBottom: 8 }}>Agency Application</h2>
        <p style={{ fontSize: 14, color: C.barkLight, lineHeight: 1.6, marginBottom: 22 }}>
          For travel agencies, tour guides, hotels and group leaders. We reply within 1–2 working days.
        </p>

        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '32px 8px', background: C.white, border: `1px solid ${C.sand}`, borderRadius: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🌿</div>
            <h3 style={{ fontFamily: "'Crimson Pro'", fontSize: 21, fontWeight: 700, color: C.forest, margin: '0 0 8px' }}>Application received!</h3>
            <p style={{ fontSize: 14, color: C.bark, lineHeight: 1.6, margin: 0 }}>
              Thank you — we sent a confirmation to your email. Once approved, you&rsquo;ll receive your agency agreement to sign online.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="trade-form-grid">
            {status === 'error' && (
              <div style={{ background: C.coralLight, color: C.coral, borderRadius: 10, padding: '12px 14px', fontSize: 13, lineHeight: 1.5 }}>{errorMsg}</div>
            )}
            {/* Honeypot — visually hidden */}
            <input type="text" value={f.website_hp} onChange={(e) => set('website_hp', e.target.value)} autoComplete="off" tabIndex={-1} aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />

            <input type="text" value={f.company_name} onChange={(e) => set('company_name', e.target.value)} required placeholder="Company / business name *" style={inputStyle} />
            <div className="trade-form-row">
              <input type="text" value={f.contact_name} onChange={(e) => set('contact_name', e.target.value)} placeholder="Contact person" style={inputStyle} />
              <input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} required placeholder="Email *" style={inputStyle} />
            </div>
            <div className="trade-form-row">
              <input type="text" value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="WhatsApp / LINE / phone" style={inputStyle} />
              <input type="text" value={f.country} onChange={(e) => set('country', e.target.value)} placeholder="Country" style={inputStyle} />
            </div>
            <div className="trade-form-row">
              <input type="text" value={f.website} onChange={(e) => set('website', e.target.value)} placeholder="Website or Instagram" style={inputStyle} />
              <input type="text" value={f.license_no} onChange={(e) => set('license_no', e.target.value)} placeholder="TAT / business licence no. (optional)" style={inputStyle} />
            </div>

            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.forest, marginBottom: 9 }}>You are a…</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['Travel agency', 'Tour guide', 'Hotel / hostel', 'School / group leader', 'Other'].map((w) => (
                  <button key={w} type="button" onClick={() => set('business_type', f.business_type === w ? '' : w)}
                    className={`trade-chip${f.business_type === w ? ' active' : ''}`}>{w}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: C.forest, marginBottom: 9 }}>Groups per month (roughly)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['1–2', '3–5', '6–10', '10+', 'Seasonal'].map((w) => (
                  <button key={w} type="button" onClick={() => set('monthly_groups', f.monthly_groups === w ? '' : w)}
                    className={`trade-chip${f.monthly_groups === w ? ' active' : ''}`}>{w}</button>
                ))}
              </div>
            </div>

            <textarea value={f.message} onChange={(e) => set('message', e.target.value)} rows={4}
              placeholder="Anything else? (typical group size, languages, workshops of interest…)"
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />

            <button type="submit" disabled={!canSubmit || status === 'submitting'} style={{
              width: '100%', padding: '15px', borderRadius: 12, border: 'none',
              background: canSubmit && status !== 'submitting' ? C.forest : C.sand,
              color: canSubmit && status !== 'submitting' ? C.parchment : C.barkLight,
              fontFamily: "'DM Sans'", fontSize: 14.5, fontWeight: 700,
              cursor: canSubmit && status !== 'submitting' ? 'pointer' : 'default',
            }}>
              {status === 'submitting' ? 'Sending…' : 'Send application'}
            </button>
          </form>
        )}

        {/* Existing partners: re-send the partner-page link */}
        <div style={{ marginTop: 22, background: C.white, border: `1px solid ${C.sand}`, borderRadius: 16, padding: '16px 18px' }}>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 17, fontWeight: 700, color: C.forest }}>Already have an agency account?</div>
          {loginSent ? (
            <p style={{ fontSize: 13.5, color: C.bark, margin: '6px 0 0' }}>If that email belongs to an active agency, your agency-page link is on its way.</p>
          ) : (
            <form onSubmit={sendLoginLink} style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Your agency email"
                style={{ ...inputStyle, flex: 1, minWidth: 200 }} />
              <button type="submit" style={{ padding: '12px 18px', borderRadius: 12, border: 'none', background: C.sage, color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
                Get my agency link
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ══════════ TRUST STRIP ══════════ */}
      <div style={{ marginTop: 48, padding: '32px 24px 56px', background: C.sageLight, textAlign: 'center' }}>
        <div style={{ fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 600, color: C.forest, marginBottom: 12 }}>Prefer to message us directly?</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: `1px solid ${C.sand}`, borderRadius: 999, padding: '10px 16px', fontSize: 12.5, fontWeight: 700, color: C.forest }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.2"><path d="M20 12.5c0 4.4-4.5 8-8 8-1.1 0-2.2-.2-3.2-.6L5 21l1.2-3.6C5.4 16.2 4 14.5 4 12.5c0-4.4 4.5-8 8-8s8 3.6 8 8z" /></svg>
            WhatsApp
          </a>
          <a href={LINE_LINK} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: `1px solid ${C.sand}`, borderRadius: 999, padding: '10px 16px', fontSize: 12.5, fontWeight: 700, color: C.forest }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#06C755"><path d="M12 3.5C6.75 3.5 2.5 6.9 2.5 11.1c0 3.77 3.38 6.93 7.93 7.53.31.07.73.2.84.47.1.24.06.62.03.87l-.14.83c-.04.24-.19.96.84.53 1.03-.44 5.56-3.28 7.58-5.61 1.4-1.53 2.07-3.08 2.07-4.62 0-4.2-4.25-7.6-9.65-7.6z" /></svg>
            LINE
          </a>
        </div>
        <div style={{ fontSize: 12.5, color: C.barkLight, lineHeight: 1.7 }}>
          Uri Herbs Workshop &middot; 44, 3 Si Phum Soi 9, Chiang Mai Old City<br />
          uherbhouse@gmail.com &middot; +66 64 334 9890
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
