// ============================================================
// src/lib/ota-email.ts — fixed-rule parsers for OTA booking emails
// ============================================================
// Reads the booking / cancellation emails that Klook, GetYourGuide and
// KKday send to uherbhouse@gmail.com and turns them into a plain object.
// Pure functions (no DB, no network) so they're easy to test.
//
// If an OTA changes its email layout, the parser returns an 'unreadable'
// result instead of guessing — the import route then emails the shop to
// add the booking by hand.
// ============================================================

export type OtaPlatform = 'klook' | 'getyourguide' | 'kkday';

export interface OtaEmailInput {
  from: string;
  subject: string;
  body: string; // plain text
}

export type OtaParsed =
  | { kind: 'ignore' }
  | { kind: 'unreadable'; platform: OtaPlatform; reason: string }
  | { kind: 'cancel'; platform: OtaPlatform; ref: string }
  | {
      kind: 'new';
      platform: OtaPlatform;
      ref: string;
      date: string;       // YYYY-MM-DD
      time: string;       // HH:MM (24h)
      guests: number;
      name: string;
      packageText: string;
      packageSlug: string | null;
      phone?: string;
      email?: string;
      price?: string;
      extra?: string;
    };

export const PLATFORM_LABEL: Record<OtaPlatform, string> = {
  klook: 'Klook',
  getyourguide: 'GetYourGuide',
  kkday: 'KKday',
};

