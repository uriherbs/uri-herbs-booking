'use client';

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getPackages, confirmPayLaterBooking, cancelBooking } from "@/lib/booking-service";
import { useAvailableSlots, useCalendarAvailability, useCreateBooking } from "@/lib/hooks";
import { StripeCardForm } from "@/components/payments/StripeCardForm";
import { PayPalCheckoutButtons } from "@/components/payments/PayPalCheckoutButtons";
import { PaymentLoadingBox } from "@/components/payments/PaymentStatusBoxes";
import LegalModal from "@/components/legal/LegalModal";
import { legalDocs } from "@/lib/legal-content";

// ════════════════════════════════════════════════════════════
// DESIGN TOKENS
// ════════════════════════════════════════════════════════════

const C = {
  sage:      "#6B8F71",
  sageDark:  "#4A7050",
  sageLight: "#E7EFEA",
  forest:    "#2D4639",
  parchment: "#F8F5EF",
  white:     "#FFFFFF",
  gold:      "#A89068",
  goldLight: "#F5F0E5",
  bark:      "#5C4A3D",
  barkLight: "#8A7668",
  sand:      "#E8E2D8",
  mist:      "#F0EDE6",
  coral:     "#C07A6E",
  coralLight:"#FCEAE6",
};

// ════════════════════════════════════════════════════════════
// LOCATION / MAPS LINK
// ════════════════════════════════════════════════════════════
// Same coordinate + Place ID pattern as src/app/contact/page.tsx —
// a free-text address search geocodes to a neighboring business
// (The Moon Eatery / SALT & FIRE Rooftop Bar), so this uses the
// exact verified place instead. hl=en keeps the destination page in
// English regardless of the visitor's own browser/device language.
const SHOP_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("Uri Herbs Workshop") +
  "&query_place_id=0x30da3bb4d505e7c5:0x41cac3c3a753cc10&hl=en";

// ════════════════════════════════════════════════════════════
// PACKAGE PRESENTATION METADATA
// ════════════════════════════════════════════════════════════
// Icons, taglines, accent colors, and category groupings are
// design choices — they don't live in the database. Name, price,
// duration, and calendar_type DO come live from getPackages() at
// runtime (see the useEffect in BookingFlow below) and are merged
// with this metadata by slug. If the DB ever adds a package whose
// slug isn't listed here, it still renders with generic fallbacks
// instead of vanishing — a forgotten metadata entry never hides a
// real bookable package.

const PACKAGE_META = {
  "single-tea": {
    category: "single", icon: "🍵",
    tagline: "Craft your signature blend",
    takeaway: "2 custom dried tea cloth bags + fresh tasting",
    accent: "#B8A060",
  },
  "single-inhaler": {
    category: "single", icon: "🌿",
    tagline: "Your personal aromatherapy jar",
    takeaway: "1 personalized Ya Dom jar",
    accent: "#6B8F71",
  },
  "single-massage-ball": {
    category: "single", icon: "🌾",
    tagline: "Ancient Thai healing craft",
    takeaway: "1 herbal compress ball in protective bag",
    accent: "#8F7B6B",
  },
  "combo-tea-inhaler": {
    category: "combo", icon: "🍵🌿",
    tagline: "Blend & breathe — two arts, one session",
    takeaway: "Tea bags + Ya Dom jar",
    accent: "#7A9A6A",
  },
  "combo-inhaler-ball": {
    category: "combo", icon: "🌿🌾",
    tagline: "Herbs for body & mind",
    takeaway: "Ya Dom jar + herbal compress ball",
    accent: "#7B8F6B",
  },
  "combo-tea-ball": {
    category: "combo", icon: "🍵🌾",
    tagline: "Sip & soothe in Chiang Mai's Old City",
    takeaway: "Tea bags + herbal compress ball",
    accent: "#9A8A60",
  },
  "journey-full": {
    category: "journey", icon: "✦",
    tagline: "The complete herbal immersion — all 3 workshops",
    takeaway: "All 3 takeaway sets: teas, Ya Dom & compress ball",
    accent: "#A89068",
  },
  "skincare-aromatherapy": {
    category: "aromatherapy", icon: "❋",
    tagline: "Deep dive into natural skincare & essential oils",
    takeaway: "Handmade skincare products to take home",
    accent: "#A07898",
  },
};

const CATEGORY_FALLBACK = { category: "single", icon: "🌿", tagline: "", takeaway: "", accent: "#6B8F71" };

const COUNTRY_CODES = [
  { code: "+66", flag: "🇹🇭", name: "Thailand" },
  { code: "+1", flag: "🇺🇸", name: "USA/Canada" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+972", flag: "🇮🇱", name: "Israel" },
  { code: "+49", flag: "🇩🇪", name: "Germany" },
  { code: "+33", flag: "🇫🇷", name: "France" },
  { code: "+61", flag: "🇦🇺", name: "Australia" },
  { code: "+81", flag: "🇯🇵", name: "Japan" },
  { code: "+82", flag: "🇰🇷", name: "South Korea" },
  { code: "+86", flag: "🇨🇳", name: "China" },
  { code: "+65", flag: "🇸🇬", name: "Singapore" },
  { code: "+91", flag: "🇮🇳", name: "India" },
  { code: "+31", flag: "🇳🇱", name: "Netherlands" },
  { code: "+34", flag: "🇪🇸", name: "Spain" },
  { code: "+39", flag: "🇮🇹", name: "Italy" },
  { code: "+7", flag: "🇷🇺", name: "Russia" },
];

// Merges a live DB package row with its presentation metadata
function mergePackage(dbPkg) {
  const meta = PACKAGE_META[dbPkg.slug] || CATEGORY_FALLBACK;
  return {
    slug: dbPkg.slug,
    name: dbPkg.name,
    price: dbPkg.price_thb,
    duration: dbPkg.duration_minutes,
    calendar: dbPkg.calendar_type,
    ...meta,
  };
}

// Schedule, capacity, and cutoff logic all now live server-side in
// get_available_slots() / get_calendar_availability() (called via the
// useAvailableSlots / useCalendarAvailability hooks below). The mock
// TIME_SLOTS_MAP, getMockCapacity(), isAromaDay(), and getAromaTime()
// functions that used to duplicate that logic client-side are gone —
// there's now exactly one place the schedule matrix is enforced.

// ════════════════════════════════════════════════════════════
// PRIVATE VS. GROUP CAPACITY MODEL (spec /book §2.1)
// ════════════════════════════════════════════════════════════
// Two instructors, two tables. A group ("join a group") booking shares
// a table — soft-capped at 6 — with other parties, billed by actual
// headcount. A private booking claims a whole table to itself:
//   1–6 guests  → one table, one instructor
//   7–8 guests  → same one table, just a cozier fit (messaging-only
//                 difference — the locking logic is identical to 1–6)
//   9–16 guests → both tables, both instructors (the whole space)
// Pricing never adds a "private surcharge" — it's the same per-person
// rate as group, just with a minimum headcount charged regardless of
// actual attendance. Mirrors create_booking()'s GREATEST(...) logic
// exactly, so what the customer sees pre-submit matches what they're
// actually charged.
function chargedParticipants(participants, isPrivate) {
  if (!isPrivate) return participants;
  const minimum = participants <= 8 ? 4 : 10;
  return Math.max(participants, minimum);
}

// Dynamic "Experience" step messaging, per spec §4.
function privateModeMessage(participants) {
  if (participants <= 6) return "Private session — just your group, with one instructor";
  if (participants <= 8) return "Private session — just your group (cozy fit for up to 8, one instructor)";
  return "Private session — the whole space, with both instructors";
}

// Table label shown on a Date & Time slot, mode-aware (group vs.
// private) and null-safe (null = a whole-space private booking spans
// both tables, so there's no single "group" to name).
function slotGroupLabel(group, isPrivate) {
  if (group === null) return isPrivate ? "Whole space — both instructors" : null;
  const instructor = group === "A" ? "with Mali" : "Instructor B";
  return isPrivate ? `Private table — Group ${group} (${instructor})` : `Group ${group} (${instructor})`;
}

// ════════════════════════════════════════════════════════════
// SVG ICONS
// ════════════════════════════════════════════════════════════

const LeafSVG = ({ size = 16, color = C.sage, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22.5C7.76 17.66 9.41 12.67 18 11.18V14C21.78 10.58 20 2 20 2S13.21 4.58 17 8Z"
      fill={color} opacity="0.8"/>
  </svg>
);

const CheckSVG = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
    <path d="M5 12l5 5L19 7"/>
  </svg>
);

const ClockSVG = ({ size = 14, color = C.barkLight }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
  </svg>
);

const UsersSVG = ({ size = 14, color = C.barkLight }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

const MapPinSVG = ({ size = 14, color = C.barkLight }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

const ChevronLeftSVG = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
);

const CloseSVG = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
);

const ChevronRightSVG = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>
);

