// ============================================================
// URI HERBS WORKSHOP — iCal (RFC 5545) Builder
// ============================================================
// All times are converted to UTC with a 'Z' suffix rather than
// using a VTIMEZONE block. This is deliberate: VTIMEZONE
// definitions for Asia/Bangkok are verbose and some OTA ingest
// parsers handle them inconsistently. UTC 'Z' timestamps are
// unambiguous and universally supported — the small tradeoff is
// that a human opening the .ics file in a text editor sees UTC
// times, not local Bangkok times (any real calendar app converts
// it for display automatically).
// ============================================================

export interface ICalEvent {
  uid: string;
  dtstart: Date;   // any JS Date — will be converted to UTC
  dtend: Date;
  summary: string;
  description?: string;
  allDay?: boolean; // used for whole-day closures (blocked_dates)
}

const BANGKOK_OFFSET_HOURS = 7;

// Bangkok wall-clock time (no DST, fixed UTC+7) → JS Date in UTC
export function bangkokToDate(dateStr: string, timeStr: string): Date {
  // dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM' or 'HH:MM:SS'
  const [h, m] = timeStr.split(':').map(Number);
  const utcMs = Date.parse(`${dateStr}T00:00:00Z`) + ((h - BANGKOK_OFFSET_HOURS) * 60 + m) * 60000;
  return new Date(utcMs);
}

function formatICalDate(d: Date): string {
  // YYYYMMDDTHHMMSSZ
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function formatICalDateOnly(d: Date): string {
  // YYYYMMDD — used for all-day VALUE=DATE events
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

// RFC 5545 requires escaping commas, semicolons, backslashes, and newlines
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

// RFC 5545 line-folding: lines longer than 75 octets must be
// continued on the next line with a leading space. Several strict
// OTA parsers (Viator's ingest in particular) reject unfolded
// long lines instead of just truncating them, so this isn't optional.
function foldLine(line: string): string {
  const MAX = 75;
  if (line.length <= MAX) return line;
  let result = '';
  let remaining = line;
  let first = true;
  while (remaining.length > 0) {
    const chunkSize = first ? MAX : MAX - 1;
    result += (first ? '' : '\r\n ') + remaining.slice(0, chunkSize);
    remaining = remaining.slice(chunkSize);
    first = false;
  }
  return result;
}

export function buildICalFeed(params: {
  calendarName: string;
  events: ICalEvent[];
  refreshIntervalMinutes?: number;
}): string {
  const { calendarName, events, refreshIntervalMinutes = 15 } = params;
  const now = formatICalDate(new Date());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Uri Herbs Workshop//Booking Engine//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    foldLine(`X-WR-CALNAME:${escapeICalText(calendarName)}`),
    'X-WR-TIMEZONE:UTC',
    // Advisory hint for clients that honor it (Google/Outlook mostly
    // ignore this and use their own poll schedule regardless — see
    // the chat explanation on real OTA refresh behavior)
    `X-PUBLISHED-TTL:PT${refreshIntervalMinutes}M`,
    `REFRESH-INTERVAL;VALUE=DURATION:PT${refreshIntervalMinutes}M`,
  ];

  for (const ev of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(foldLine(`UID:${ev.uid}`));
    lines.push(`DTSTAMP:${now}`);
    if (ev.allDay) {
      // Whole-day closure — DTEND is exclusive per RFC 5545, so a
      // single-day closure on 2026-08-01 needs DTEND of 2026-08-02.
      lines.push(`DTSTART;VALUE=DATE:${formatICalDateOnly(ev.dtstart)}`);
      lines.push(`DTEND;VALUE=DATE:${formatICalDateOnly(ev.dtend)}`);
    } else {
      lines.push(`DTSTART:${formatICalDate(ev.dtstart)}`);
      lines.push(`DTEND:${formatICalDate(ev.dtend)}`);
    }
    lines.push(foldLine(`SUMMARY:${escapeICalText(ev.summary)}`));
    if (ev.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeICalText(ev.description)}`));
    }
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:OPAQUE'); // "busy" — the whole point of this feed
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  // RFC 5545 mandates CRLF line endings
  return lines.join('\r\n') + '\r\n';
}
