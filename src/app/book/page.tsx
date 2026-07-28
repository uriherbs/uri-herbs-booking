'use client';

import { useState, useMemo, useCallback, useEffect } from "react";
import { getPackages } from "@/lib/booking-service";
import { useAvailableSlots, useCalendarAvailability, useCreateBooking } from "@/lib/hooks";

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

const STEP_LABELS = ["Experience", "Date & Time", "Your Details", "Confirmation"];

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

function PackageCard({ pkg, selected, onSelect, participants }) {
  const isSelected = selected === pkg.slug;
  const totalPrice = pkg.price * participants;
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
            {participants > 1 && (
              <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: C.barkLight }}>
                ฿{pkg.price.toLocaleString()} × {participants}
              </div>
            )}
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

function PackageStep({ packages, selected, onSelect, participants, onParticipantsChange }) {
  const categories = [
    { key: "single", title: "Single Workshop", subtitle: "1 Hour" },
    { key: "combo", title: "Combo Packages", subtitle: "2 Hours" },
    { key: "journey", title: "The Full Journey", subtitle: "3 Hours • All workshops included" },
    { key: "aromatherapy", title: "Aromatherapy Mastery", subtitle: "2 Hours • Mon–Thu only" },
  ];

  return (
    <div style={{ padding: "0 16px 100px" }}>
      {/* Participant counter */}
      <div style={{
        background: C.white, borderRadius: 14, padding: "16px 18px",
        border: `1.5px solid ${C.sand}`, marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 16, fontWeight: 600, color: C.forest }}>
            Number of Guests
          </div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight, marginTop: 2 }}>
            Max 12 per session
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
            onClick={() => onParticipantsChange(Math.min(12, participants + 1))}
            disabled={participants >= 12}
            style={{
              width: 36, height: 36, borderRadius: "50%",
              border: `1.5px solid ${participants >= 12 ? C.sand : C.sage}`,
              background: participants >= 12 ? "transparent" : C.sage,
              cursor: participants >= 12 ? "default" : "pointer",
              fontSize: 20, color: participants >= 12 ? C.sand : C.white,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>+</button>
        </div>
      </div>

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
                onSelect={onSelect} participants={participants}
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

function MiniCalendar({ selectedDate, onSelectDate, selectedPkg, participants }) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  // Visible month's date range, sent to the server in one call
  const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { days: liveDays, loading: calLoading } = useCalendarAvailability(
    monthStart, monthEnd, selectedPkg?.slug || null, participants
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

function TimeSlotPicker({ selectedDate, selectedTime, onSelectTime, pkg, participants }) {
  const { slots, loading, error } = useAvailableSlots(selectedDate, pkg?.slug || null, participants);

  if (!selectedDate) return null;

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
            const pct = ((12 - remaining) / 12) * 100;
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
                    {available && group && (
                      <div style={{
                        fontFamily: "'DM Sans'", fontSize: 11, color: C.sage, marginTop: 3,
                        display: "flex", alignItems: "center", gap: 4,
                      }}>
                        <UsersSVG size={12} color={C.sage}/>
                        Group {group} {group === "A" ? "(with Mali)" : "(Instructor B)"}
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
                  <span>{12 - remaining} booked</span>
                  <span>12 max</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DateTimeStep({ selectedDate, onSelectDate, selectedTime, onSelectTime, pkg, participants }) {
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
            {pkg.name}
          </div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight }}>
            {pkg.duration} min • {participants} guest{participants > 1 ? "s" : ""} • ฿{(pkg.price * participants).toLocaleString()}
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
      />

      <TimeSlotPicker
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onSelectTime={onSelectTime}
        pkg={pkg}
        participants={participants}
      />
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 3: CUSTOMER DETAILS
// ════════════════════════════════════════════════════════════

function CustomerStep({ form, onChange, errors }) {
  const inputStyle = (hasError) => ({
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
      <div style={{
        background: C.white, borderRadius: 14, border: `1.5px solid ${C.sand}`,
        padding: "20px 18px", display: "flex", flexDirection: "column", gap: 18,
      }}>
        <div>
          <label style={labelStyle}>Full Name *</label>
          <input
            type="text" placeholder="e.g. Sophie Martin"
            value={form.name} onChange={e => onChange("name", e.target.value)}
            style={inputStyle(errors.name) as React.CSSProperties}  
          />
          {errors.name && <div style={errorStyle}>{errors.name}</div>}
        </div>

        <div>
          <label style={labelStyle}>Email</label>
          <input
            type="email" placeholder="For booking confirmation (optional)"
            value={form.email} onChange={e => onChange("email", e.target.value)}
            style={inputStyle(errors.email)}
          />
          {errors.email && <div style={errorStyle}>{errors.email}</div>}
        </div>

        <div>
          <label style={labelStyle}>Phone / WhatsApp / LINE</label>
          <input
            type="tel" placeholder="For day-of contact (optional)"
            value={form.phone} onChange={e => onChange("phone", e.target.value)}
            style={inputStyle(false)}
          />
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

        {/* Age acknowledgment */}
        <div style={{
          background: C.mist, borderRadius: 10, padding: "14px 16px",
        }}>
          <label style={{
            display: "flex", gap: 12, cursor: "pointer", alignItems: "flex-start",
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
              border: form.ageConfirmed ? `none` : `1.5px solid ${errors.age ? C.coral : C.sand}`,
              background: form.ageConfirmed ? C.sage : C.white,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.15s",
            }}
              onClick={(e) => { e.preventDefault(); onChange("ageConfirmed", !form.ageConfirmed); }}
            >
              {form.ageConfirmed && <CheckSVG size={14}/>}
            </div>
            <div>
              <span style={{
                fontFamily: "'DM Sans'", fontSize: 13, color: C.forest, fontWeight: 500, lineHeight: 1.5,
              }}
                onClick={(e) => { e.preventDefault(); onChange("ageConfirmed", !form.ageConfirmed); }}
              >
                I confirm all guests are <strong>12 years or older</strong>. Guests aged 12–17 are accompanied by an adult in our group.
              </span>
              {errors.age && <div style={errorStyle}>{errors.age}</div>}
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// STEP 4: CONFIRMATION
// ════════════════════════════════════════════════════════════

function ConfirmationStep({ pkg, result, form, onReset }) {
  // `result` is the real BookingConfirmation returned by create_booking() —
  // using its fields (rather than re-deriving from client-side selectedDate/
  // selectedTime/participants) means this screen always reflects what was
  // actually persisted, including the server-assigned instructor_group and
  // the server-computed total_price_thb, not a client guess of either.
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
                {pkg.duration} minutes • {result.num_participants} guest{result.num_participants > 1 ? "s" : ""} • Group {result.instructor_group}
              </div>
            </div>
          </div>
        </div>

        {[
          { icon: <ClockSVG size={16} color={C.sage}/>, label: "Date & Time", value: `${dayName}, ${monthName} ${dateObj.getDate()} • ${startStr} – ${endStr}` },
          { icon: <MapPinSVG size={16} color={C.sage}/>, label: "Location", value: "44/3 Si Phum Soi 9, Chiang Mai Old City" },
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
          {result.num_participants > 1 && (
            <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight, textAlign: "right", marginTop: 2 }}>
              ฿{pkg.price.toLocaleString()} × {result.num_participants} guests
            </div>
          )}
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
  const [step, setStep] = useState(0);
  const [packages, setPackages] = useState([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [packagesError, setPackagesError] = useState(null);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [participants, setParticipants] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "", ageConfirmed: false });
  const [errors, setErrors] = useState({});

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

  const updateForm = useCallback((field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: null, age: field === "ageConfirmed" ? null : e.age, submit: null }));
  }, []);

  const validateStep3 = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Please enter your name";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Please enter a valid email";
    if (!form.ageConfirmed) e.age = "Please confirm the age requirement";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (step === 2) {
      if (!validateStep3()) return;

      try {
        await submit({
          package_slug: pkg.slug,
          date: selectedDate,
          start_time: selectedTime,
          num_participants: participants,
          customer_name: form.name,
          customer_email: form.email || undefined,
          customer_phone: form.phone || undefined,
          customer_notes: form.notes || undefined,
          has_minors: false, // no dedicated "group includes a minor" field in this form yet —
          // ageConfirmed is required for EVERY booking (not just ones with minors), so it
          // can't be reused as this signal. Minor-in-group info currently reaches staff via
          // the free-text notes field, same as the admin dashboard's existing mock data
          // pattern ("Family group — 1 child (age 14)"). Add a real checkbox here if/when
          // this needs to be structured data instead of a note staff read manually.
        });
      } catch (err) {
        // useCreateBooking already captured this in `submitError` — surface
        // it inline near the button rather than silently failing to advance.
        // Common case: someone else took the last spot while this person
        // was filling out the form (CAPACITY_FULL) — they need to go back
        // and pick a different time, not just retry the same submission.
        setErrors(e => ({ ...e, submit: err.message || "Something went wrong. Please try again." }));
        return;
      }
    }
    setStep(s => s + 1);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    if (step === 1) { setSelectedDate(null); setSelectedTime(null); }
    setStep(s => s - 1);
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const handleReset = () => {
    setStep(0); setSelectedPkg(null); setParticipants(1);
    setSelectedDate(null); setSelectedTime(null);
    setForm({ name: "", email: "", phone: "", notes: "", ageConfirmed: false });
    setErrors({}); resetBooking();
    window.scrollTo?.({ top: 0, behavior: "smooth" });
  };

  const canContinue = [
    selectedPkg !== null,
    selectedDate !== null && selectedTime !== null,
    true, // step 3 validated on click
    true,
  ][step];

  const ctaLabel = [
    "Continue to Date & Time",
    "Continue to Your Details",
    submitting ? "Confirming…" : "Confirm Booking",
    null,
  ][step];

  return (
    <div style={{
      maxWidth: 480, margin: "0 auto", minHeight: "100vh",
      background: C.parchment, fontFamily: "'DM Sans', sans-serif",
      position: "relative",
    }}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        input:focus, textarea:focus { border-color: ${C.sage} !important; box-shadow: 0 0 0 3px ${C.sageLight}; }
        button:active { transform: scale(0.98); }
        ::placeholder { color: ${C.barkLight}; opacity: 0.6; }
      `}</style>

      {/* Header */}
      <div style={{
        background: C.white, padding: "16px 16px 0",
        borderBottom: step === 0 ? `1px solid ${C.sand}` : "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {step > 0 && step < 3 ? (
            <button onClick={handleBack} style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
              fontFamily: "'DM Sans'", fontSize: 14, color: C.sage, fontWeight: 500, padding: "4px 0",
            }}>
              <ChevronLeftSVG/> Back
            </button>
          ) : <div/>}
          <div style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "'Crimson Pro'", fontSize: 20, fontWeight: 700, color: C.forest,
              display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
            }}>
              <LeafSVG size={18} color={C.sage}/> Uri Herbs
            </div>
          </div>
          <div style={{ width: 60 }}/>
        </div>
      </div>

      {/* Step Progress */}
      {step < 3 && <StepVine currentStep={step}/>}

      {/* Section Title */}
      <div style={{ padding: "20px 16px 14px" }}>
        <h2 style={{
          fontFamily: "'Crimson Pro'", fontSize: 24, fontWeight: 700,
          color: C.forest, margin: 0, lineHeight: 1.2,
        }}>
          {["Choose Your Experience", "Pick a Date & Time", "Your Details", ""][step]}
        </h2>
        {step < 3 && (
          <p style={{
            fontFamily: "'DM Sans'", fontSize: 13, color: C.barkLight,
            margin: "6px 0 0", lineHeight: 1.4,
          }}>
            {[
              "Hands-on herbal workshops in Chiang Mai's Old City",
              pkg ? `Select when you'd like to join ${pkg.name}` : "",
              "Almost there — just a few details to reserve your spot",
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
          />
        )
      )}
      {step === 1 && pkg && (
        <DateTimeStep
          selectedDate={selectedDate} onSelectDate={(d) => { setSelectedDate(d); setSelectedTime(null); }}
          selectedTime={selectedTime} onSelectTime={setSelectedTime}
          pkg={pkg} participants={participants}
        />
      )}
      {step === 2 && (
        <>
          <CustomerStep form={form} onChange={updateForm} errors={errors}/>
          {errors.submit && (
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
        </>
      )}
      {step === 3 && pkg && result && (
        <ConfirmationStep
          pkg={pkg} result={result} form={form}
          onReset={handleReset}
        />
      )}

      {/* Sticky bottom CTA */}
      {step < 3 && (
        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 480,
          background: "linear-gradient(transparent, rgba(248,245,239,0.95) 20%)",
          padding: "20px 16px 24px",
        }}>
          <button
            onClick={handleNext}
            disabled={!canContinue || submitting}
            style={{
              width: "100%", padding: "16px 24px", borderRadius: 14, border: "none",
              background: (canContinue && !submitting) ? C.sage : C.sand,
              color: (canContinue && !submitting) ? C.white : C.barkLight,
              fontFamily: "'DM Sans'", fontSize: 16, fontWeight: 700,
              cursor: (canContinue && !submitting) ? "pointer" : "default",
              boxShadow: (canContinue && !submitting) ? "0 4px 16px rgba(107,143,113,0.3)" : "none",
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