const GiftSVG = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2">
    <rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M19 12v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7"/>
    <path d="M7.5 8a2.5 2.5 0 010-5C9 3 12 8 12 8S15 3 16.5 3a2.5 2.5 0 010 5"/>
  </svg>
);

// ════════════════════════════════════════════════════════════
// DECORATIVE: Botanical vine progress indicator
// ════════════════════════════════════════════════════════════

const STEP_LABELS = ["Experience", "Date & Time", "Your Details", "Payment", "Confirmation"];

function StepVine({ currentStep }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 0, padding: "20px 16px 12px", background: C.white,
      borderBottom: `1px solid ${C.sand}`,
    }}>
      {STEP_LABELS.map((label, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        return (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && (
              <div style={{
                width: 28, height: 2,
                background: done ? C.sage : C.sand,
                transition: "background 0.4s",
              }}/>
            )}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div style={{
                width: active ? 32 : 26, height: active ? 32 : 26,
                borderRadius: "50%",
                background: done ? C.sage : active ? C.white : C.mist,
                border: active ? `2px solid ${C.sage}` : done ? "none" : `1px solid ${C.sand}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.3s",
                boxShadow: active ? `0 0 0 4px ${C.sageLight}` : "none",
              }}>
                {done ? <CheckSVG size={14}/> :
                 active ? <LeafSVG size={16} color={C.sage} style={{}} /> :
                  <span style={{ fontSize: 10, color: C.barkLight, fontFamily: "'DM Sans'" }}>{i + 1}</span>
                }
              </div>
              <span style={{
                fontSize: 10, fontFamily: "'DM Sans'", letterSpacing: "0.02em",
                color: active ? C.forest : done ? C.sage : C.barkLight,
                fontWeight: active ? 600 : 400,
              }}>{label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 1: PACKAGE SELECTION
// ════════════════════════════════════════════════════════════

function PackageCard({ pkg, selected, onSelect, participants, isPrivate }) {
  const isSelected = selected === pkg.slug;
  const charged = chargedParticipants(participants, isPrivate);
  const totalPrice = pkg.price * charged;
  return (
    <button
      onClick={() => onSelect(pkg.slug)}
      style={{
        width: "100%", textAlign: "left", cursor: "pointer",
        background: isSelected ? C.sageLight : C.white,
        border: isSelected ? `2px solid ${C.sage}` : `1.5px solid ${C.sand}`,
        borderRadius: 14, padding: 0, overflow: "hidden",
        transition: "all 0.2s",
        boxShadow: isSelected ? `0 2px 12px rgba(107,143,113,0.15)` : "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Top accent stripe */}
      <div style={{ height: 3, background: pkg.accent, opacity: isSelected ? 1 : 0.5, transition: "opacity 0.2s" }}/>

      <div style={{ padding: "14px 16px" }}>
        {/* Header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 20 }}>{pkg.icon}</span>
              <span style={{
                fontFamily: "'Crimson Pro'", fontSize: 17, fontWeight: 600, color: C.forest,
                lineHeight: 1.2,
              }}>{pkg.name}</span>
            </div>
            <p style={{
              fontFamily: "'DM Sans'", fontSize: 13, color: C.barkLight,
              margin: "2px 0 0", lineHeight: 1.4,
            }}>{pkg.tagline}</p>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{
              fontFamily: "'Crimson Pro'", fontSize: 20, fontWeight: 700, color: C.gold,
              lineHeight: 1,
            }}>฿{totalPrice.toLocaleString()}</div>
            {charged !== participants ? (
              <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: C.barkLight }}>
                ฿{pkg.price.toLocaleString()} × {charged} (min. for private)
              </div>
            ) : participants > 1 ? (
              <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: C.barkLight }}>
                ฿{pkg.price.toLocaleString()} × {participants}
              </div>
            ) : null}
          </div>
        </div>

        {/* Meta row */}
        <div style={{
          display: "flex", gap: 12, marginTop: 10, paddingTop: 10,
          borderTop: `1px solid ${isSelected ? "rgba(107,143,113,0.2)" : C.sand}`,
        }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.barkLight, fontFamily: "'DM Sans'" }}>
            <ClockSVG/> {pkg.duration} min
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C.barkLight, fontFamily: "'DM Sans'" }}>
            <GiftSVG/> {pkg.takeaway.split("+")[0].trim()}
            {pkg.takeaway.includes("+") && " +more"}
          </span>
        </div>
      </div>

      {/* Selection indicator */}
      {isSelected && (
        <div style={{
          background: C.sage, color: C.white, textAlign: "center",
          padding: "6px 0", fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600,
          letterSpacing: "0.03em",
        }}>Selected ✓</div>
      )}
    </button>
  );
}

function ModeToggle({ isPrivate, onChange }) {
  const options = [
    { value: false, label: "Join a Group", sub: "Share a table · best value" },
    { value: true, label: "Private Session", sub: "Just your group" },
  ];
  return (
    <div style={{
      display: "flex", gap: 4, background: C.mist, borderRadius: 12, padding: 4,
    }}>
      {options.map(opt => {
        const selected = isPrivate === opt.value;
        return (
          <button
            key={String(opt.value)}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1, cursor: "pointer", border: "none", borderRadius: 9,
              padding: "10px 8px", textAlign: "center",
              background: selected ? C.white : "transparent",
              boxShadow: selected ? "0 1px 5px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.15s",
            }}
          >
            <div style={{
              fontFamily: "'Crimson Pro'", fontSize: 15, fontWeight: 700,
              color: selected ? C.forest : C.barkLight,
            }}>{opt.label}</div>
            <div style={{
              fontFamily: "'DM Sans'", fontSize: 11, color: C.barkLight, marginTop: 1,
            }}>{opt.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

function PackageStep({ packages, selected, onSelect, participants, onParticipantsChange, isPrivate, onIsPrivateChange }) {
  // Most expensive/longest first, per business request — highest-value
  // option gets first look before the customer scrolls past it.
  const categories = [
    { key: "journey", title: "The Full Journey", subtitle: "3 Hours • All workshops included" },
    { key: "combo", title: "Combo Packages", subtitle: "2 Hours" },
    { key: "single", title: "Single Workshop", subtitle: "1 Hour" },
    { key: "aromatherapy", title: "Aromatherapy Mastery", subtitle: "2 Hours • Mon–Thu only" },
  ];

  // Group (shared table) soft-caps at 6; private can go up to the whole
  // space (16). See spec /book §2.1 §1.
  const maxGuests = isPrivate ? 16 : 6;

  return (
    <div style={{ padding: "0 16px 100px" }}>
      {/* Private vs. Group toggle */}
      <div style={{ marginBottom: 14 }}>
        <ModeToggle isPrivate={isPrivate} onChange={onIsPrivateChange} />
      </div>

      {/* Participant counter */}
      <div style={{
        background: C.white, borderRadius: 14, padding: "16px 18px",
        border: `1.5px solid ${C.sand}`, marginBottom: isPrivate ? 10 : 20,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 16, fontWeight: 600, color: C.forest }}>
            Number of Guests
          </div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight, marginTop: 2 }}>
            {isPrivate ? "Up to 16 — 8 per table, or the whole space for 9+" : "Up to 6, sharing a table with other guests"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => onParticipantsChange(Math.max(1, participants - 1))}
            disabled={participants <= 1}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              border: `1.5px solid ${participants <= 1 ? C.sand : C.sage}`,
              background: "transparent", cursor: participants <= 1 ? "default" : "pointer",
              fontSize: 20, color: participants <= 1 ? C.sand : C.sage,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>−</button>
          <span style={{
            fontFamily: "'Crimson Pro'", fontSize: 24, fontWeight: 700,
            color: C.forest, minWidth: 28, textAlign: "center",
          }}>{participants}</span>
          <button
            onClick={() => onParticipantsChange(Math.min(maxGuests, participants + 1))}
            disabled={participants >= maxGuests}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              border: `1.5px solid ${participants >= maxGuests ? C.sand : C.sage}`,
              background: participants >= maxGuests ? "transparent" : C.sage,
              cursor: participants >= maxGuests ? "default" : "pointer",
              fontSize: 20, color: participants >= maxGuests ? C.sand : C.white,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>+</button>
        </div>
      </div>

      {/* Private-mode dynamic messaging, per spec §4 */}
      {isPrivate && (
        <div style={{
          background: C.goldLight, border: `1px solid rgba(168,144,104,0.25)`,
          borderRadius: 12, padding: "12px 14px", marginBottom: 20,
          fontFamily: "'DM Sans'", fontSize: 13, color: C.bark, lineHeight: 1.5,
        }}>
          {privateModeMessage(participants)}
        </div>
      )}

      {/* Informational only — not a blocking checkbox. Business intent
          (per spec): families with kids are welcome and encouraged;
          this exists to head off parents booking several young
          children as "independent" participants to use as childcare
          while the adult doesn't actually take part. */}
      <p style={{
        fontFamily: "'DM Sans'", fontSize: 12.5, lineHeight: 1.6, color: C.barkLight,
        margin: "10px 2px 20px",
      }}>
        Uri Herbs Workshop is a hands-on family experience, not childcare. Children under 12 are
        welcome as part of a family booking, but must be seated with and actively supervised by a
        participating parent throughout. Guests aged 12–17 need an accompanying adult in the group.
      </p>

      {categories.map(cat => {
        const catPackages = packages.filter(p => p.category === cat.key);
        if (catPackages.length === 0) return null;
        return (
        <div key={cat.key} style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 10 }}>
            <h3 style={{
              fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 600,
              color: C.forest, margin: 0,
            }}>{cat.title}</h3>
            <p style={{
              fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight, margin: "2px 0 0",
            }}>{cat.subtitle}</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {catPackages.map(pkg => (
              <PackageCard
                key={pkg.slug} pkg={pkg} selected={selected}
                onSelect={onSelect} participants={participants} isPrivate={isPrivate}
              />
            ))}
          </div>
        </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 2: DATE & TIME SELECTION
// ════════════════════════════════════════════════════════════

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function MiniCalendar({ selectedDate, onSelectDate, selectedPkg, participants, isPrivate }) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  // Visible month's date range, sent to the server in one call
  const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { days: liveDays, loading: calLoading } = useCalendarAvailability(
    monthStart, monthEnd, selectedPkg?.slug || null, participants, isPrivate
  );

  // Map server results by date for O(1) lookup while building the grid
  const statusByDate = useMemo(() => {
    const map = {};
    for (const d of liveDays) map[d.slot_date] = d.status; // 'open' | 'limited' | 'full' | 'closed'
    return map;
  }, [liveDays]);

  const days = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Past dates are disabled locally regardless of what the server
      // says (server may report a past date as "full" once its cutoff
      // has passed, which is functionally correct but visually distinct
      // from a genuinely sold-out future date).
      const status = isPast ? "closed" : (statusByDate[dateStr] || (calLoading ? "loading" : "closed"));

      cells.push({ day: d, date, dateStr, status, isToday: dateStr === `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}` });
    }
    return cells;
  }, [viewMonth, viewYear, statusByDate, calLoading]);

  const canGoPrev = viewMonth > today.getMonth() || viewYear > today.getFullYear();
  const maxMonth = today.getMonth() + 2;
  const canGoNext = viewMonth < maxMonth || viewYear > today.getFullYear();

  return (
    <div style={{
      background: C.white, borderRadius: 14, border: `1.5px solid ${C.sand}`,
      overflow: "hidden",
    }}>
      {/* Month nav */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 16px", borderBottom: `1px solid ${C.sand}`,
      }}>
        <button onClick={() => {
          if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
          else setViewMonth(m => m - 1);
        }} disabled={!canGoPrev}
          style={{ background: "none", border: "none", cursor: canGoPrev ? "pointer" : "default", opacity: canGoPrev ? 1 : 0.3, padding: 4 }}>
          <ChevronLeftSVG/>
        </button>
        <span style={{ fontFamily: "'Crimson Pro'", fontSize: 17, fontWeight: 600, color: C.forest }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button onClick={() => {
          if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
          else setViewMonth(m => m + 1);
        }} disabled={!canGoNext}
          style={{ background: "none", border: "none", cursor: canGoNext ? "pointer" : "default", opacity: canGoNext ? 1 : 0.3, padding: 4 }}>
          <ChevronRightSVG/>
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "8px 8px 0" }}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{
            textAlign: "center", fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600,
            color: C.barkLight, padding: "4px 0", letterSpacing: "0.03em",
          }}>{w}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", padding: "4px 8px 12px", gap: 2 }}>
        {days.map((cell, i) => {
          if (!cell) return <div key={`pad-${i}`}/>;
          const isSelected = selectedDate === cell.dateStr;
          const isLoading = cell.status === "loading";
          const isDisabled = cell.status === "closed" || cell.status === "full" || isLoading;
          return (
            <button key={cell.dateStr}
              onClick={() => !isDisabled && onSelectDate(cell.dateStr)}
              disabled={isDisabled}
              style={{
                background: isSelected ? C.sage : "transparent",
                border: cell.isToday && !isSelected ? `1.5px solid ${C.sage}` : "1.5px solid transparent",
                borderRadius: 10, padding: "8px 2px", cursor: isDisabled ? "default" : "pointer",
                opacity: isLoading ? 0.5 : isDisabled ? 0.35 : 1,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                transition: "all 0.15s",
              }}
            >
              <span style={{
                fontFamily: "'DM Sans'", fontSize: 14, fontWeight: isSelected ? 700 : 500,
                color: isSelected ? C.white : C.forest,
              }}>{cell.day}</span>
              {!isDisabled && (
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: isSelected ? "rgba(255,255,255,0.8)" :
                    cell.status === "limited" ? C.gold :
                    C.sage,
                }}/>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 16, justifyContent: "center",
        padding: "10px 16px 14px", borderTop: `1px solid ${C.sand}`,
      }}>
        {[
          { color: C.sage, label: "Available" },
          { color: C.gold, label: "Limited" },
          { color: C.sand, label: "Full" },
        ].map(l => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: l.color }}/>
            <span style={{ fontSize: 11, fontFamily: "'DM Sans'", color: C.barkLight }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimeSlotPicker({ selectedDate, selectedTime, onSelectTime, pkg, participants, isPrivate }) {
  const { slots, loading, error } = useAvailableSlots(selectedDate, pkg?.slug || null, participants, isPrivate);

  if (!selectedDate) return null;

  // Same mode-dependent ceiling the RPC uses for remaining_capacity:
  // 6 for a shared group table, 8 for a private one-table booking,
  // 16 for a private whole-space booking. See spec /book §2.1 §1.
  const maxCap = !isPrivate ? 6 : participants <= 8 ? 8 : 16;

  const formatTime = (t) => {
    const [h] = t.split(":");
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h3 style={{
        fontFamily: "'Crimson Pro'", fontSize: 17, fontWeight: 600,
        color: C.forest, margin: "0 0 10px",
      }}>Available Times</h3>

      {loading ? (
        <div style={{
          background: C.mist, borderRadius: 12, padding: "20px 16px", textAlign: "center",
          fontFamily: "'DM Sans'", fontSize: 14, color: C.barkLight,
        }}>Checking availability…</div>
      ) : error ? (
        <div style={{
          background: C.coralLight, borderRadius: 12, padding: "20px 16px", textAlign: "center",
          fontFamily: "'DM Sans'", fontSize: 14, color: C.coral,
        }}>Couldn't load times right now — pull to refresh or try again in a moment.</div>
      ) : slots.length === 0 ? (
        <div style={{
          background: C.mist, borderRadius: 12, padding: "20px 16px", textAlign: "center",
          fontFamily: "'DM Sans'", fontSize: 14, color: C.barkLight,
        }}>No times available on this date for {pkg.name}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {slots.map(slot => {
            const isSelected = selectedTime === slot.start_time;
            const remaining = slot.remaining_capacity;
            const available = slot.is_available;
            const group = slot.instructor_group;
            const groupLabel = slotGroupLabel(group, isPrivate);
            const pct = ((maxCap - remaining) / maxCap) * 100;
            return (
              <button key={slot.start_time}
                onClick={() => available && onSelectTime(slot.start_time)}
                disabled={!available}
                style={{
                  width: "100%", textAlign: "left",
                  background: isSelected ? C.sageLight : C.white,
                  border: isSelected ? `2px solid ${C.sage}` : `1.5px solid ${available ? C.sand : "#e8e0d8"}`,
                  borderRadius: 12, padding: "14px 16px", cursor: available ? "pointer" : "default",
                  opacity: available ? 1 : 0.5, transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{
                      fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 600, color: C.forest,
                    }}>
                      {formatTime(slot.start_time)}
                      <span style={{ fontSize: 13, fontWeight: 400, color: C.barkLight }}> – {formatTime(slot.end_time)}</span>
                    </div>
                    {available && groupLabel && (
                      <div style={{
                        fontFamily: "'DM Sans'", fontSize: 11, color: C.sage, marginTop: 3,
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <UsersSVG size={12} color={C.sage}/>
                        {groupLabel}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600,
                      color: remaining <= 3 ? C.coral : C.sage,
                    }}>
                      {available ? `${remaining} left` : "Full"}
                    </div>
                  </div>
                </div>

                {/* Capacity bar */}
                <div style={{
                  height: 4, background: C.mist, borderRadius: 2, marginTop: 10, overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", borderRadius: 2, transition: "width 0.3s",
                    width: `${pct}%`,
                    background: pct > 75 ? C.coral : pct > 50 ? C.gold : C.sage,
                  }}/>
                </div>
                <div style={{
                  display: "flex", justifyContent: "space-between", marginTop: 4,
                  fontFamily: "'DM Sans'", fontSize: 10, color: C.barkLight,
                }}>
                  <span>{maxCap - remaining} booked</span>
                  <span>{maxCap} max</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DateTimeStep({ selectedDate, onSelectDate, selectedTime, onSelectTime, pkg, participants, isPrivate }) {
  const charged = chargedParticipants(participants, isPrivate);
  return (
    <div style={{ padding: "0 16px 100px" }}>
      {/* Selected package reminder */}
      <div style={{
        background: C.goldLight, borderRadius: 12, padding: "12px 16px", marginBottom: 16,
        display: "flex", alignItems: "center", gap: 10,
        border: `1px solid rgba(168,144,104,0.2)`,
      }}>
        <span style={{ fontSize: 22 }}>{pkg.icon}</span>
        <div>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 15, fontWeight: 600, color: C.forest }}>
            {pkg.name}{isPrivate && " · Private"}
          </div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight }}>
            {pkg.duration} min • {participants} guest{participants > 1 ? "s" : ""} • ฿{(pkg.price * charged).toLocaleString()}
            {charged !== participants && ` (min. ${charged})`}
          </div>
        </div>
      </div>

      {pkg.calendar === "aromatherapy" && (
        <div style={{
          background: "#F8F0F6", border: "1px solid #E8D8E4", borderRadius: 10,
          padding: "10px 14px", marginBottom: 14,
          fontFamily: "'DM Sans'", fontSize: 12, color: "#6A4A62", lineHeight: 1.5,
        }}>
          Aromatherapy Mastery is available <strong>Mon–Thu only</strong>. Booking closes 2 hours before the session.
        </div>
      )}

      <MiniCalendar
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        selectedPkg={pkg}
        participants={participants}
        isPrivate={isPrivate}
      />

      <TimeSlotPicker
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onSelectTime={onSelectTime}
        pkg={pkg}
        participants={participants}
        isPrivate={isPrivate}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 3: CUSTOMER DETAILS
// ════════════════════════════════════════════════════════════

function CustomerStep({ form, onChange, errors }) {
  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: "100%", boxSizing: "border-box",
    fontFamily: "'DM Sans'", fontSize: 16, // 16px prevents iOS zoom
    padding: "12px 14px", borderRadius: 10,
    border: `1.5px solid ${hasError ? C.coral : C.sand}`,
    background: hasError ? C.coralLight : C.white,
    color: C.forest, outline: "none",
    transition: "border-color 0.2s",
  });

  const labelStyle = {
    fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600,
    color: C.forest, marginBottom: 6, display: "block",
  };

  const errorStyle = {
    fontFamily: "'DM Sans'", fontSize: 12, color: C.coral, marginTop: 4,
  };

  return (
    <div style={{ padding: "0 16px 100px" }}>
      {/* A real <form> (not just styled divs) so mobile browsers'
          autofill reliably kicks in for the autoComplete attributes
          below — some only offer saved values for inputs inside an
          actual form element. preventDefault since there's nothing to
          submit here: the real "next step" action is the sticky CTA
          button rendered by the parent, outside this form. */}
      <form onSubmit={e => e.preventDefault()} style={{
        background: C.white, borderRadius: 14, border: `1.5px solid ${C.sand}`,
        padding: "20px 18px", display: "flex", flexDirection: "column", gap: 18,
      }}>
        <div>
          <label style={labelStyle}>Full Name *</label>
          <input
            type="text" placeholder="e.g. Sophie Martin" autoComplete="name"
            value={form.name} onChange={e => onChange("name", e.target.value)}
            style={inputStyle(errors.name) as React.CSSProperties}
          />
          {errors.name && <div style={errorStyle}>{errors.name}</div>}
        </div>

        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email" placeholder="For booking confirmation (optional)" autoComplete="email"
            value={form.email} onChange={e => onChange("email", e.target.value)}
            style={inputStyle(errors.email)}
          />
          {errors.email && <div style={errorStyle}>{errors.email}</div>}
        </div>

        <div>
          <label style={labelStyle}>Phone / WhatsApp</label>
          <div style={{ display: "flex", gap: 8 }}>
            <select
              value={form.phoneCountryCode}
              onChange={e => onChange("phoneCountryCode", e.target.value)}
              style={{ ...inputStyle(false), width: 110, flexShrink: 0, cursor: "pointer" }}
            >
              {COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
              ))}
            </select>
            <input
              type="tel" placeholder="812345678" inputMode="numeric" autoComplete="tel-national"
              value={form.phone}
              onChange={e => onChange("phone", e.target.value.replace(/[^\d]/g, ""))}
              style={{ ...inputStyle(false), flex: 1 }}
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Special Requests</label>
          <textarea
            placeholder="Allergies, dietary needs, special occasions..."
            value={form.notes} onChange={e => onChange("notes", e.target.value)}
            rows={3}
            style={{ ...inputStyle(false), resize: "vertical", lineHeight: 1.5 }}
          />
        </div>
      </form>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 4: PAYMENT
// ════════════════════════════════════════════════════════════
// Real payment processing (spec §5, §6.2). By the time this step
// renders, the booking already exists as 'pending_payment' (created
// on the 2→3 transition in BookingFlow, holding the slot) with its
// price computed server-side by create_booking().
//
//   Pay with Card  → StripeCardForm embeds Stripe's Payment Element
//                     inline; PaymentIntent created via
//                     /api/payments/stripe/create-intent, confirmed
//                     authoritatively by /api/payments/stripe/webhook
//                     (confirm_booking_payment, service-role only).
//   PayPal         → PayPalCheckoutButtons embeds PayPal's own
//                     buttons; order created/captured via
//                     /api/payments/paypal/create-order +
//                     capture-order, with the PayPal webhook as a
//                     backstop confirmation path.
//   Pay Later      → no online payment claim at all — the sticky CTA
//                     below just calls confirm_pay_later_booking()
//                     directly, same trust level as before.
//
// Abandoned pending_payment bookings (tab closed, payment never
// finished) are auto-cancelled ~30 min later by a pg_cron job
// (expire_pending_bookings) so the slot frees back up on its own.

const PAYMENT_METHODS = [
  {
    key: "stripe" as const,
    label: "Pay with Card",
    sublabel: "via Stripe",
    description: "Secure checkout. Full amount charged now.",
  },
  {
    key: "paypal" as const,
    label: "PayPal",
    sublabel: "",
    description: "Pay with your PayPal balance or a linked card. Full amount charged now.",
  },
  {
    key: "later" as const,
    label: "Pay Later",
    sublabel: "",
    description: "Cash, PromptPay QR, or WeChat Pay when you arrive. Nothing charged now.",
  },
];

// TODO(design): generic placeholder marks, not the real Stripe/PayPal
// brand assets — swap for their official logo kits before launch
// (stripe.com/newsroom/brand-assets, paypal.com/us/webapps/mpp/logo-center).
const CardSVG = ({ color = C.barkLight }) => (
  <svg width={22} height={16} viewBox="0 0 24 18" fill="none" stroke={color} strokeWidth="1.6">
    <rect x="1" y="1" width="22" height="16" rx="2.5" />
    <path d="M1 6.5h22" />
  </svg>
);

const WalletSVG = ({ color = C.barkLight }) => (
  <svg width={22} height={18} viewBox="0 0 24 20" fill="none" stroke={color} strokeWidth="1.6">
    <path d="M2 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5Z" />
    <path d="M16 11a1.5 1.5 0 1 0 0-3h5v3h-5Z" />
  </svg>
);

const CashSVG = ({ color = C.barkLight }) => (
  <svg width={22} height={16} viewBox="0 0 24 18" fill="none" stroke={color} strokeWidth="1.6">
    <rect x="1" y="1" width="22" height="16" rx="2.5" />
    <circle cx="12" cy="9" r="3.2" />
  </svg>
);

const PAYMENT_ICONS: Record<string, (props: { color?: string }) => JSX.Element> = {
  stripe: CardSVG, paypal: WalletSVG, later: CashSVG,
};

function PaymentStep({ paymentMethod, onSelectMethod, agreedToTerms, onToggleTerms, errors, booking, onOnlinePaymentSuccess }) {
  const amountLabel = booking ? `฿${booking.total_price_thb.toLocaleString()}` : "";
  // Which legal doc's modal is open, if any — fully local to this
  // component. Opening/closing it only ever touches this one piece of
  // state; it has no way to reach the booking form or the agreement
  // checkbox above, by construction (LegalModal only calls onClose).
  const [legalModalDoc, setLegalModalDoc] = useState(null);
  return (
    <div style={{ padding: "0 16px 100px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {PAYMENT_METHODS.map(opt => {
          const selected = paymentMethod === opt.key;
          const Icon = PAYMENT_ICONS[opt.key];
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onSelectMethod(opt.key)}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                width: "100%", textAlign: "left", cursor: "pointer",
                borderRadius: 14, padding: "16px 16px",
                background: selected ? C.sageLight : C.white,
                border: selected ? `2px solid ${C.sage}` : `1.5px solid ${C.sand}`,
              }}
            >
              <span style={{
                width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                background: selected ? C.white : C.mist,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon color={selected ? C.sage : C.barkLight} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontFamily: "'Crimson Pro'", fontSize: 16, fontWeight: 700, color: C.forest }}>
                    {opt.label}
                  </span>
                  {opt.sublabel && (
                    <span style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight }}>
                      {opt.sublabel}
                    </span>
                  )}
                </span>
                <span style={{
                  display: "block", marginTop: 2,
                  fontFamily: "'DM Sans'", fontSize: 12.5, color: C.barkLight, lineHeight: 1.4,
                }}>
                  {opt.description}
                </span>
                {opt.key !== "later" && (
                  <span style={{
                    display: "block", marginTop: 4,
                    fontFamily: "'DM Sans'", fontSize: 11, color: C.barkLight, opacity: 0.8,
                  }}>
                    Visa · Mastercard · Amex accepted
                  </span>
                )}
              </span>
              <span style={{
                width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                border: `2px solid ${selected ? C.sage : C.sand}`,
                background: selected ? C.sage : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {selected && <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.white }} />}
              </span>
            </button>
          );
        })}
      </div>
      {errors.payment && (
        <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.coral, marginTop: 8 }}>
          {errors.payment}
        </div>
      )}

      {/* Terms & Conditions agreement — required before confirming.
          "Terms & Conditions" / "Privacy Policy" open an in-page modal
          (LegalModal, below) rather than navigating away — same content
          as the standalone /terms and /privacy pages (both pull from
          the same legal-content.ts), just without leaving this flow.
          Local legalModalDoc state only ever calls onClose; it can't
          touch the booking form or the agreement checkbox. */}
      <div style={{ background: C.mist, borderRadius: 10, padding: "14px 16px", marginTop: 20 }}>
        <label style={{ display: "flex", gap: 12, cursor: "pointer", alignItems: "flex-start" }}>
          <div
            style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
              border: agreedToTerms ? "none" : `1.5px solid ${errors.terms ? C.coral : C.sand}`,
              background: agreedToTerms ? C.sage : C.white,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
            onClick={(e) => { e.preventDefault(); onToggleTerms(); }}
          >
            {agreedToTerms && <CheckSVG size={14} />}
          </div>
          <div>
            <span
              style={{ fontFamily: "'DM Sans'", fontSize: 13, color: C.forest, fontWeight: 500, lineHeight: 1.5 }}
              onClick={(e) => { e.preventDefault(); onToggleTerms(); }}
            >
              I agree to Uri Herbs Workshop&rsquo;s{" "}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLegalModalDoc("terms"); }}
                style={{
                  background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer",
                  color: C.sageDark, fontWeight: 700, textDecoration: "underline",
                }}
              >
                Terms &amp; Conditions
              </button>{" "}
              and{" "}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setLegalModalDoc("privacy"); }}
                style={{
                  background: "none", border: "none", padding: 0, font: "inherit", cursor: "pointer",
                  color: C.sageDark, fontWeight: 700, textDecoration: "underline",
                }}
              >
                Privacy Policy
              </button>
              . Opens right here — your booking progress is saved.
            </span>
            {errors.terms && <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.coral, marginTop: 4 }}>{errors.terms}</div>}
          </div>
        </label>
      </div>

      {/* Card / PayPal complete their own payment here, inline —
          neither uses the generic sticky "Confirm Booking" CTA below
          (that one only drives the Pay Later path). Gated on the
          terms checkbox above so nothing can be paid before agreeing. */}
      {(paymentMethod === "stripe" || paymentMethod === "paypal") && (
        agreedToTerms ? (
          booking ? (
            paymentMethod === "stripe" ? (
              <StripeCardForm
                bookingId={booking.booking_id}
                amountLabel={amountLabel}
                onSuccess={onOnlinePaymentSuccess}
              />
            ) : (
              <PayPalCheckoutButtons
                bookingId={booking.booking_id}
                onSuccess={onOnlinePaymentSuccess}
              />
            )
          ) : (
            <PaymentLoadingBox label="Preparing your booking…" style={{ marginTop: 12 }} />
          )
        ) : (
          <div style={{
            background: C.mist, borderRadius: 10, padding: "12px 14px", marginTop: 12,
            fontFamily: "'DM Sans'", fontSize: 12.5, color: C.barkLight, lineHeight: 1.5,
          }}>
            Please agree to the Terms &amp; Conditions above to continue to payment.
          </div>
        )
      )}

      <LegalModal
        doc={legalModalDoc ? legalDocs[legalModalDoc] : null}
        onClose={() => setLegalModalDoc(null)}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 5: CONFIRMATION
// ════════════════════════════════════════════════════════════

function ConfirmationStep({ pkg, result, form, onReset }) {
  const dateObj = new Date(result.slot_date + "T00:00:00");
  const dayName = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][dateObj.getDay()];
  const monthName = MONTHS[dateObj.getMonth()];

  const formatTime = (t) => {
    const [h] = t.split(":");
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`;
  };
  const startStr = formatTime(result.start_time);
  const endStr = formatTime(result.end_time);

  return (
    <div style={{ padding: "0 16px 40px" }}>
      {/* Success banner */}
      <div style={{
        background: C.sage, borderRadius: 16, padding: "28px 20px", textAlign: "center",
        marginBottom: 20, color: C.white,
      }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🌿</div>
        <div style={{
          fontFamily: "'Crimson Pro'", fontSize: 22, fontWeight: 700, marginBottom: 4,
        }}>Booking Confirmed!</div>
        <div style={{
          fontFamily: "'DM Sans'", fontSize: 13, opacity: 0.9, marginBottom: 14,
        }}>Your herbal experience is reserved</div>
        <div style={{
          display: "inline-block", background: "rgba(255,255,255,0.2)",
          borderRadius: 8, padding: "8px 20px",
          fontFamily: "'DM Sans'", fontSize: 18, fontWeight: 700, letterSpacing: "0.05em",
        }}>{result.booking_ref}</div>
      </div>

      {/* Booking details card */}
      <div style={{
        background: C.white, borderRadius: 14, border: `1.5px solid ${C.sand}`,
        overflow: "hidden", marginBottom: 16,
      }}>
        <div style={{
          padding: "16px 18px", borderBottom: `1px solid ${C.sand}`,
        }}>
          <div style={{
            fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, color: C.barkLight,
            textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8,
          }}>Experience</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 26 }}>{pkg.icon}</span>
            <div>
              <div style={{ fontFamily: "'Crimson Pro'", fontSize: 17, fontWeight: 600, color: C.forest }}>
                {result.package_name}
              </div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight }}>
                {pkg.duration} minutes • {result.num_participants} guest{result.num_participants > 1 ? "s" : ""} •{" "}
                {result.instructor_group === null ? "Whole space" : `Group ${result.instructor_group}`}
                {result.is_private && " · Private"}
              </div>
            </div>
          </div>
        </div>

        {[
          { icon: <ClockSVG size={16} color={C.sage}/>, label: "Date & Time", value: `${dayName}, ${monthName} ${dateObj.getDate()} • ${startStr} – ${endStr}` },
          { icon: <MapPinSVG size={16} color={C.sage}/>, label: "Location", value: "44/3 Si Phum Soi 9, Chiang Mai Old City", isLocation: true },
          { icon: <UsersSVG size={16} color={C.sage}/>, label: "Guest", value: form.name },
        ].map((row, i) => (
          <div key={i} style={{
            padding: "14px 18px", borderBottom: `1px solid ${C.sand}`,
            display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <div style={{ marginTop: 2, flexShrink: 0 }}>{row.icon}</div>
            <div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.barkLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {row.label}
              </div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 14, color: C.forest, marginTop: 2 }}>
                {row.value}
              </div>
              {row.isLocation && (
                <a
                  href={SHOP_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    marginTop: 8, padding: "8px 14px", borderRadius: 20,
                    background: C.sageLight, border: `1px solid rgba(107,143,113,0.3)`,
                    fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600,
                    color: C.sageDark, textDecoration: "none",
                  }}
                >
                  <MapPinSVG size={13} color={C.sageDark}/> Get Directions ↗
                </a>
              )}
            </div>
          </div>
        ))}

        {/* Price summary */}
        <div style={{ padding: "16px 18px", background: C.goldLight }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, color: C.barkLight, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Total
            </span>
            <span style={{ fontFamily: "'Crimson Pro'", fontSize: 24, fontWeight: 700, color: C.gold }}>
              ฿{result.total_price_thb.toLocaleString()}
            </span>
          </div>
          {(() => {
            const charged = chargedParticipants(result.num_participants, result.is_private);
            if (charged <= 1) return null;
            return (
              <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight, textAlign: "right", marginTop: 2 }}>
                ฿{pkg.price.toLocaleString()} × {charged} guest{charged > 1 ? "s" : ""}
                {charged !== result.num_participants && ` (${result.num_participants} attending, ${charged}-guest minimum)`}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Pay on arrival notice */}
      <div style={{
        background: C.sageLight, borderRadius: 14, padding: "18px 18px",
        border: `1px solid rgba(107,143,113,0.2)`, marginBottom: 16,
      }}>
        <div style={{
          fontFamily: "'Crimson Pro'", fontSize: 16, fontWeight: 600, color: C.forest, marginBottom: 8,
        }}>Pay When You Arrive</div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: 13, color: C.bark, lineHeight: 1.6 }}>
          No prepayment needed. Pay on the spot at our workshop:
        </div>
        <div style={{
          display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap",
        }}>
          {["Cash (THB)", "PromptPay QR", "WeChat Pay"].map(m => (
            <span key={m} style={{
              fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 500,
              background: C.white, border: `1px solid rgba(107,143,113,0.25)`,
              borderRadius: 20, padding: "5px 12px", color: C.forest,
            }}>{m}</span>
          ))}
        </div>
      </div>

      {/* Takeaway reminder */}
      <div style={{
        background: C.white, borderRadius: 14, border: `1.5px solid ${C.sand}`,
        padding: "16px 18px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <GiftSVG size={16}/>
          <span style={{ fontFamily: "'Crimson Pro'", fontSize: 15, fontWeight: 600, color: C.forest }}>
            You'll Take Home
          </span>
        </div>
        <div style={{ fontFamily: "'DM Sans'", fontSize: 13, color: C.bark, lineHeight: 1.6 }}>
          {pkg.takeaway}
        </div>
      </div>

      {/* Book another */}
      <button onClick={onReset} style={{
        width: "100%", marginTop: 20, padding: "14px 24px", borderRadius: 14,
        background: "transparent", border: `1.5px solid ${C.sage}`,
        color: C.sage, fontFamily: "'DM Sans'", fontSize: 15, fontWeight: 600,
        cursor: "pointer", letterSpacing: "0.01em",
      }}>
        Book Another Experience
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN APP
// ════════════════════════════════════════════════════════════

export default function BookingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState(null);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [participants, setParticipants] = useState(1);
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", phoneCountryCode: "+66", notes: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "paypal" | "later" | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [confirmingPayLater, setConfirmingPayLater] = useState(false);

  // `result` here is the booking as create_booking() returns it — which
  // now ALWAYS starts status: 'pending_payment' (see migration
  // add_online_payment_integration). It's created the moment the
  // customer reaches the Payment step (2→3 transition below), not on
  // final confirm — that's what actually reserves the slot while they
  // pay. Every field on it (package_name, slot_date, times, price...)
  // stays valid all the way through to ConfirmationStep; only `status`
  // changes, so step 4 just overrides that one field once payment
  // actually succeeds rather than re-fetching anything.
  const { submit, submitting, error: submitError, result, reset: resetBooking } = useCreateBooking();

  // Fetch the live product catalog once on mount. Presentation metadata
  // (icon/tagline/accent) is merged in client-side via mergePackage();
  // everything else (name, price, duration, calendar_type) is what's
  // actually in the database right now.
  useEffect(() => {
    let cancelled = false;
    setPackagesLoading(true);
    getPackages()
      .then(dbPackages => {
        if (cancelled) return;
        setPackages(dbPackages.map(mergePackage));
        setPackagesError(null);
      })
      .catch(err => {
        if (cancelled) return;
        setPackagesError(err.message || "Couldn't load workshops. Please refresh.");
      })
      .finally(() => {
        if (!cancelled) setPackagesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const pkg = packages.find(p => p.slug === selectedPkg);

  // Switching Private → Group can leave `participants` above the
  // group soft cap (6) — clamp down rather than leaving an invalid
  // count silently in state. Group → Private never needs clamping
  // (6 is always ≤ 16).
  const handleIsPrivateChange = useCallback((next: boolean) => {
    setIsPrivate(next);
    if (!next) setParticipants(p => Math.min(p, 6));
  }, []);

  const updateForm = useCallback((field: string, value: any) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({
      ...e,
      [field]: null,
      submit: null,
    }));
  }, []);

  const handleSelectPaymentMethod = useCallback((method: "stripe" | "paypal" | "later") => {
    setPaymentMethod(method);
    setErrors(e => ({ ...e, payment: null, submit: null }));
  }, []);

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Please enter your name";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Please enter a valid email";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Only the Pay Later path is validated/confirmed through this — see
  // PaymentStep's own comment: Stripe/PayPal complete inline via their
  // own embedded widgets and call handleOnlinePaymentSuccess directly.
  const validatePayLater = () => {
    const e: Record<string, string> = {};
    if (!agreedToTerms) e.terms = "Please agree to the Terms & Conditions to continue";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (step === 2) {
      if (!validateStep3()) return;

      // Reserve the slot NOW, before payment — this is what actually
      // prevents someone else from taking it while this customer is
      // still on the Payment step (spec /book §5). The booking starts
      // 'pending_payment'; it only becomes 'confirmed' once payment is
      // verified server-side (or Pay Later is explicitly chosen below).
      try {
        await submit({
          package_slug: pkg.slug,
          date: selectedDate,
          start_time: selectedTime,
          num_participants: participants,
          is_private: isPrivate,
          customer_name: form.name,
          customer_email: form.email || undefined,
        customer_phone: form.phone ? `${form.phoneCountryCode}${form.phone.replace(/^0+/, '')}` : undefined,
          customer_notes: form.notes || undefined,
          has_minors: false, // no dedicated "group includes a minor" field in this
          // form — per spec, kids under 12 booking with a participating parent is
          // normal and welcome, not a special case worth flagging structurally.
          // Minor-in-group info currently reaches staff via the free-text notes
          // field, same as the admin dashboard's existing mock data pattern
          // ("Family group — 1 child (age 14)"). Add a real field here if/when
          // this needs to be structured data instead of a note staff read manually.
        });
      } catch (err: any) {
        // Common case: someone else took the last spot while this person
        // was filling out the form (CAPACITY_FULL) — they need to go back
        // and pick a different time, not just retry the same submission.
        setErrors(e => ({ ...e, submit: err.message || "Something went wrong. Please try again." }));
        return;
      }
      setStep(3);
      window.scrollTo?.({ top: 0, behavior: "smooth" });
      return;
    }

    if (step === 3) {
      // The sticky CTA only ever drives Pay Later — Stripe/PayPal
      // finish inline (see handleOnlinePaymentSuccess) and this branch
      // is unreachable for them since the CTA is hidden in that case.
      if (!validatePayLater() || !result) return;

      setConfirmingPayLater(true);
      try {
        await confirmPayLaterBooking(result.booking_ref);
      } catch (err: any) {
        setErrors(e => ({ ...e, submit: err.message || "Something went wrong. Please try again." }));
        setConfirmingPayLater(false);
        return;
      }
      setConfirmingPayLater(false);
      setStep(4);
      window.scrollTo?.({ top: 0, behavior: "smooth" });
      return;
    }

    setStep(s => s + 1);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  // Called by the embedded Stripe/PayPal widgets once THEY confirm
  // payment succeeded server-side (StripeCardForm/PayPalCheckoutButtons
  // only ever call this after their own API routes report success —
  // never optimistically from a client-only signal).
  const handleOnlinePaymentSuccess = useCallback(() => {
    setStep(4);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  }, []);

  const handleBack = () => {
    if (step === 1) { setSelectedDate(null); setSelectedTime(null); }
    if (step === 3 && result?.booking_ref) {
      // Backing out of payment deliberately — free the slot right now
      // instead of leaving it locked until the 30-min abandonment
      // cleanup. Best-effort: if this fails, the cron still catches it.
      cancelBooking(result.booking_ref).catch(() => {});
      resetBooking();
      setPaymentMethod(null);
      setAgreedToTerms(false);
    }
    setStep(s => s - 1);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  // Only confirms when there's actually something to lose: steps 2–3
  // are "Your Details" and "Payment" (name/email/phone typed in, or a
  // payment method picked, but not yet submitted). Steps 0–1 haven't
  // collected personal info yet, and step 4 only renders after a
  // booking already succeeded, so leaving from any of those is safe
  // without asking.
  const handleExit = () => {
    if ((step === 2 || step === 3) && !window.confirm("Leave without finishing your booking? Your details won't be saved.")) {
      return;
    }
    if (step === 3 && result?.booking_ref) {
      cancelBooking(result.booking_ref).catch(() => {});
    }
    router.push('/');
  };

  const handleReset = () => {
    setStep(0); setSelectedPkg(null); setParticipants(1); setIsPrivate(false);
    setSelectedDate(null); setSelectedTime(null);
    setForm({ name: "", email: "", phone: "", phoneCountryCode: "+66", notes: "" });
    setErrors({}); setPaymentMethod(null); setAgreedToTerms(false); setConfirmingPayLater(false); resetBooking();
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const canContinue = [
    selectedPkg !== null,
    selectedDate !== null && selectedTime !== null,
    true, // step 3 (Your Details) validated on click
    // Stripe/PayPal complete via their own embedded widget, not this
    // CTA — it's only ever meaningful (and shown) for Pay Later.
    paymentMethod === "later" && agreedToTerms,
    true,
  ][step];

  const ctaLabel = [
    "Continue to Date & Time",
    "Continue to Your Details",
    submitting ? "Reserving your spot…" : "Continue to Payment",
    confirmingPayLater ? "Confirming…" : "Confirm Booking",
    null,
  ][step];

  return (
    <div style={{
      maxWidth: 480, margin: "0 auto", minHeight: "100vh",
      background: C.parchment, fontFamily: "'DM Sans', sans-serif",
      position: "relative",
    }}>
      {/* Google Fonts. dangerouslySetInnerHTML, not a text child — the
          URL below has `&` and (unquoted now) no `'` either, but React
          HTML-escapes text children in every element the same way,
          while <style> is a "raw text" element browsers never
          entity-decode. A literal `&amp;` server-rendered there
          doesn't match the raw `&` client-side hydration writes, and
          that mismatch was silently forcing this whole page to
          discard its SSR HTML and re-render from scratch on every
          load — including whatever the user had already clicked in
          the ~1 React tick before the swap happened. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @import url(https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap);
            * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
            input:focus, textarea:focus { border-color: ${C.sage} !important; box-shadow: 0 0 0 3px ${C.sageLight}; }
            button:active { transform: scale(0.98); }
            ::placeholder { color: ${C.barkLight}; opacity: 0.6; }
          `,
        }}
      />

      {/* Header — deliberately minimal: just the site identity (left,
          links home) and an exit control (right). No Home/Contact/Blog
          nav here, unlike SiteHeader — this is a checkout-style flow,
          not a marketing page. Per-step "Back" (previous step, not
          exit) lives in its own row below instead of cluttering this
          one with a third element. */}
      <div style={{ background: C.white, padding: "12px 16px", borderBottom: `1px solid ${C.sand}` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{
            display: "flex", alignItems: "center", gap: 8, textDecoration: "none",
            fontFamily: "'Crimson Pro'", fontSize: 17, fontWeight: 700, color: C.forest,
          }}>
            <img
              src="/uri-herbs-logo.jpg"
              alt=""
              style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }}
            />
            Uri Herbs Workshop
          </Link>
          <button
            onClick={handleExit}
            aria-label="Close booking"
            style={{
              background: "none", border: "none", cursor: "pointer", padding: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <CloseSVG/>
          </button>
        </div>
      </div>

      {step > 0 && step < 4 && (
        <div style={{ padding: "10px 16px 0" }}>
          <button onClick={handleBack} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 4,
            fontFamily: "'DM Sans'", fontSize: 14, color: C.sage, fontWeight: 500, padding: "4px 0",
          }}>
            <ChevronLeftSVG/> Back
          </button>
        </div>
      )}

      {/* Step Progress */}
      {step < 4 && <StepVine currentStep={step}/>}

      {/* Section Title */}
      <div style={{ padding: "20px 16px 14px" }}>
        <h2 style={{
          fontFamily: "'Crimson Pro'", fontSize: 24, fontWeight: 700,
          color: C.forest, margin: 0, lineHeight: 1.2,
        }}>
          {["Choose Your Experience", "Pick a Date & Time", "Your Details", "Payment", ""][step]}
        </h2>
        {step < 4 && (
          <p style={{
            fontFamily: "'DM Sans'", fontSize: 13, color: C.barkLight,
            margin: "6px 0 0", lineHeight: 1.4,
          }}>
            {[
              "Hands-on herbal workshops in Chiang Mai's Old City",
              pkg ? `Select when you'd like to join ${pkg.name}` : "",
              "Almost there — just a few details to reserve your spot",
              "Choose how you'd like to pay",
            ][step]}
          </p>
        )}
      </div>

      {/* Step Content */}
      {step === 0 && (
        packagesLoading ? (
          <div style={{ padding: "40px 16px", textAlign: "center", fontFamily: "'DM Sans'", fontSize: 14, color: C.barkLight }}>
            Loading workshops…
          </div>
        ) : packagesError ? (
          <div style={{ padding: "0 16px" }}>
            <div style={{
              background: C.coralLight, borderRadius: 12, padding: "16px", textAlign: "center",
              fontFamily: "'DM Sans'", fontSize: 14, color: C.coral,
            }}>{packagesError}</div>
          </div>
        ) : (
          <PackageStep
            packages={packages}
            selected={selectedPkg} onSelect={setSelectedPkg}
            participants={participants} onParticipantsChange={setParticipants}
            isPrivate={isPrivate} onIsPrivateChange={handleIsPrivateChange}
          />
        )
      )}
      {step === 1 && pkg && (
        <DateTimeStep
          selectedDate={selectedDate} onSelectDate={(d) => { setSelectedDate(d); setSelectedTime(null); }}
          selectedTime={selectedTime} onSelectTime={setSelectedTime}
          pkg={pkg} participants={participants} isPrivate={isPrivate}
        />
      )}
      {step === 2 && (
        <CustomerStep form={form} onChange={updateForm} errors={errors}/>
      )}
      {step === 3 && (
        <PaymentStep
          paymentMethod={paymentMethod} onSelectMethod={handleSelectPaymentMethod}
          agreedToTerms={agreedToTerms} onToggleTerms={() => setAgreedToTerms(a => !a)}
          errors={errors} booking={result} onOnlinePaymentSuccess={handleOnlinePaymentSuccess}
        />
      )}
      {(step === 2 || step === 3) && errors.submit && (
        <div style={{ padding: "0 16px", marginTop: -8 }}>
          <div style={{
            background: C.coralLight, border: `1px solid rgba(192,122,110,0.3)`,
            borderRadius: 10, padding: "12px 14px",
            fontFamily: "'DM Sans'", fontSize: 13, color: C.coral, lineHeight: 1.5,
          }}>
            {errors.submit}
          </div>
        </div>
      )}
      {step === 4 && pkg && result && (
        <ConfirmationStep
          // step 4 only ever renders after Pay Later / Stripe / PayPal
          // actually confirmed payment server-side — safe to show
          // 'confirmed' here without re-fetching; every other field on
          // `result` was already correct since create_booking().
          pkg={pkg} result={{ ...result, status: "confirmed" }} form={form}
          onReset={handleReset}
        />
      )}

      {/* Sticky bottom CTA — hidden once Stripe/PayPal is picked at the
          Payment step, since those complete via their own embedded
          widget instead of this generic button. */}
      {step < 4 && !(step === 3 && (paymentMethod === "stripe" || paymentMethod === "paypal")) && (
        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 480,
          background: "linear-gradient(transparent, rgba(248,245,239,0.95) 20%)",
          padding: "20px 16px 24px",
        }}>
          <button
            onClick={handleNext}
            disabled={!canContinue || submitting || confirmingPayLater}
            style={{
              width: "100%", padding: "16px 24px", borderRadius: 14, border: "none",
              background: (canContinue && !submitting && !confirmingPayLater) ? C.sage : C.sand,
              color: (canContinue && !submitting && !confirmingPayLater) ? C.white : C.barkLight,
              fontFamily: "'DM Sans'", fontSize: 16, fontWeight: 700,
              cursor: (canContinue && !submitting && !confirmingPayLater) ? "pointer" : "default",
              boxShadow: (canContinue && !submitting && !confirmingPayLater) ? "0 4px 16px rgba(107,143,113,0.3)" : "none",
              transition: "all 0.2s",
              letterSpacing: "0.01em",
            }}
          >
            {ctaLabel}
          </button>
        </div>
      )}
    </div>
  );
}
