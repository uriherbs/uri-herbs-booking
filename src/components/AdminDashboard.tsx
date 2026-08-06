'use client';

import React, { useState, useMemo } from "react";
import {
  useAdminDayData,
  useAdminMonthSummary,
  adminUpdateBookingStatus,
  adminToggleSlotBlock,
} from "@/lib/hooks";

// ════════════════════════════════════════════════════════════
// DESIGN TOKENS (shared with booking flow, slightly cooler for admin)
// ════════════════════════════════════════════════════════════

const C = {
  sage:       "#6B8F71",
  sageDark:   "#4A7050",
  sageLight:  "#E7EFEA",
  sagePale:   "#F2F7F3",
  forest:     "#2D4639",
  parchment:  "#F5F2EC",
  white:      "#FFFFFF",
  gold:       "#A89068",
  goldLight:  "#F5F0E5",
  goldPale:   "#FAF7F0",
  bark:       "#5C4A3D",
  barkLight:  "#8A7668",
  sand:       "#E8E2D8",
  mist:       "#F0EDE6",
  coral:      "#C07A6E",
  coralLight: "#FCEAE6",
  coralPale:  "#FFF5F3",
  blue:       "#5B7FA6",
  blueLight:  "#E8F0F8",
};

// ════════════════════════════════════════════════════════════
// SCHEDULE CONSTANTS (fixed operating hours — the actual truth
// for which slots exist lives server-side in package_time_rules;
// this is just the display grid the dashboard renders bookings into)
// ════════════════════════════════════════════════════════════

const HERBAL_BLOCKS = [
  { time: "10:00", end: "11:00", session: "morning" },
  { time: "11:00", end: "12:00", session: "morning" },
  { time: "12:00", end: "13:00", session: "morning" },
  { time: "14:00", end: "15:00", session: "afternoon" },
  { time: "15:00", end: "16:00", session: "afternoon" },
  { time: "16:00", end: "17:00", session: "afternoon" },
];

// Aromatherapy's valid block(s) depend on day of week — Mon/Wed 14:00,
// Tue/Thu 11:00, closed Fri–Sun. Mirrors package_time_rules exactly
// (see schedule-sync-migration.sql) so the admin view never disagrees
// with what customers can actually book.
function getAromaBlocksForDate(dateObj) {
  const dow = dateObj.getDay(); // 0=Sun..6=Sat
  if (dow === 1 || dow === 3) return [{ time: "14:00", end: "15:00" }, { time: "15:00", end: "16:00" }];
  if (dow === 2 || dow === 4) return [{ time: "11:00", end: "12:00" }, { time: "12:00", end: "13:00" }];
  return [];
}

// Presentation-only icon lookup, matching the customer booking flow
const ICON_MAP = {
  "single-tea": "🍵",
  "single-inhaler": "🌿",
  "single-massage-ball": "🌾",
  "combo-tea-inhaler": "🍵🌿",
  "combo-inhaler-ball": "🌿🌾",
  "combo-tea-ball": "🍵🌾",
  "journey-full": "✦",
  "skincare-aromatherapy": "❋",
};

// Given a booking row (with start_time + package duration), compute
// which hourly grid blocks it occupies — same math as the booking
// engine's get_required_blocks(), done client-side for display grouping.
function computeBlocks(startTime, durationMinutes) {
  const grid = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00"];
  const idx = grid.indexOf(startTime.slice(0, 5));
  const n = Math.round(durationMinutes / 60);
  if (idx === -1) return [startTime.slice(0, 5)];
  return grid.slice(idx, idx + n);
}

// Maps a raw DB booking row (+ its joined package) into the shape
// the presentational components below expect.
function mapBooking(row) {
  const pkg = row.packages;
  return {
    id: row.id,
    ref: row.booking_ref,
    package: pkg?.name || "Workshop",
    pkgSlug: pkg?.slug,
    icon: ICON_MAP[pkg?.slug] || "🌿",
    duration: pkg?.duration_minutes || 60,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    blocks: computeBlocks(row.start_time, pkg?.duration_minutes || 60),
    guests: row.num_participants,
    group: row.instructor_group,
    name: row.customer_name,
    email: row.customer_email || "",
    phone: row.customer_phone || "",
    notes: row.customer_notes || "",
    hasMinors: row.has_minors,
    price: row.total_price_thb,
    attendance: row.attendance_status,
    payment: row.payment_status,
    calendar: pkg?.calendar_type || "herbal",
  };
}

