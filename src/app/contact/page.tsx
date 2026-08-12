'use client';

import { useState } from 'react';
import SiteHeader from '@/components/SiteHeader';

// ══════════════════════════════════════════════════════════════════
// DESIGN TOKENS — same palette as the rest of the site
// ══════════════════════════════════════════════════════════════════

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
// instead of the actual location — using the coordinates directly
// sidesteps that fuzzy address-matching problem entirely.
const SHOP_LAT = 18.794052;
const SHOP_LNG = 98.9915941;
// No Maps Embed API key configured in this project (same key-less
// pattern the old address-based embed already used), so the embed
// uses the coordinate-based `q=lat,lng&output=embed` shorthand rather
// than the full `pb=` embed format, which requires one.
const MAPS_EMBED_SRC = `https://maps.google.com/maps?q=${SHOP_LAT},${SHOP_LNG}&z=17&output=embed`;
// The user's own verified short link for "open in the Maps app" —
// reused as-is rather than reconstructed from the Place ID, since
// that ID is in Google's internal CID (0x…:0x…) format, not the
// `ChIJ…` Place ID the Maps URLs API's query_place_id expects.
const SHOP_MAPS_URL = 'https://maps.app.goo.gl/gyANPQcP2yrVz2Xw5';

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
// CONTACT INFO ROW
// ══════════════════════════════════════════════════════════════════

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: C.sageLight, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.barkLight, marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: 15, color: C.forest, lineHeight: 1.5 }}>
          {children}
        </div>
      </div>
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
            .contact-grid { display: grid; gap: 28px; grid-template-columns: 1fr; }
            @media (min-width: 820px) {
              .contact-grid { grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; }
            }
            input, textarea { font-family: 'DM Sans', sans-serif; }
            input:focus, textarea:focus { outline: none; border-color: ${C.sage}; }
          `,
        }}
      />

      <SiteHeader />

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 24px 72px' }}>
        <div style={{ width: 32, height: 3, background: C.gold, marginBottom: 14 }} />
        <h1 style={{ fontFamily: "'Crimson Pro'", fontSize: 'clamp(30px,5vw,42px)', fontWeight: 700, color: C.forest, margin: '0 0 10px' }}>
          Get in Touch
        </h1>
        <p style={{ fontFamily: "'Crimson Pro'", fontSize: 18, lineHeight: 1.6, color: C.bark, maxWidth: 560, margin: '0 0 40px' }}>
          Questions about a workshop, a group booking, or just want to say hi? We'd love to hear from you.
        </p>

        <div className="contact-grid">
          {/* ── Left: contact info + map ── */}
          <div>
            <div style={{
              background: C.white, borderRadius: 16, border: `1px solid ${C.sand}`,
              padding: 26, display: 'flex', flexDirection: 'column', gap: 22, marginBottom: 20,
            }}>
              <InfoRow icon={<PinSVG />} label="Address">
                <a href={SHOP_MAPS_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                  {SHOP_ADDRESS}
                </a>
              </InfoRow>
              <InfoRow icon={<ClockSVG />} label="Opening Hours">
                {SHOP_HOURS}
              </InfoRow>
              <InfoRow icon={<PhoneSVG />} label="Phone">
                <a href={`tel:${SHOP_PHONE_TEL}`} style={{ color: C.forest }}>{SHOP_PHONE_DISPLAY}</a>
              </InfoRow>
              <InfoRow icon={<MailSVG />} label="Email">
                <a href={`mailto:${SHOP_EMAIL}`} style={{ color: C.forest }}>{SHOP_EMAIL}</a>
              </InfoRow>
            </div>

            <div style={{
              background: C.white, borderRadius: 16, border: `1px solid ${C.sand}`,
              padding: 26, marginBottom: 20,
            }}>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.barkLight, marginBottom: 14 }}>
                Follow Us
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {SOCIAL_LINKS.map(({ name, href, Icon }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={name}
                    title={name}
                    style={{
                      width: 40, height: 40, borderRadius: 10, background: C.sageLight, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            </div>

            <div style={{ borderRadius: 16, overflow: 'hidden', border: `1px solid ${C.sand}`, background: C.white }}>
              <div style={{ height: 300 }}>
                <iframe
                  title="Uri Herbs Workshop location"
                  src={MAPS_EMBED_SRC}
                  width="100%"
                  height="100%"
                  style={{ border: 0, display: 'block' }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <a
                href={SHOP_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '12px 16px', borderTop: `1px solid ${C.sand}`,
                  fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600, color: C.sageDark,
                  textDecoration: 'none',
                }}
              >
                Open in Google Maps ↗
              </a>
            </div>
          </div>

          {/* ── Right: contact form ── */}
          <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.sand}`, padding: 28 }}>
            {status === 'success' ? (
              <div style={{ textAlign: 'center', padding: '24px 8px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🌿</div>
                <h2 style={{ fontFamily: "'Crimson Pro'", fontSize: 22, fontWeight: 700, color: C.forest, margin: '0 0 8px' }}>
                  Message Sent!
                </h2>
                <p style={{ fontSize: 14, color: C.bark, lineHeight: 1.6, margin: '0 0 20px' }}>
                  Thanks for reaching out — we'll get back to you soon.
                </p>
                <button
                  onClick={handleSendAnother}
                  style={{
                    background: 'transparent', border: `1.5px solid ${C.sage}`, color: C.sageDark,
                    borderRadius: 10, padding: '10px 22px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 style={{ fontFamily: "'Crimson Pro'", fontSize: 22, fontWeight: 700, color: C.forest, margin: '0 0 20px' }}>
                  Send Us a Message
                </h2>

                {status === 'error' && (
                  <div style={{
                    background: C.coralLight, color: C.coral, borderRadius: 10, padding: '12px 14px',
                    fontSize: 13, marginBottom: 18, lineHeight: 1.5,
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

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.forest, marginBottom: 6 }}>Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Your name"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${C.sand}`, fontSize: 14, color: C.bark }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.forest, marginBottom: 6 }}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${C.sand}`, fontSize: 14, color: C.bark }}
                  />
                </div>

                <div style={{ marginBottom: 22 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.forest, marginBottom: 6 }}>Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={5}
                    placeholder="How can we help?"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${C.sand}`, fontSize: 14, color: C.bark, resize: 'vertical', lineHeight: 1.5 }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit || status === 'submitting'}
                  style={{
                    width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none',
                    background: canSubmit && status !== 'submitting' ? C.sage : C.sand,
                    color: canSubmit && status !== 'submitting' ? '#fff' : C.barkLight,
                    fontWeight: 700, fontSize: 15,
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
    </div>
  );
}
