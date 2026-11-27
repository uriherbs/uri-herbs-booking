// ============================================================
// src/lib/customers.ts
// ============================================================
// Customer list for admin → Customers (owner request 2026-11-24:
// "where is my customer database and how do I get to it").
// There is no customers table: a customer is built here from
//   - bookings (every channel: website, OTA, agency, manual)
//   - leads (landing-page sign-ups, e.g. the event QR code)
// grouped by email, else by phone, else by the booking itself
// (OTA bookings usually come without an email).
// Pure functions only, so the grouping can be tested without a DB.
// ============================================================

export interface CustomerBookingRow {
  id: string;
  booking_ref: string | null;
  slot_date: string;
  created_at: string;
  num_participants: number | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  total_price_thb: number | null;
  status: string | null;
  attendance_status: string | null;
  booking_source: string | null;
  ota_platform: string | null;
  coupon_code: string | null;
  is_private: boolean | null;
  packages: { name: string | null } | null;
  agencies: { company_name: string | null } | null;
  coupons: { partners: { name: string | null } | null } | null;
}

export interface CustomerLeadRow {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  source: string | null;
  landing: string;
  coupon_code: string | null;
  consent_marketing: boolean | null;
}

export interface CustomerVisit {
  ref: string;
  date: string;
  workshop: string;
  guests: number;
  price: number;
  state: 'came' | 'upcoming' | 'cancelled' | 'no-show' | 'past';
  channel: string;
  code: string | null;
}

export interface Customer {
  key: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  channels: string[];        // Website, Klook, GetYourGuide, Agency: X, Event QR: event-…
  partner: string;           // influencer whose code they used
  firstSeen: string;         // ISO date
  lastActivity: string;      // ISO date (latest workshop date or sign-up)
  bookings: number;          // not cancelled
  cameCount: number;
  upcoming: number;
  cancelled: number;
  guests: number;            // across bookings that were not cancelled
  spent: number;             // ฿, bookings that were not cancelled
  workshops: string[];
  leadSource: string;        // landing-page source, if they signed up
  leadCode: string;          // personal code they got from a landing page
  leadCodeUsed: boolean;
  marketingOk: boolean;      // ticked the marketing box on a landing page
  type: 'lead' | 'cancelled' | 'customer' | 'repeat';
  visits: CustomerVisit[];
}

const OTA_NAMES: Record<string, string> = {
  klook: 'Klook', getyourguide: 'GetYourGuide', kkday: 'KKday', tripcom: 'Trip.com', viator: 'Viator',
};

export function channelOf(b: CustomerBookingRow): string {
  switch (b.booking_source) {
    case 'ota': return OTA_NAMES[b.ota_platform || ''] || 'OTA';
    case 'agency': return b.agencies?.company_name ? `Agency: ${b.agencies.company_name}` : 'Agency';
    case 'manual': return 'Walk-in / manual';
    default: return 'Website';
  }
}

const normEmail = (e: string | null | undefined) => (e || '').trim().toLowerCase();
const normPhone = (p: string | null | undefined) => {
  const d = (p || '').replace(/\D/g, '');
  return d.length >= 8 ? d.slice(-9) : ''; // last 9 digits: ignores +66 / 0 prefix differences
};

export function visitState(b: CustomerBookingRow, today: string): CustomerVisit['state'] {
  if (b.status === 'cancelled') return 'cancelled';
  if (b.status === 'no_show' || b.attendance_status === 'no_show') return 'no-show';
  if (b.attendance_status === 'arrived' || b.status === 'completed') return 'came';
  return b.slot_date >= today ? 'upcoming' : 'past';
}