// ════════════════════════════════════════════════════════════
// SVG ICONS
// ════════════════════════════════════════════════════════════

const Icons = {
  leaf: (sz = 16, col = C.sage) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill={col} opacity="0.85">
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22.5C7.76 17.66 9.41 12.67 18 11.18V14C21.78 10.58 20 2 20 2S13.21 4.58 17 8Z"/>
    </svg>
  ),
  check: (sz = 16, col = "#fff") => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="3" strokeLinecap="round"><path d="M5 12l5 5L19 7"/></svg>
  ),
  x: (sz = 14, col = C.coral) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
  ),
  chevDown: (col = C.forest) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
  ),
  chevUp: (col = C.forest) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2"><path d="M18 15l-6-6-6 6"/></svg>
  ),
  chevLeft: (col = C.forest) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
  ),
  chevRight: (col = C.forest) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2"><path d="M9 6l6 6-6 6"/></svg>
  ),
  user: (sz = 14, col = C.barkLight) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    </svg>
  ),
  phone: (sz = 13, col = C.barkLight) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.362 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.338 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  ),
  mail: (sz = 13, col = C.barkLight) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7"/>
    </svg>
  ),
  ban: (sz = 14, col = C.coral) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
  ),
  lock: (sz = 14, col = C.barkLight) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
    </svg>
  ),
  unlock: (sz = 14, col = C.sage) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 019.9-1"/>
    </svg>
  ),
  alert: (sz = 14, col = C.gold) => (
    <svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/>
    </svg>
  ),
calendar: (sz = 16, col = C.forest) => (<svg width={sz} height={sz} viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>),
  };

// ════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ════════════════════════════════════════════════════════════

function formatTime12(t) {
  const h = parseInt(t.split(":")[0]);
  return `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? "PM" : "AM"}`;
}

// Two-tone capacity gauge: sage = Group A (1-6), gold = Group B (7-12)
function CapacityGauge({ groupA, groupB, max = 12, blocked }) {
  if (blocked) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          flex: 1, height: 8, borderRadius: 4, overflow: "hidden",
          background: `repeating-linear-gradient(135deg, ${C.sand}, ${C.sand} 3px, ${C.mist} 3px, ${C.mist} 6px)`,
        }}/>
        <span style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.barkLight, fontWeight: 600 }}>BLOCKED</span>
      </div>
    );
  }
  const pctA = (groupA / max) * 100;
  const pctB = (groupB / max) * 100;
  const total = groupA + groupB;
  return (
    <div>
      <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", background: C.mist }}>
        {pctA > 0 && <div style={{ width: `${pctA}%`, background: C.sage, transition: "width 0.3s" }}/>}
        {pctB > 0 && <div style={{ width: `${pctB}%`, background: C.gold, transition: "width 0.3s" }}/>}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <div style={{ display: "flex", gap: 10, fontSize: 11, fontFamily: "'DM Sans'", color: C.barkLight }}>
          {groupA > 0 && <span><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 2, background: C.sage, marginRight: 3, verticalAlign: "middle" }}/>A: {groupA}</span>}
          {groupB > 0 && <span><span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 2, background: C.gold, marginRight: 3, verticalAlign: "middle" }}/>B: {groupB}</span>}
        </div>
        <span style={{
          fontSize: 11, fontFamily: "'DM Sans'", fontWeight: 600,
          color: total >= max ? C.coral : total >= 9 ? C.gold : C.sage,
        }}>{total}/{max}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status, type }) {
  const configs = {
    attendance: {
      arrived: { bg: C.sageLight, color: C.sageDark, border: C.sage, label: "Arrived" },
      pending: { bg: C.goldPale, color: C.gold, border: "#D4BC8E", label: "Pending" },
      no_show: { bg: C.coralPale, color: C.coral, border: C.coral, label: "No-show" },
    },
    payment: {
      paid: { bg: C.sageLight, color: C.sageDark, border: C.sage, label: "Paid" },
      unpaid: { bg: C.coralPale, color: C.coral, border: "#E0A89E", label: "Unpaid" },
    },
  };
  const cfg = configs[type]?.[status];
  if (!cfg) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 20,
      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
      fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
    }}>{cfg.label}</span>
  );
}

