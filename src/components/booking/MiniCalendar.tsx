'use client';

// ============================================================
// src/components/booking/MiniCalendar.tsx
// ============================================================
// The /book page's month calendar (same look, same data source:
// get_calendar_availability via useCalendarAvailability), shared so
// other flows — e.g. /reschedule/[token] — show exactly the calendar
// customers already know. Only dates the package actually runs and
// that still have room are clickable (aromatherapy → Mon–Thu only).
//
// /book still has its own inline copy (MiniCalendar in
// src/app/book/page.tsx); if its look changes, mirror it here.
// Extra vs. /book: `markedDate` outlines a date in gold (e.g. the
// customer's current booking date on the reschedule page).
// ============================================================

import { useMemo, useState } from 'react';
import { useCalendarAvailability } from '@/lib/hooks';
import { C } from '@/lib/theme';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const ChevronLeft = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
);
const ChevronRight = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="2"><path d="M9 6l6 6-6 6" /></svg>
);

type Props = {
  selectedDate: string | null;
  onSelectDate: (d: string) => void;
  packageSlug: string | null;
  participants: number;
  isPrivate: boolean;
  markedDate?: string | null; // outlined in gold, e.g. the current booking date
  monthsAhead?: number; // how many months forward the customer can browse (default 2, same as /book)
};

const ymd = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export default function MiniCalendar({
  selectedDate, onSelectDate, packageSlug, participants, isPrivate, markedDate, monthsAhead = 2,
}: Props) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());

  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthStart = ymd(viewYear, viewMonth, 1);
  const monthEnd = ymd(viewYear, viewMonth, lastDay);

  const { days: liveDays, loading } = useCalendarAvailability(monthStart, monthEnd, packageSlug, participants, isPrivate);

  const statusByDate = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of liveDays as any[]) map[d.slot_date] = d.status; // 'open' | 'limited' | 'full' | 'closed'
    return map;
  }, [liveDays]);

  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate());
  const cells = useMemo(() => {
    const out: ({ day: number; dateStr: string; status: string; isToday: boolean } | null)[] = [];
    const startPad = new Date(viewYear, viewMonth, 1).getDay();
    for (let i = 0; i < startPad; i++) out.push(null);
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = ymd(viewYear, viewMonth, d);
      const isPast = dateStr < todayStr;
      const status = isPast ? 'closed' : statusByDate[dateStr] || (loading ? 'loading' : 'closed');
      out.push({ day: d, dateStr, status, isToday: dateStr === todayStr });
    }
    return out;
  }, [viewMonth, viewYear, lastDay, statusByDate, loading, todayStr]);

  const monthIndex = viewYear * 12 + viewMonth;
  const todayIndex = today.getFullYear() * 12 + today.getMonth();
  const canGoPrev = monthIndex > todayIndex;
  const canGoNext = monthIndex < todayIndex + monthsAhead;

  const navBtn = (enabled: boolean): React.CSSProperties => ({
    background: 'none', border: 'none', cursor: enabled ? 'pointer' : 'default', opacity: enabled ? 1 : 0.3, padding: 4,
  });

  return (
    <div style={{ background: C.white, borderRadius: 14, border: `1.5px solid ${C.sand}`, overflow: 'hidden' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 16px', borderBottom: `1px solid ${C.sand}`,
      }}>
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canGoPrev}
          style={navBtn(canGoPrev)}
          onClick={() => {
            if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1);
          }}
        ><ChevronLeft /></button>
        <span style={{ fontFamily: "'Crimson Pro'", fontSize: 17, fontWeight: 600, color: C.forest }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          type="button"
          aria-label="Next month"
          disabled={!canGoNext}
          style={navBtn(canGoNext)}
          onClick={() => {
            if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1);
          }}
        ><ChevronRight /></button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '8px 8px 0' }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{
            textAlign: 'center', fontFamily: "'DM Sans'", fontSize: 11, fontWeight: 600,
            color: C.barkLight, padding: '4px 0', letterSpacing: '0.03em',
          }}>{w}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', padding: '4px 8px 12px', gap: 2 }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`pad-${i}`} />;
          const isSelected = selectedDate === cell.dateStr;
          const isMarked = markedDate === cell.dateStr;
          const isLoading = cell.status === 'loading';
          const isDisabled = cell.status === 'closed' || cell.status === 'full' || isLoading;
          const border = isSelected
            ? '1.5px solid transparent'
            : isMarked
              ? `1.5px solid ${C.gold}`
              : cell.isToday
                ? `1.5px solid ${C.sage}`
                : '1.5px solid transparent';
          return (
            <button
              key={cell.dateStr}
              type="button"
              onClick={() => !isDisabled && onSelectDate(cell.dateStr)}
              disabled={isDisabled}
              style={{
                background: isSelected ? C.sage : 'transparent',
                border, borderRadius: 10, padding: '8px 2px', cursor: isDisabled ? 'default' : 'pointer',
                opacity: isLoading ? 0.5 : isDisabled && !isMarked ? 0.35 : 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, transition: 'all 0.15s',
              }}
            >
              <span style={{
                fontFamily: "'DM Sans'", fontSize: 14, fontWeight: isSelected ? 700 : 500,
                color: isSelected ? C.white : C.forest,
              }}>{cell.day}</span>
              {!isDisabled && (
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: isSelected ? 'rgba(255,255,255,0.8)' : cell.status === 'limited' ? C.gold : C.sage,
                }} />
              )}
            </button>
          );
        })}
      </div>

      <div style={{
        display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap',
        padding: '10px 16px 14px', borderTop: `1px solid ${C.sand}`,
      }}>
        {[
          { color: C.sage, label: 'Available', ring: false },
          { color: C.gold, label: 'Limited', ring: false },
          { color: C.sand, label: 'Full', ring: false },
          ...(markedDate ? [{ color: C.gold, label: 'Your current date', ring: true }] : []),
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: l.ring ? 10 : 6, height: l.ring ? 10 : 6, borderRadius: l.ring ? 3 : '50%',
              background: l.ring ? 'transparent' : l.color, border: l.ring ? `1.5px solid ${l.color}` : 'none',
            }} />
            <span style={{ fontSize: 11, fontFamily: "'DM Sans'", color: C.barkLight }}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
