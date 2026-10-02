// ============================================================
// src/lib/agency-contract.ts
// ============================================================
// The agency agreement shown to travel agencies / group leaders on
// /agency/contract/<token> and stored (as plain text) when they sign.
// Terms come from the owner's existing agency contract (see project
// doc claude/b2b-agency-partner-rates-2026-08-22.md) plus the owner's
// 2026-10-01 decisions. Rates are generated from the live price lists
// (packages + package_prices), so the contract always matches what
// the booking system charges. Bump CONTRACT_VERSION when wording
// changes — each signature records the version it accepted.
// ============================================================

export const CONTRACT_VERSION = '2026-10b';

export const BUSINESS = {
  name: 'Uri Herbs Workshop',
  legal: 'ZIGI Co.',
  address: '44, 3 Si Phum Soi 9, Tambon Si Phum, Mueang Chiang Mai, Chiang Mai 50200, Thailand',
  email: 'uherbhouse@gmail.com',
  phone: '+66 64 334 9890',
};

export interface RateLine { label: string; from: string; retail: number }

export interface ContractParty {
  company_name: string;
  contact_name?: string | null;
  email: string;
  country?: string | null;
  license_no?: string | null;
  commission_pct: number;
}

export interface ContractSection { title: string; body: string[] }

const baht = (n: number) => `฿${Math.round(n).toLocaleString('en-US')}`;

// Package groups used for the rate table (one representative per duration).
export const RATE_GROUPS: { label: string; slug: string }[] = [
  { label: 'Single workshop (1 hour)', slug: 'single-tea' },
  { label: 'Combo (2 hours)', slug: 'combo-tea-inhaler' },
  { label: 'Integrated Journey (3 hours)', slug: 'journey-full' },
  { label: 'Natural Skincare & Aromatherapy (2 hours)', slug: 'skincare-aromatherapy' },
];

export function rateRows(
  packages: { slug: string; price: number; prices?: { from: string; price: number }[] }[],
  commissionPct: number
) {
  const periods = new Set<string>(['current']);
  packages.forEach(p => (p.prices || []).forEach(r => periods.add(r.from)));
  const rows: { period: string; label: string; retail: number; partner: number }[] = [];
  const ordered = ['current', ...Array.from(periods).filter(p => p !== 'current').sort()];
  for (const period of ordered) {
    for (const g of RATE_GROUPS) {
      const pkg = packages.find(p => p.slug === g.slug);
      if (!pkg) continue;
      let retail = pkg.price;
      if (period !== 'current') {
        for (const r of pkg.prices || []) if (r.from <= period) retail = r.price;
      }
      rows.push({ period, label: g.label, retail, partner: Math.round(retail * (100 - commissionPct) / 100) });
    }
  }
  return rows;
}

export function contractSections(party: ContractParty): ContractSection[] {
  const c = Number(party.commission_pct);
  return [
    {
      title: '1. Parties',
      body: [
        `This agreement is between ${BUSINESS.name} (${BUSINESS.legal}), ${BUSINESS.address} (“Uri Herbs”), and ${party.company_name}${party.country ? `, ${party.country}` : ''}${party.license_no ? ` (licence no. ${party.license_no})` : ''} (“the Agency”).`,
      ],
    },
    {
      title: '2. Agency rates',
      body: [
        `The Agency pays Uri Herbs the retail price of each workshop minus ${c}% (the Agency's commission). The Agency may charge its clients the retail price or its own price; the difference is the Agency's to keep.`,
        'The rate that applies is the one in force on the date of the workshop (see the rate table). Rates include materials, instruction, a welcome drink and the handcrafted products participants take home.',
      ],
    },
    {
      title: '3. Bookings',
      body: [
        'The Agency books through its personal agency page, subject to availability shown there. A booking is for one workshop, date and time.',
        'Shared-table bookings: up to 12 guests per booking, at the per-person rate.',
        'Private sessions: priced for at least 4 guests (1–4 guests pay for 4); 5–16 guests pay per actual guest.',
        'The Agency gives the correct number of guests and passes on Uri Herbs’ policies to its clients (including the health & allergy questionnaire).',
      ],
    },
    {
      title: '4. Payment',
      body: [
        '100% payment confirms a booking and is due no later than 14 days before the workshop.',
        'Bookings made less than 14 days before the workshop must be paid when booking — otherwise the places are not held.',
        'Payment is made online (card / PayPal) on the agency page, or by bank transfer with the transfer slip uploaded on the agency page.',
        'Reminders are sent 18 days before the workshop and on the payment due date. A booking still unpaid after the due date is cancelled automatically and its places are released.',
      ],
    },
    {
      title: '5. Cancellations by the Agency',
      body: [
        '7 days or more before the workshop: full refund.',
        '1–6 days before the workshop: 30% cancellation fee (70% refunded).',
        'Same-day cancellation or no-show: no refund.',
        'Refunds are made to the original payment method or by bank transfer.',
      ],
    },
    {
      title: '6. Age policy',
      body: [
        'Children under 12 may join only as part of a family group with a participating parent. Guests aged 12–17 must be accompanied by a responsible adult throughout.',
      ],
    },
    {
      title: '7. Term and changes',
      body: [
        'This agreement runs until either party ends it with 30 days’ written notice (email is enough). Bookings already confirmed are honoured.',
        'Uri Herbs may update rates or terms with at least 60 days’ notice by email. Confirmed bookings keep the price and terms they were booked under.',
      ],
    },
    {
      title: '8. Contact',
      body: [`${BUSINESS.email} · WhatsApp ${BUSINESS.phone}`],
    },
  ];
}

// Plain-text copy stored at signing time and sent by email.
export function contractText(
  party: ContractParty,
  rates: { period: string; label: string; retail: number; partner: number }[],
  signature?: { name: string; at: string; ip?: string | null }
): string {
  const lines: string[] = [];
  lines.push(`AGENCY AGREEMENT — ${BUSINESS.name} × ${party.company_name}`);
  lines.push(`Version ${CONTRACT_VERSION}`);
  lines.push('');
  for (const s of contractSections(party)) {
    lines.push(s.title.toUpperCase());
    s.body.forEach(b => lines.push(`- ${b}`));
    lines.push('');
  }
  lines.push('RATE TABLE (per person)');
  let period = '';
  for (const r of rates) {
    if (r.period !== period) {
      period = r.period;
      lines.push(period === 'current' ? 'Current rates:' : `Workshops from ${period}:`);
    }
    lines.push(`  ${r.label}: retail ${baht(r.retail)} · agency pays ${baht(r.partner)}`);
  }
  if (signature) {
    lines.push('');
    lines.push(`Accepted electronically by ${signature.name} on behalf of ${party.company_name}`);
    lines.push(`on ${signature.at}${signature.ip ? ` (IP ${signature.ip})` : ''}.`);
  }
  return lines.join('\n');
}