// ════════════════════════════════════════════════════════════
// BOOKING ROW — individual participant with action toggles
// ════════════════════════════════════════════════════════════

function BookingRow({ booking, onUpdate }) {
  const [expanded, setExpanded] = useState(false);

  const cycleAttendance = () => {
    const next = { pending: "arrived", arrived: "no_show", no_show: "pending" };
    onUpdate(booking.id, "attendance", next[booking.attendance]);
  };

  const togglePayment = () => {
    onUpdate(booking.id, "payment", booking.payment === "paid" ? "unpaid" : "paid");
  };

  return (
    <div style={{
      background: C.white, borderRadius: 10, border: `1px solid ${C.sand}`,
      overflow: "hidden", transition: "box-shadow 0.2s",
    }}>
      {/* Main row */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: "12px 14px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10,
        }}
      >
        {/* Group indicator */}
        <div style={{
          width: 6, height: 36, borderRadius: 3, flexShrink: 0,
          background: booking.group === "A" ? C.sage : C.gold,
        }}/>

        {/* Name & package */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontFamily: "'DM Sans'", fontSize: 14, fontWeight: 600, color: C.forest,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{booking.name}</span>
            {booking.hasMinors && (
              <span title="Group includes minors" style={{ display: "flex" }}>
                {Icons.alert(13, C.gold)}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 13 }}>{booking.icon}</span>
            <span style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight }}>
              {booking.package}
            </span>
            <span style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.barkLight }}>
              · {booking.guests} guest{booking.guests > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Quick status */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
          <StatusBadge status={booking.attendance} type="attendance"/>
          <StatusBadge status={booking.payment} type="payment"/>
        </div>

        <div style={{ flexShrink: 0, marginLeft: 2 }}>
          {expanded ? Icons.chevUp(C.barkLight) : Icons.chevDown(C.barkLight)}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{
          padding: "0 14px 14px", borderTop: `1px solid ${C.sand}`,
          paddingTop: 12,
        }}>
          {/* Booking details */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px",
            marginBottom: 14,
          }}>
            <div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: C.barkLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Ref</div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600, color: C.forest, letterSpacing: "0.02em" }}>{booking.ref}</div>
            </div>
            <div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: C.barkLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Time</div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 13, color: C.forest }}>
                {formatTime12(booking.startTime)} – {formatTime12(booking.endTime)}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: C.barkLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Group</div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: booking.group === "A" ? C.sage : C.gold }}/>
                <span style={{ fontFamily: "'DM Sans'", fontSize: 13, color: C.forest }}>
                  {booking.group === "A" ? "Group A (Mali)" : "Group B"}
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: C.barkLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Total</div>
              <div style={{ fontFamily: "'Crimson Pro'", fontSize: 16, fontWeight: 700, color: C.gold }}>
                ฿{booking.price.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Contact info */}
          {(booking.email || booking.phone) && (
            <div style={{ display: "flex", gap: 14, marginBottom: 12, flexWrap: "wrap" }}>
              {booking.email && (
                <a href={`mailto:${booking.email}`} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontFamily: "'DM Sans'", fontSize: 12, color: C.blue,
                  textDecoration: "none",
                }}>
                  {Icons.mail(12, C.blue)} {booking.email}
                </a>
              )}
              {booking.phone && (
                <a href={`tel:${booking.phone}`} style={{
                  display: "flex", alignItems: "center", gap: 5,
                  fontFamily: "'DM Sans'", fontSize: 12, color: C.blue,
                  textDecoration: "none",
                }}>
                  {Icons.phone(12, C.blue)} {booking.phone}
                </a>
              )}
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div style={{
              background: C.goldPale, borderRadius: 8, padding: "8px 12px", marginBottom: 14,
              fontFamily: "'DM Sans'", fontSize: 12, color: C.bark, lineHeight: 1.5,
              borderLeft: `3px solid ${C.gold}`,
            }}>
              {booking.notes}
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={(e) => { e.stopPropagation(); cycleAttendance(); }} style={{
              flex: 1, padding: "10px 12px", borderRadius: 8, cursor: "pointer",
              fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${booking.attendance === "arrived" ? C.sage : booking.attendance === "no_show" ? C.coral : C.sand}`,
              background: booking.attendance === "arrived" ? C.sage : booking.attendance === "no_show" ? C.coralLight : C.white,
              color: booking.attendance === "arrived" ? C.white : booking.attendance === "no_show" ? C.coral : C.bark,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              {booking.attendance === "arrived" ? Icons.check(14) :
               booking.attendance === "no_show" ? Icons.x(14, C.coral) :
               Icons.user(14, C.bark)}
              {booking.attendance === "arrived" ? "Arrived ✓" :
               booking.attendance === "no_show" ? "No-show" : "Mark Arrived"}
            </button>
            <button onClick={(e) => { e.stopPropagation(); togglePayment(); }} style={{
              flex: 1, padding: "10px 12px", borderRadius: 8, cursor: "pointer",
              fontFamily: "'DM Sans'", fontSize: 13, fontWeight: 600,
              border: `1.5px solid ${booking.payment === "paid" ? C.sage : C.coral}`,
              background: booking.payment === "paid" ? C.sageLight : C.coralPale,
              color: booking.payment === "paid" ? C.sageDark : C.coral,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              {booking.payment === "paid" ? "Paid ✓" : "Mark Paid"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// SLOT CARD — one hourly block with all its bookings
// ════════════════════════════════════════════════════════════

function SlotCard({ block, bookings, blockedSlots, onToggleBlock, onUpdateBooking }) {
  const [open, setOpen] = useState(bookings.length > 0);
  const isBlocked = blockedSlots.has(block.time);

  const groupA = bookings.filter(b => b.group === "A").reduce((s, b) => s + b.guests, 0);
  const groupB = bookings.filter(b => b.group === "B").reduce((s, b) => s + b.guests, 0);
  const total = groupA + groupB;

  const allArrived = bookings.length > 0 && bookings.every(b => b.attendance === "arrived");
  const allPaid = bookings.length > 0 && bookings.every(b => b.payment === "paid");

  return (
    <div style={{
      background: C.white, borderRadius: 14,
      border: `1.5px solid ${isBlocked ? C.coral : C.sand}`,
      overflow: "hidden",
      opacity: isBlocked ? 0.7 : 1,
      transition: "all 0.2s",
    }}>
      {/* Slot header */}
      <div
        onClick={() => !isBlocked && setOpen(!open)}
        style={{
          padding: "14px 16px", cursor: isBlocked ? "default" : "pointer",
          display: "flex", alignItems: "center", gap: 12,
        }}
      >
        {/* Time column */}
        <div style={{ minWidth: 70 }}>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 700, color: C.forest }}>
            {formatTime12(block.time)}
          </div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.barkLight }}>
            – {formatTime12(block.end)}
          </div>
        </div>

        {/* Capacity gauge */}
        <div style={{ flex: 1 }}>
          <CapacityGauge groupA={groupA} groupB={groupB} blocked={isBlocked}/>
        </div>

        {/* Quick indicators */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
          {bookings.length > 0 && (
            <div style={{
              display: "flex", flexDirection: "column", gap: 2, alignItems: "center",
            }}>
              {allArrived && <span style={{ fontSize: 10, color: C.sage }}>✓ all</span>}
              {allPaid && <span style={{ fontSize: 10, color: C.sage }}>💰 all</span>}
            </div>
          )}

          {/* Block/unblock button */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggleBlock(block.time); }}
            title={isBlocked ? "Unblock slot" : "Block slot"}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: `1px solid ${isBlocked ? C.coral : C.sand}`,
              background: isBlocked ? C.coralPale : "transparent",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {isBlocked ? Icons.lock(14, C.coral) : Icons.unlock(14, C.barkLight)}
          </button>

          {!isBlocked && bookings.length > 0 && (
            <div style={{ marginLeft: 2 }}>{open ? Icons.chevUp(C.barkLight) : Icons.chevDown(C.barkLight)}</div>
          )}
        </div>
      </div>

      {/* Booking list */}
      {open && !isBlocked && bookings.length > 0 && (
        <div style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
          {bookings.map(b => (
            <BookingRow key={b.id} booking={b} onUpdate={onUpdateBooking}/>
          ))}
        </div>
      )}

      {/* Empty state */}
      {open && !isBlocked && bookings.length === 0 && (
        <div style={{
          padding: "12px 16px 18px", textAlign: "center",
          fontFamily: "'DM Sans'", fontSize: 13, color: C.barkLight,
        }}>
          No bookings yet — 12 spots available
        </div>
      )}
    </div>
  );
}
function MonthCalendar({ initialDate, onSelectDate }) { const [viewYear, setViewYear] = useState(initialDate.getFullYear()); const [viewMonth, setViewMonth] = useState(initialDate.getMonth() + 1); const { summary, loading, error } = useAdminMonthSummary(viewYear, viewMonth); const monthLabel = new Date(viewYear, viewMonth - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }); const firstOfMonth = new Date(viewYear, viewMonth - 1, 1); const startWeekday = firstOfMonth.getDay(); const daysInMonth = new Date(viewYear, viewMonth, 0).getDate(); const todayStr = new Date().toISOString().slice(0, 10); const cells = []; for (let i = 0; i < startWeekday; i++) cells.push(null); for (let d = 1; d <= daysInMonth; d++) cells.push(d); const goPrevMonth = () => { if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }; const goNextMonth = () => { if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }; const weekdayLabels = ["S", "M", "T", "W", "T", "F", "S"]; const dotFor = (row) => { if (!row) return null; if (row.blocked_count > 0 && row.total_booked === 0) return C.barkLight; const ratio = row.total_capacity > 0 ? row.total_booked / row.total_capacity : 0; if (ratio >= 1) return C.coral; if (ratio > 0) return C.gold; return C.sageLight; }; return React.createElement("div", { style: { background: C.white, borderBottom: `1px solid ${C.sand}`, padding: "14px 16px 18px" } }, React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 } }, React.createElement("button", { onClick: goPrevMonth, style: { background: "none", border: "none", cursor: "pointer", padding: 4 } }, Icons.chevLeft()), React.createElement("div", { style: { fontFamily: "'Crimson Pro'", fontSize: 17, fontWeight: 700, color: C.forest } }, monthLabel), React.createElement("button", { onClick: goNextMonth, style: { background: "none", border: "none", cursor: "pointer", padding: 4 } }, Icons.chevRight())), React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 6 } }, weekdayLabels.map((w, i) => React.createElement("div", { key: i, style: { textAlign: "center", fontSize: 11, fontWeight: 600, color: C.barkLight } }, w))), React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 } }, cells.map((d, i) => { if (d === null) return React.createElement("div", { key: "blank-" + i }); const dateStr = viewYear + "-" + String(viewMonth).padStart(2, "0") + "-" + String(d).padStart(2, "0"); const row = summary[dateStr]; const isToday = dateStr === todayStr; const isClosed = !row; const dot = dotFor(row); return React.createElement("button", { key: dateStr, onClick: () => !isClosed && onSelectDate(new Date(viewYear, viewMonth - 1, d)), disabled: isClosed, style: { aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, border: isToday ? `1.5px solid ${C.sage}` : "1px solid transparent", borderRadius: 10, background: isToday ? C.sagePale : "transparent", cursor: isClosed ? "default" : "pointer", opacity: isClosed ? 0.35 : 1, fontFamily: "'DM Sans'" } }, React.createElement("span", { style: { fontSize: 13, fontWeight: isToday ? 700 : 500, color: C.forest } }, d), dot && React.createElement("span", { style: { width: 6, height: 6, borderRadius: "50%", background: dot } })); })), loading && React.createElement("div", { style: { textAlign: "center", fontSize: 12, color: C.barkLight, marginTop: 10 } }, "Loading\u2026"), error && React.createElement("div", { style: { textAlign: "center", fontSize: 12, color: C.coral, marginTop: 10 } }, error), React.createElement("div", { style: { display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 14, marginTop: 14, fontSize: 11, color: C.barkLight } }, React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 4 } }, React.createElement("span", { style: { width: 6, height: 6, borderRadius: "50%", background: C.sageLight, display: "inline-block" } }), "Open"), React.createElement("span", { s

// ════════════════════════════════════════════════════════════
// MAIN ADMIN DASHBOARD
// ════════════════════════════════════════════════════════════

export default function AdminDashboard({ adminName, onSignOut }) {
  const [dayOffset, setDayOffset] = useState(0);
  const [activeTab, setActiveTab] = useState("herbal");
  const [pendingAction, setPendingAction] = useState(null); // booking/slot id currently mid-request, for button disabling

  // Compute the actual calendar date from dayOffset (today + N days)
  const viewDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    return d;
  }, [dayOffset]);
  const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}-${String(viewDate.getDate()).padStart(2, "0")}`;
  const dayLabel = viewDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const { bookings: rawBookings, slots: rawSlots, loading, error, refresh } = useAdminDayData(dateStr);

  const bookings = useMemo(() => rawBookings.map(mapBooking), [rawBookings]);

  const blockedTimesByCalendar = useMemo(() => {
    const map = { herbal: new Set(), aromatherapy: new Set() };
    rawSlots.forEach(s => {
      if (s.is_blocked) map[s.calendar_type]?.add(s.start_time.slice(0, 5));
    });
    return map;
  }, [rawSlots]);

  const aromaBlocksToday = useMemo(() => getAromaBlocksForDate(viewDate), [viewDate]);

  // Compute per-block booking lists
  const herbalByBlock = useMemo(() => {
    const map = {};
    HERBAL_BLOCKS.forEach(b => { map[b.time] = []; });
    bookings.filter(b => b.calendar === "herbal").forEach(b => {
      b.blocks.forEach(block => {
        if (map[block]) map[block].push(b);
      });
    });
    return map;
  }, [bookings]);

  const aromaByBlock = useMemo(() => {
    const map = {};
    aromaBlocksToday.forEach(b => { map[b.time] = []; });
    bookings.filter(b => b.calendar === "aromatherapy").forEach(b => {
      b.blocks.forEach(block => {
        if (map[block]) map[block].push(b);
      });
    });
    return map;
  }, [bookings, aromaBlocksToday]);

  // Stats
  const stats = useMemo(() => {
    const confirmed = bookings.filter(b => b.attendance !== "no_show");
    const totalGuests = confirmed.reduce((s, b) => s + b.guests, 0);
    const totalRevenue = confirmed.reduce((s, b) => s + b.price, 0);
    const paidRevenue = confirmed.filter(b => b.payment === "paid").reduce((s, b) => s + b.price, 0);
    const arrivedGuests = confirmed.filter(b => b.attendance === "arrived").reduce((s, b) => s + b.guests, 0);
    return { bookingCount: confirmed.length, totalGuests, totalRevenue, paidRevenue, arrivedGuests };
  }, [bookings]);

  // ── Real action handlers ──
  // Realtime (wired into useAdminDayData) picks up the resulting DB
  // change and refreshes automatically — no local optimistic state
  // needed here, just surface errors if the RPC itself is rejected
  // (e.g. a non-admin session, or a booking that no longer exists).

  const handleUpdateBooking = async (id, field, value) => {
    setPendingAction(id);
    try {
      await adminUpdateBookingStatus(id, { [field]: value });
    } catch (err) {
      alert(`Couldn't update booking: ${err.message}`);
    } finally {
      setPendingAction(null);
    }
  };

  const handleToggleBlock = async (time) => {
    const isCurrentlyBlocked = blockedTimesByCalendar[activeTab]?.has(time);
    setPendingAction(time);
    try {
      await adminToggleSlotBlock(
        dateStr, time, activeTab as any, !isCurrentlyBlocked,
        !isCurrentlyBlocked ? (window.prompt("Reason for blocking (optional):") || undefined) : undefined
      );
    } catch (err) {
      alert(`Couldn't update slot: ${err.message}`);
    } finally {
      setPendingAction(null);
    }
  };

  const handleSignOut = () => {
    if (window.confirm("Sign out of the admin dashboard?")) onSignOut?.();
  };

  const currentBlocks = activeTab === "herbal" ? HERBAL_BLOCKS : aromaBlocksToday;
  const currentByBlock = activeTab === "herbal" ? herbalByBlock : aromaByBlock;

  return (
    <div style={{
      maxWidth: 600, margin: "0 auto", minHeight: "100vh",
      background: C.parchment, fontFamily: "'DM Sans', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        button:active { transform: scale(0.97); }
        a { text-decoration: none; }
      `}</style>

      {/* Header */}
      <div style={{
        background: C.forest, padding: "18px 16px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {Icons.leaf(20, "#fff")}
          <span style={{ fontFamily: "'Crimson Pro'", fontSize: 19, fontWeight: 700, color: C.white }}>
            Uri Herbs Admin
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {adminName && (
            <span style={{
              fontFamily: "'DM Sans'", fontSize: 12, color: "rgba(255,255,255,0.7)",
            }}>{adminName}</span>
          )}
          <button
            onClick={handleSignOut}
            title="Sign out"
            style={{
              background: "rgba(255,255,255,0.12)", border: "none", borderRadius: 20,
              padding: "6px 14px", cursor: "pointer",
              fontFamily: "'DM Sans'", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.85)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Day navigation */}
      <div style={{
        background: C.white, borderBottom: `1px solid ${C.sand}`,
        padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <button onClick={() => setDayOffset(d => d - 1)} disabled={dayOffset <= 0} style={{
          background: "none", border: "none", cursor: dayOffset <= 0 ? "default" : "pointer",
          opacity: dayOffset <= 0 ? 0.3 : 1, padding: 4,
        }}>{Icons.chevLeft()}</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 700, color: C.forest }}>
            {dayOffset === 0 ? "Today" : dayOffset === 1 ? "Tomorrow" : `+${dayOffset} days`}
          </div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight }}>
            {dayLabel}
          </div>
        </div>
        <button onClick={() => setDayOffset(d => d + 1)} style={{
          background: "none", border: "none", cursor: "pointer", padding: 4,
        }}>{Icons.chevRight()}</button>
      </div>

      {error && (
        <div style={{
          margin: "12px 16px 0", padding: "10px 14px", borderRadius: 10,
          background: C.coralPale, border: `1px solid rgba(192,122,110,0.3)`,
          fontFamily: "'DM Sans'", fontSize: 13, color: C.coral,
        }}>
          Couldn't load today's data: {error}. <button onClick={refresh} style={{ color: C.coral, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}>Retry</button>
        </div>
      )}

      {/* Stats bar */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr",
        gap: 8, padding: "14px 16px",
      }}>
        {[
          { label: "Bookings", value: loading ? "…" : stats.bookingCount, color: C.forest },
          { label: "Guests", value: loading ? "…" : `${stats.arrivedGuests}/${stats.totalGuests}`, color: C.sage, sub: "arrived" },
          { label: "Revenue", value: loading ? "…" : `฿${(stats.totalRevenue / 1000).toFixed(1)}k`, color: C.gold },
          { label: "Collected", value: loading ? "…" : `฿${(stats.paidRevenue / 1000).toFixed(1)}k`, color: stats.paidRevenue < stats.totalRevenue ? C.coral : C.sage },
        ].map((s, i) => (
          <div key={i} style={{
            background: C.white, borderRadius: 10, padding: "10px 8px",
            textAlign: "center", border: `1px solid ${C.sand}`,
          }}>
            <div style={{ fontFamily: "'Crimson Pro'", fontSize: 20, fontWeight: 700, color: s.color }}>
              {s.value}
            </div>
            <div style={{ fontFamily: "'DM Sans'", fontSize: 10, color: C.barkLight, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar type tabs */}
      <div style={{
        display: "flex", padding: "0 16px", gap: 0,
        borderBottom: `1px solid ${C.sand}`,
      }}>
        {[
          { key: "herbal", label: "Herbal Workshops", icon: "🌿", count: bookings.filter(b => b.calendar === "herbal").length },
          { key: "aromatherapy", label: "Aromatherapy", icon: "❋", count: bookings.filter(b => b.calendar === "aromatherapy").length },
        ].map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: "12px 8px", cursor: "pointer",
              background: "none", border: "none",
              borderBottom: activeTab === tab.key ? `3px solid ${C.sage}` : "3px solid transparent",
              fontFamily: "'DM Sans'", fontSize: 13, fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? C.forest : C.barkLight,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              transition: "all 0.15s",
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
            <span style={{
              background: activeTab === tab.key ? C.sage : C.sand,
              color: activeTab === tab.key ? C.white : C.barkLight,
              borderRadius: 10, padding: "1px 7px", fontSize: 11, fontWeight: 700,
            }}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Session sections */}
      <div style={{ padding: "16px 16px 40px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px 16px", fontFamily: "'DM Sans'", fontSize: 14, color: C.barkLight }}>
            Loading schedule…
          </div>
        ) : activeTab === "herbal" ? (
          <>
            {/* Morning session */}
            <div style={{ marginBottom: 24 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
              }}>
                <div style={{
                  fontFamily: "'Crimson Pro'", fontSize: 16, fontWeight: 600, color: C.forest,
                }}>Morning Session</div>
                <div style={{ flex: 1, height: 1, background: C.sand }}/>
                <span style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.barkLight }}>10 AM – 1 PM</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {HERBAL_BLOCKS.filter(b => b.session === "morning").map(block => (
                  <SlotCard
                    key={block.time} block={block}
                    bookings={herbalByBlock[block.time] || []}
                    blockedSlots={blockedTimesByCalendar.herbal}
                    onToggleBlock={handleToggleBlock}
                    onUpdateBooking={handleUpdateBooking}
                  />
                ))}
              </div>
            </div>

            {/* Lunch break */}
            <div style={{
              textAlign: "center", padding: "8px 0 8px",
              marginBottom: 16,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{ flex: 1, height: 1, background: C.sand }}/>
              <span style={{
                fontFamily: "'DM Sans'", fontSize: 12, color: C.barkLight,
                background: C.parchment, padding: "0 8px",
              }}>🍜 Lunch Break · 1–2 PM</span>
              <div style={{ flex: 1, height: 1, background: C.sand }}/>
            </div>

            {/* Afternoon session */}
            <div>
              <div style={{
                display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
              }}>
                <div style={{
                  fontFamily: "'Crimson Pro'", fontSize: 16, fontWeight: 600, color: C.forest,
                }}>Afternoon Session</div>
                <div style={{ flex: 1, height: 1, background: C.sand }}/>
                <span style={{ fontFamily: "'DM Sans'", fontSize: 11, color: C.barkLight }}>2 – 5 PM</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {HERBAL_BLOCKS.filter(b => b.session === "afternoon").map(block => (
                  <SlotCard
                    key={block.time} block={block}
                    bookings={herbalByBlock[block.time] || []}
                    blockedSlots={blockedTimesByCalendar.herbal}
                    onToggleBlock={handleToggleBlock}
                    onUpdateBooking={handleUpdateBooking}
                  />
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Aromatherapy tab */
          <div>
            {aromaBlocksToday.length === 0 ? (
              <div style={{
                background: C.mist, borderRadius: 12, padding: "24px 16px", textAlign: "center",
                fontFamily: "'DM Sans'", fontSize: 14, color: C.barkLight,
              }}>Aromatherapy is closed on {viewDate.toLocaleDateString("en-US", { weekday: "long" })}s.</div>
            ) : (
              <>
                <div style={{
                  background: "#F8F0F6", border: "1px solid #E8D8E4", borderRadius: 10,
                  padding: "10px 14px", marginBottom: 16,
                  fontFamily: "'DM Sans'", fontSize: 12, color: "#6A4A62", lineHeight: 1.5,
                }}>
                  <strong>{viewDate.toLocaleDateString("en-US", { weekday: "long" })} schedule:</strong> {formatTime12(aromaBlocksToday[0].time)} – {formatTime12(aromaBlocksToday[aromaBlocksToday.length - 1].end)}. Booking cutoff is 2 hours before session start.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {aromaBlocksToday.map(block => (
                    <SlotCard
                      key={`aroma-${block.time}`} block={block}
                      bookings={aromaByBlock[block.time] || []}
                      blockedSlots={blockedTimesByCalendar.aromatherapy}
                      onToggleBlock={handleToggleBlock}
                      onUpdateBooking={handleUpdateBooking}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Legend footer */}
      <div style={{
        background: C.white, borderTop: `1px solid ${C.sand}`,
        padding: "14px 16px",
      }}>
        <div style={{
          fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600, color: C.barkLight,
          textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8,
        }}>Instructor Groups</div>
        <div style={{ display: "flex", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: C.sage }}/>
            <span style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.bark }}>Group A · Mali (Guests 1–6)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: C.gold }}/>
            <span style={{ fontFamily: "'DM Sans'", fontSize: 12, color: C.bark }}>Group B · (Guests 7–12)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
