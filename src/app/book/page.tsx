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
// STEP 3 (COMPLETED): CUSTOMER DETAILS
// ════════════════════════════════════════════════════════════

function CustomerStep({ form, onChange, errors }) {
  const inputStyle = (hasError) => ({
    width: "100%", boxSizing: "border-box",
    fontFamily: "'DM Sans'", fontSize: 16,
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
            style={inputStyle(errors.name)}  
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
                I confirm that all participants are at least 12 years of age.
              </span>
            </div>
          </label>
          {errors.age && <div style={errorStyle}>{errors.age}</div>}
        </div>
      </div>
    </div>
  );
}