// Collapse the email's table/markdown noise into single-spaced text.
export function normalize(text: string): string {
  return String(text || '')
    .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')   // markdown links
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[|#*]/g, ' ')
    .replace(/[ \s]+/g, ' ')
    .trim();
}

const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

function pad(n: string | number) {
  return String(n).padStart(2, '0');
}

function to24h(h: string, m: string, ampm?: string) {
  let hour = parseInt(h, 10);
  if (ampm) {
    const pm = /pm/i.test(ampm);
    if (pm && hour < 12) hour += 12;
    if (!pm && hour === 12) hour = 0;
  }
  return `${pad(hour)}:${m}`;
}

function sumCounts(text: string): number {
  let total = 0;
  for (const m of text.matchAll(/(\d+)\s*x\b/gi)) total += parseInt(m[1], 10);
  return total;
}

/** Map an OTA package / option name onto one of our package slugs. */
export function mapPackage(text: string): string | null {
  const t = text.toLowerCase();
  if (/skin\s*care|skincare|aromatherap/.test(t)) return 'skincare-aromatherapy';
  const tea = /\btea\b/.test(t);
  const inhaler = /inhaler|ya\s*dom/.test(t);
  const ball = /\bball\b|compress/.test(t);
  if ((tea && inhaler && ball) || /integrated|3[\s-]*hours?\b/.test(t)) return 'journey-full';
  if (tea && inhaler) return 'combo-tea-inhaler';
  if (inhaler && ball) return 'combo-inhaler-ball';
  if (tea && ball) return 'combo-tea-ball';
  if (tea) return 'single-tea';
  if (inhaler) return 'single-inhaler';
  if (ball) return 'single-massage-ball';
  return null;
}

// GetYourGuide puts the product title in front of the option name; the
// title of our main listing mentions all three workshops, so strip it.
const GYG_PRODUCT_TITLES = [
  'Chiang Mai: Herbal Tea, Thai Inhaler & Massage Ball Workshop',
  'Chiang Mai: Herbal Tea, Thai Inhaler and Massage Ball Workshop',
];

function detectPlatform(from: string): OtaPlatform | null {
  const f = from.toLowerCase();
  if (f.includes('klook.com')) return 'klook';
  if (f.includes('getyourguide.com')) return 'getyourguide';
  if (f.includes('kkday.com')) return 'kkday';
  return null;
}

function parseKlook(subject: string, t: string): OtaParsed {
  const isCancel = /^klook order cancel/i.test(subject.trim());
  const isNew = /^klook order confirmed/i.test(subject.trim());
  if (!isCancel && !isNew) return { kind: 'ignore' };
  const ref = t.match(/Booking reference ID:\s*([A-Z0-9]{5,})/i)?.[1]
    || subject.match(/-\s*([A-Z]{3}\d{6})\s*$/)?.[1];
  if (!ref) return { kind: 'unreadable', platform: 'klook', reason: 'booking reference not found' };
  if (isCancel) return { kind: 'cancel', platform: 'klook', ref };

  const pkg = t.match(/Package:\s*(.+?)\s*Booking reference ID:/i)?.[1]?.trim();
  const date = t.match(/Date Request:\s*(\d{4}-\d{2}-\d{2})/i)?.[1];
  const tm = t.match(/Time Request:\s*(\d{1,2}):(\d{2})/i);
  const name = t.match(/Lead participant:\s*(?:\(\s*\))?\s*(.+?)\s*(?:Country\/region|Lead person email|Lead person mobile|Participant:)/i)?.[1]?.trim();
  const partText = t.match(/Participant:\s*(.+?)\s*(?:Activity URL|Extra Details|$)/i)?.[1] || '';
  const guests = sumCounts(partText);
  if (!pkg || !date || !tm || !name || !guests) {
    return { kind: 'unreadable', platform: 'klook', reason: 'missing date/time/package/guests' };
  }
  return {
    kind: 'new', platform: 'klook', ref, date, time: to24h(tm[1], tm[2]), guests, name,
    packageText: pkg, packageSlug: mapPackage(pkg),
    email: t.match(/Lead person email:\s*([^\s\[]+@[^\s\[]+)/i)?.[1],
    phone: t.match(/Lead person mobile:\s*([+\d][\d\s-]{5,}\d)/i)?.[1]?.trim(),
  };
}

function parseGyg(subject: string, t: string): OtaParsed {
  const s = subject.trim();
  const cancel = s.match(/booking has been cancel+ed\s*-\s*S\d+\s*-\s*(GYG[A-Z0-9]+)/i);
  if (cancel) return { kind: 'cancel', platform: 'getyourguide', ref: cancel[1] };
  const neu = s.match(/(?:new booking received|^booking)\s*-\s*S\d+\s*-\s*(GYG[A-Z0-9]+)/i);
  if (!neu) return { kind: 'ignore' };
  const ref = neu[1];

  let option = t.match(/(?:last-minute booking|has been booked|new booking)\s*:\s*(.+?)\s*Reference number/i)?.[1]?.trim() || '';
  for (const title of GYG_PRODUCT_TITLES) {
    if (option.toLowerCase().startsWith(title.toLowerCase()) && option.length > title.length + 3) {
      option = option.slice(title.length).trim();
    }
  }
  const dm = t.match(/Date\s*:?\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4}),?\s*(\d{1,2}):(\d{2})\s*([AP]M)/i);
  const partText = t.match(/Number of participants\s*:?\s*(.+?)\s*(?:Main customer|Tour language|Price)/i)?.[1] || '';
  const guests = sumCounts(partText);
  const name = t.match(/Main customer\s*:?\s*(.+?)\s+(?:customer-\S+@|\S+@\S+|Phone:)/i)?.[1]?.trim();
  const month = dm ? MONTHS[dm[1].toLowerCase()] : undefined;
  if (!option || !dm || !month || !guests || !name) {
    return { kind: 'unreadable', platform: 'getyourguide', reason: 'missing date/time/option/guests' };
  }
  return {
    kind: 'new', platform: 'getyourguide', ref,
    date: `${dm[3]}-${month}-${pad(dm[2])}`, time: to24h(dm[4], dm[5], dm[6]),
    guests, name, packageText: option, packageSlug: mapPackage(option),
    phone: t.match(/Phone:\s*([+\d][\d\s-]{5,}\d)/i)?.[1]?.trim(),
    price: t.match(/Price\s*:?\s*(฿\s*[\d,.]+)/i)?.[1],
    extra: t.match(/Language:\s*([A-Za-z]+)/i)?.[1] && `Customer language: ${t.match(/Language:\s*([A-Za-z]+)/i)?.[1]}`,
  };
}

function parseKkday(subject: string, t: string): OtaParsed {
  const s = subject.trim();
  const cancel = s.match(/Booking ID\s*:?\s*(\d{2}KK\d+)\s*has been cancel+ed/i);
  if (cancel) return { kind: 'cancel', platform: 'kkday', ref: cancel[1] };
  const neu = s.match(/new order,\s*Booking ID\s*:?\s*(\d{2}KK\d+)/i);
  if (!neu) return { kind: 'ignore' };
  const ref = neu[1];
  const pkg = t.match(/Package:\s*(.+?)\s*Date of Use:/i)?.[1]?.trim();
  const d = t.match(/Date of Use:\s*(\d{4})\/(\d{2})\/(\d{2})/i);
  const tm = t.match(/Available times?:\s*(\d{1,2}):(\d{2})/i);
  const guests = parseInt(t.match(/Quantity:\s*(\d+)/i)?.[1] || '0', 10);
  const name = t.match(/Lead Traveler:\s*(.+?)\s*(?:Nationality|The system|$)/i)?.[1]?.trim();
  if (!pkg || !d || !tm || !guests || !name) {
    return { kind: 'unreadable', platform: 'kkday', reason: 'missing date/time/package/guests' };
  }
  const nationality = t.match(/Nationality:\s*(.+?)\s*(?:The system|$)/i)?.[1]?.trim();
  return {
    kind: 'new', platform: 'kkday', ref, date: `${d[1]}-${d[2]}-${d[3]}`, time: to24h(tm[1], tm[2]),
    guests, name, packageText: pkg, packageSlug: mapPackage(pkg),
    extra: nationality ? `Nationality: ${nationality}` : undefined,
  };
}

export function parseOtaEmail(input: OtaEmailInput): OtaParsed {
  const platform = detectPlatform(input.from || '');
  if (!platform) return { kind: 'ignore' };
  const t = normalize(input.body);
  if (platform === 'klook') return parseKlook(input.subject || '', t);
  if (platform === 'getyourguide') return parseGyg(input.subject || '', t);
  return parseKkday(input.subject || '', t);
}