export function buildCustomers(bookings: CustomerBookingRow[], leads: CustomerLeadRow[], today: string): Customer[] {
  const byKey = new Map<string, Customer>();
  const alias = new Map<string, string>(); // email / phone → customer key

  const blank = (key: string): Customer => ({
    key, name: '', email: '', phone: '', country: '', channels: [], partner: '',
    firstSeen: '', lastActivity: '', bookings: 0, cameCount: 0, upcoming: 0, cancelled: 0,
    guests: 0, spent: 0, workshops: [], leadSource: '', leadCode: '', leadCodeUsed: false,
    marketingOk: false, type: 'lead', visits: [],
  });

  function find(email: string, phone: string, fallback: string): Customer {
    const k = (email && alias.get(`e:${email}`)) || (phone && alias.get(`p:${phone}`)) || '';
    let c = k ? byKey.get(k) : undefined;
    if (!c) {
      const key = email ? `e:${email}` : phone ? `p:${phone}` : fallback;
      c = blank(key);
      byKey.set(key, c);
    }
    if (email) alias.set(`e:${email}`, c.key);
    if (phone) alias.set(`p:${phone}`, c.key);
    return c;
  }

  const addUnique = (arr: string[], v: string) => { if (v && !arr.includes(v)) arr.push(v); };
  const minDate = (a: string, b: string) => (!a || (b && b < a) ? b : a);
  const maxDate = (a: string, b: string) => (!a || (b && b > a) ? b : a);

  // Oldest first, so the newest name / phone wins.
  const sortedBookings = [...bookings].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const b of sortedBookings) {
    const email = normEmail(b.customer_email);
    const phone = normPhone(b.customer_phone);
    const c = find(email, phone, `b:${b.id}`);
    if (b.customer_name) c.name = b.customer_name.trim();
    if (email) c.email = email;
    if (b.customer_phone) c.phone = b.customer_phone.trim();

    const state = visitState(b, today);
    const channel = channelOf(b);
    const workshop = b.packages?.name || 'Workshop';
    const guests = b.num_participants || 0;
    const price = b.total_price_thb || 0;
    c.visits.push({ ref: b.booking_ref || '', date: b.slot_date, workshop, guests, price, state, channel, code: b.coupon_code });

    addUnique(c.channels, channel);
    const partner = b.coupons?.partners?.name;
    if (partner) c.partner = partner;
    c.firstSeen = minDate(c.firstSeen, b.created_at.slice(0, 10));
    c.lastActivity = maxDate(c.lastActivity, b.slot_date);

    if (state === 'cancelled') { c.cancelled++; continue; }
    c.bookings++;
    c.guests += guests;
    c.spent += price;
    addUnique(c.workshops, workshop);
    if (state === 'came') c.cameCount++;
    if (state === 'upcoming') c.upcoming++;
  }

  const sortedLeads = [...leads].sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const l of sortedLeads) {
    const email = normEmail(l.email);
    const phone = normPhone(l.phone);
    const c = find(email, phone, `l:${l.id}`);
    if (!c.name) c.name = (l.name || '').trim();
    if (email) c.email = email;
    if (!c.phone && l.phone) c.phone = l.phone.trim();
    if (l.country) c.country = l.country;
    c.leadSource = l.source || l.landing;
    if (l.coupon_code) c.leadCode = l.coupon_code;
    if (l.consent_marketing) c.marketingOk = true;
    addUnique(c.channels, `Sign-up: ${l.source || l.landing}`);
    c.firstSeen = minDate(c.firstSeen, l.created_at.slice(0, 10));
    c.lastActivity = maxDate(c.lastActivity, l.created_at.slice(0, 10));
  }

  for (const c of byKey.values()) {
    c.visits.sort((a, b) => b.date.localeCompare(a.date));
    if (c.leadCode) {
      const code = c.leadCode.toUpperCase();
      c.leadCodeUsed = c.visits.some((v) => v.state !== 'cancelled' && (v.code || '').toUpperCase() === code);
    }
    c.type = c.bookings === 0 ? (c.cancelled > 0 ? 'cancelled' : 'lead') : c.bookings > 1 ? 'repeat' : 'customer';
    if (!c.name) c.name = c.email || c.phone || 'Unknown';
  }

  return [...byKey.values()].sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}

export function customersToCsv(rows: Customer[]): string {
  const head = ['Name', 'Email', 'Phone', 'Country', 'Type', 'Channels', 'Partner', 'First seen', 'Last activity',
    'Bookings', 'Came', 'Upcoming', 'Cancelled', 'Guests', 'Total THB', 'Workshops', 'Sign-up source', 'Sign-up code', 'Code used', 'Marketing OK'];
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((c) => [
    c.name, c.email, c.phone, c.country, c.type, c.channels.join(' | '), c.partner, c.firstSeen, c.lastActivity,
    c.bookings, c.cameCount, c.upcoming, c.cancelled, c.guests, c.spent, c.workshops.join(' | '),
    c.leadSource, c.leadCode, c.leadCode ? (c.leadCodeUsed ? 'yes' : 'no') : '', c.marketingOk ? 'yes' : 'no',
  ].map(q).join(','));
  return [head.map(q).join(','), ...lines].join('\n');
}
