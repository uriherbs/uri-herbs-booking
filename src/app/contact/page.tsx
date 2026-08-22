'use client';

import { useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

// ══════════════════════════════════════════════════════════════════
// DESIGN TOKENS — same palette as the rest of the site
// ══════════════════════════════════════════════════════════════════
// Redesign (Aug 2026): "Split-Screen Spa" direction, picked from 3
// options drafted on a design canvas. Full-bleed map moment up top
// (was a plain 2-col info+map / form grid before) with a floating
// card for info + form. Same real data, icons and form logic as
// before — layout only.

const C = {
  sage: '#6B8F71',
  sageDark: '#4A7050',
  sageLight: '#E7EFEA',
  forest: '#2D4639',
  parchment: '#F8F5EF',
  white: '#FFFFFF',
  gold: '#A89068',
  bark: '#5C4A3D',
  barkLight: '#8A7668',
  sand: '#E8E2D8',
  coral: '#C07A6E',
  coralLight: '#FCEAE6',
};

const SHOP_ADDRESS = '44, 3 Si Phum Soi 9, Tambon Si Phum, Mueang, Chiang Mai 50200';
const SHOP_PHONE_DISPLAY = '+66 64 334 9890';
const SHOP_PHONE_TEL = '+66643349890';
const SHOP_EMAIL = 'uherbhouse@gmail.com';
const SHOP_HOURS = 'Mon – Sat · 09:00 – 17:00';

// Verified directly against Google Maps (place: "Uri Herbs Workshop").
// Geocoding the free-text address above used to send the pin to a
// neighboring business (The Moon Eatery / SALT & FIRE Rooftop Bar)
// instead of the actual location.
//
// Owner reported the embedded map "doesn't look right" — the old
// coordinate-only embed (`q=lat,lng&output=embed`) just centers the
// map on that point with no marker, so it renders as a plain street
// map with nearby cafés/restaurants labeled but nothing marking the
// workshop itself. That's what actually looked broken, not the
// coordinates (those were already correct).
//
// Fix: this is the CID-based `pb=` URL Google's own "Share → Embed a
// map" dialog generates for a specific place — it's the same key-less
// embed product as the coordinate shorthand (no Maps Embed API key
// needed), it just also renders the place's actual pin/marker instead
// of an unmarked map. The CID (4740816802854194192) is the same place
// (Uri Herbs Workshop) as the Place ID used below for SHOP_MAPS_URL,
// just decimal instead of hex — `0x41cac3c3a753cc10` (the part after
// the colon in SHOP_PLACE_ID) converts to this same number.
const MAPS_EMBED_SRC = 'https://www.google.com/maps/embed?pb=!1m3!3m2!1m1!4s4740816802854194192!3m1!1sen!5m1!1sen';
// "Open in Maps" link, built via Google's documented Maps URLs API
// (developers.google.com/maps/documentation/urls/get-started#search-action)
// rather than the user's verified short link, since a short link
// can't be given a language param after its redirect. `query` is the
// exact, distinctively-named business — reliable on its own even if
// query_place_id (Google's internal CID format, 0x…:0x…, not the
// ChIJ… Place ID this parameter is documented for) ends up ignored.
const SHOP_PLACE_ID = '0x30da3bb4d505e7c5:0x41cac3c3a753cc10';
const SHOP_MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Uri Herbs Workshop')}&query_place_id=${SHOP_PLACE_ID}&hl=en`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ══════════════════════════════════════════════════════════════════
// ICONS
// ══════════════════════════════════════════════════════════════════

const PinSVG = ({ size = 18, color = C.sage }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const ClockSVG = ({ size = 18, color = C.sage }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
);

const PhoneSVG = ({ size = 18, color = C.sage }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.338 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);

const MailSVG = ({ size = 18, color = C.sage }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
  </svg>
);

// Social icons — kept as the same monochrome line-icon style as the
// icons above (stroke/fill in C.sage) rather than each brand's own
// multi-color mark, to match the rest of the site.

const InstagramSVG = ({ size = 18, color = C.sage }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
    <circle cx="12" cy="12" r="4.3" />
    <circle cx="17.6" cy="6.4" r="0.9" fill={color} stroke="none" />
  </svg>
);

const FacebookSVG = ({ size = 18, color = C.sage }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.9 3.77-3.9 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34v7.03C18.34 21.24 22 17.08 22 12.06z" />
  </svg>
);

const TikTokSVG = ({ size = 18, color = C.sage }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M16.6 3h-3.1v12.6a2.7 2.7 0 11-2.35-2.68v-3.15a5.85 5.85 0 105.1 5.8V9.34a8.2 8.2 0 004.75 1.5V7.7a5 5 0 01-4.4-4.7z" />
  </svg>
);

const LineSVG = ({ size = 18, color = C.sage }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 3.5C6.75 3.5 2.5 6.9 2.5 11.1c0 3.77 3.38 6.93 7.93 7.53.31.07.73.2.84.47.1.24.06.62.03.87l-.14.83c-.04.24-.19.96.84.53 1.03-.44 5.56-3.28 7.58-5.61 1.4-1.53 2.07-3.08 2.07-4.62 0-4.2-4.25-7.6-9.65-7.6zm-4.86 9.6H5.6a.4.4 0 01-.4-.4V8.6a.4.4 0 11.8 0v3.7h1.14a.4.4 0 010 .8zm2.06 0a.4.4 0 01-.4-.4V8.6a.4.4 0 11.8 0v4.1a.4.4 0 01-.4.4zm4.86 0a.4.4 0 01-.32-.16l-2.06-2.8v2.56a.4.4 0 11-.8 0V8.6a.4.4 0 01.73-.24l2.05 2.79V8.6a.4.4 0 11.8 0v4.1a.4.4 0 01-.4.4zm3.1 0h-1.87a.4.4 0 01-.4-.4V8.6a.4.4 0 01.4-.4h1.87a.4.4 0 110 .8h-1.47v.94h1.34a.4.4 0 110 .8h-1.34v.96h1.47a.4.4 0 110 .8z" />
  </svg>
);

// Same accounts linked from the footer of the existing uriherbs.com site.
const SOCIAL_LINKS = [
  { name: 'Instagram', href: 'https://www.instagram.com/uriherbsworkshop', Icon: InstagramSVG },
  { name: 'Facebook', href: 'https://www.facebook.com/uriherbworkshop', Icon: FacebookSVG },
  { name: 'LINE', href: 'https://line.me/R/ti/p/@458fguvz', Icon: LineSVG },
  { name: 'TikTok', href: 'https://www.tiktok.com/@uriherbsworkshop', Icon: TikTokSVG },
];

// ══════════════════════════════════════════════════════════════════
// INFO ROW (inside the floating card)
// ══════════════════════════════════════════════════════════════════

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ marginTop: 2, flexShrink: 0 }}>{icon}</div>
      <div style={{ fontFamily: "'DM Sans'", fontSize: 14.5, color: C.forest, lineHeight: 1.55 }}>{children}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [company, setCompany] = useState(''); // honeypot — always left empty by real visitors
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const canSubmit = name.trim() && EMAIL_RE.test(email.trim()) && message.trim().length >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || status === 'submitting') return;

    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message, company }),
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

  const handleSendAnother = () => {
    setName('');
    setEmail('');
    setMessage('');
    setStatus('idle');
  };

  return (
    <div style={{ background: C.parchment, minHeight: '100vh', fontFamily: "'DM Sans', sans-serif" }}>
      {/* dangerouslySetInnerHTML, not a text child — the Google Fonts
          URL has `&` in it, which React would HTML-escape as a
          literal child. <style> is a "raw text" element the browser
          never entity-decodes, so that escaped text mismatches what
          hydration writes and breaks the page (same bug already fixed
          elsewhere on this branch — home page, SiteHeader, /book). */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url(https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap);
            * { box-sizing: border-box; }
            a { text-decoration: none; }
            input, textarea { font-family: 'DM Sans', sans-serif; }
            input:focus, textarea:focus { outline: none; border-color: ${C.gold}; }

            .contact-hero { position: relative; height: 240px; overflow: hidden; background: ${C.forest}; }
            @media (min-width: 820px) { .contact-hero { height: 400px; } }

            .contact-card {
              position: relative; background: ${C.white}; border-radius: 24px;
              box-shadow: 0 20px 48px rgba(45,70,57,0.16);
              margin: -40px 20px 0; padding: 32px 24px 36px;
            }
            @media (min-width: 820px) {
              .contact-card { max-width: 700px; margin: -72px auto 0; padding: 48px 56px 56px; }
            }

            .contact-card-grid { display: grid; gap: 30px; }
            @media (min-width: 640px) {
              .contact-card-grid { grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; }
            }
          `,
        }}
      />

      <SiteHeader />

      {/* ── Full-bleed map moment ── */}
      <div className="contact-hero">
        <iframe
          title="Uri Herbs Workshop location"
          src={MAPS_EMBED_SRC}
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block', filter: 'saturate(0.9)' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        {/* Overlay is pointer-events:none so the map underneath stays
            fully interactive (pan/zoom) — only the two controls inside
            re-enable pointer events for themselves. */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 20 }}>
          <a
            href={SHOP_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              pointerEvents: 'auto', alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(45,70,57,0.88)', backdropFilter: 'blur(4px)', borderRadius: 999,
              padding: '9px 16px 9px 12px', fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, color: C.white,
            }}
          >
            <PinSVG size={15} color={C.white} />
            Uri Herbs Workshop &middot; Chiang Mai Old City
          </a>
          <a
            href={SHOP_MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              pointerEvents: 'auto', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 8,
              background: C.gold, borderRadius: 999, padding: '10px 18px',
              fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 700, color: C.forest,
            }}
          >
            Open in Google Maps &#8599;
          </a>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2, background: C.gold }} />
      </div>

      {/* ── Floating card: info + form ── */}
      <div className="contact-card">
        <div style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.gold, marginBottom: 8 }}>
          Say Hello
        </div>
        <h1 style={{ fontFamily: "'Crimson Pro'", fontSize: 'clamp(28px,4vw,36px)', fontWeight: 700, color: C.forest, margin: '0 0 10px' }}>
          Get in Touch
        </h1>
        <p style={{ fontFamily: "'DM Sans'", fontSize: 14.5, lineHeight: 1.6, color: C.barkLight, maxWidth: 460, margin: '0 0 30px' }}>
          Questions about a workshop, a group booking, or just want to say hi? We&rsquo;d love to hear from you.
        </p>

        <div className="contact-card-grid">
          {/* ── Left: info + socials ── */}
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: 24, marginBottom: 24, borderBottom: `1px solid ${C.sand}` }}>
              <InfoRow icon={<PinSVG size={16} color={C.gold} />}>
                <a href={SHOP_MAPS_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                  {SHOP_ADDRESS}
                </a>
              </InfoRow>
              <InfoRow icon={<ClockSVG size={16} color={C.gold} />}>{SHOP_HOURS}</InfoRow>
              <InfoRow icon={<PhoneSVG size={16} color={C.gold} />}>
                <a href={`tel:${SHOP_PHONE_TEL}`} style={{ color: C.forest }}>{SHOP_PHONE_DISPLAY}</a>
              </InfoRow>
              <InfoRow icon={<MailSVG size={16} color={C.gold} />}>
                <a href={`mailto:${SHOP_EMAIL}`} style={{ color: C.forest }}>{SHOP_EMAIL}</a>
              </InfoRow>
            </div>

            <div style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.barkLight, marginBottom: 14 }}>
              Follow Along
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {SOCIAL_LINKS.map(({ name: socialName, href, Icon }) => (
                <a
                  key={socialName}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={socialName}
                  title={socialName}
                  style={{
                    width: 38, height: 38, borderRadius: '50%', border: `1px solid ${C.sand}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}
                >
                  <Icon size={16} color={C.forest} />
                </a>
              ))}
            </div>
          </div>

          {/* ── Right: contact form ── */}
          <div>
            {status === 'success' ? (
              <div style={{ textAlign: 'center', padding: '18px 8px' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🌿</div>
                <h2 style={{ fontFamily: "'Crimson Pro'", fontSize: 20, fontWeight: 700, color: C.forest, margin: '0 0 8px' }}>
                  Message Sent!
                </h2>
                <p style={{ fontSize: 13.5, color: C.bark, lineHeight: 1.6, margin: '0 0 18px' }}>
                  Thanks for reaching out — we&rsquo;ll get back to you soon.
                </p>
                <button
                  onClick={handleSendAnother}
                  style={{
                    background: 'transparent', border: `1.5px solid ${C.sage}`, color: C.sageDark,
                    borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
                  }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {status === 'error' && (
                  <div style={{
                    background: C.coralLight, color: C.coral, borderRadius: 10, padding: '12px 14px',
                    fontSize: 13, marginBottom: 16, lineHeight: 1.5,
                  }}>
                    {errorMsg}
                  </div>
                )}

                {/* Honeypot — visually hidden, off-screen, never seen or filled by real visitors */}
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  autoComplete="off"
                  tabIndex={-1}
                  aria-hidden="true"
                  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                />

                <div style={{ marginBottom: 14 }}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    placeholder="Name"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.sand}`, background: C.parchment, fontSize: 14, color: C.forest }}
                  />
                </div>

                <div style={{ marginBottom: 14 }}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    placeholder="Email"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.sand}`, background: C.parchment, fontSize: 14, color: C.forest }}
                  />
                </div>

                <div style={{ marginBottom: 18 }}>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={4}
                    placeholder="Message"
                    style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${C.sand}`, background: C.parchment, fontSize: 14, color: C.forest, resize: 'vertical', lineHeight: 1.5 }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit || status === 'submitting'}
                  style={{
                    width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
                    background: canSubmit && status !== 'submitting' ? C.gold : C.sand,
                    color: canSubmit && status !== 'submitting' ? C.forest : C.barkLight,
                    fontWeight: 700, fontSize: 14.5,
                    cursor: canSubmit && status !== 'submitting' ? 'pointer' : 'default',
                  }}
                >
                  {status === 'submitting' ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* ── Minimal booking nudge — the highest-value action on this
          page is a booking, not a blog/social click (those already
          live in the socials row above), so this stays a link to the
          site's own booking flow rather than an outbound link. ── */}
      <div style={{ padding: '30px 24px 60px', textAlign: 'center' }}>
        <span style={{ fontFamily: "'DM Sans'", fontSize: 14, color: C.barkLight }}>
          Prefer to book a workshop instead?{' '}
        </span>
        <a href="/book" style={{ fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 700, color: C.sageDark, textDecoration: 'underline' }}>
          See workshops &rarr;
        </a>
      </div>

      <SiteFooter />
    </div>
  );
}
