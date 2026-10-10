// ============================================================
// src/lib/agency-docs-pdf.tsx  (server-only)
// ============================================================
// Simple (non-VAT) INVOICE and RECEIPT PDFs for travel-agency bookings.
// Owner decisions 2026-10-09: plain invoice/receipt (no VAT, no tax ID),
// numbers INV-<booking ref> / RCP-<booking ref>; payment instructions =
// pay online on the agency page, or bank transfer (bank details from
// NEXT_PUBLIC_BANK_TRANSFER_INFO when set, otherwise "contact us").
//
//   invoice → attached to the "Booking reserved" email, downloadable
//             from the agency page
//   receipt → attached to the "Payment received — thank you" email
//             (admin Mark paid, or online card/PayPal payment),
//             downloadable from the agency page once paid
// Amounts come from the booking row (total_price_thb = what the agency
// pays, retail_price_thb = retail) — the same numbers the system charged.
// ============================================================

import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import { registerPdfFonts, PDF_FAMILY, PDF_LOGO } from './pdf-fonts';
import { BUSINESS } from './agency-contract';

registerPdfFonts();

export type AgencyDocKind = 'invoice' | 'receipt';

export interface AgencyDocData {
  kind: AgencyDocKind;
  number: string;
  issueDate: string;      // formatted
  dueDate: string | null; // invoice only
  paidDate: string | null;
  paymentMethod: string | null;
  agency: [string, string][]; // label/value rows
  bookingRef: string;
  client: string;
  item: string;           // workshop · date · time
  guestsLine: string;     // "2 guests" / "2 guests (private — priced for 4)"
  retail: number;
  net: number;
  payInstructions: string[];
  portalUrl: string | null;
}

const COLOR = {
  forest: '#2D4639', sage: '#6B8F71', sageDark: '#4A7050', gold: '#A89068',
  bark: '#5C4A3D', barkLight: '#8A7668', sand: '#E8E2D8', panel: '#FAF8F3', paid: '#E7EFEA',
};

const styles = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 54, paddingHorizontal: 46, fontFamily: PDF_FAMILY as any, fontSize: 9.5, color: COLOR.bark, lineHeight: 1.45 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 30, height: 30, borderRadius: 15 },
  brandName: { fontWeight: 700, fontSize: 12.5, color: COLOR.forest },
  brandSub: { fontSize: 8, color: COLOR.barkLight, marginTop: 4, maxWidth: 250 },
  docTitle: { fontWeight: 700, fontSize: 22, lineHeight: 1.2, color: COLOR.forest, textAlign: 'right', marginBottom: 6 },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, fontSize: 9 },
  metaKey: { color: COLOR.barkLight },
  metaVal: { color: COLOR.forest, fontWeight: 700 },
  label: { fontSize: 8, fontWeight: 700, color: COLOR.barkLight, letterSpacing: 0.8, marginBottom: 4 },
  box: { backgroundColor: COLOR.panel, borderWidth: 1, borderColor: COLOR.sand, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10, marginBottom: 16 },
  detailRow: { flexDirection: 'row', marginBottom: 2 },
  detailKey: { width: 140, color: COLOR.barkLight },
  detailVal: { flex: 1, color: COLOR.forest },
  table: { borderWidth: 1, borderColor: COLOR.sand, borderRadius: 6, marginBottom: 16 },
  thead: { flexDirection: 'row', backgroundColor: COLOR.panel, paddingVertical: 6, paddingHorizontal: 10, fontSize: 8, fontWeight: 700, color: COLOR.barkLight },
  trow: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: COLOR.sand },
  colDesc: { flex: 1, paddingRight: 10 },
  colAmt: { width: 90, textAlign: 'right' },
  sumRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 10, paddingVertical: 3 },
  sumKey: { width: 180, textAlign: 'right', color: COLOR.barkLight, paddingRight: 10 },
  sumVal: { width: 90, textAlign: 'right', color: COLOR.forest },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: COLOR.sand },
  totalKey: { width: 180, textAlign: 'right', fontWeight: 700, color: COLOR.forest, paddingRight: 10, fontSize: 11 },
  totalVal: { width: 90, textAlign: 'right', fontWeight: 700, color: COLOR.forest, fontSize: 11 },
  paidBadge: { alignSelf: 'flex-start', backgroundColor: COLOR.paid, color: COLOR.sageDark, fontWeight: 700, fontSize: 11, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 4, marginBottom: 14 },
  para: { marginBottom: 3 },
  thanks: { marginTop: 18, fontSize: 10.5, color: COLOR.forest },
  footer: { position: 'absolute', bottom: 22, left: 46, right: 46, fontSize: 7.5, color: COLOR.barkLight, textAlign: 'center' },
});

const baht = (n: number) => `฿${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

function AgencyDocPdf({ d }: { d: AgencyDocData }) {
  const isInvoice = d.kind === 'invoice';
  const discount = Math.max(0, (d.retail || 0) - (d.net || 0));
  return (
    <Document title={`${isInvoice ? 'Invoice' : 'Receipt'} ${d.number} — ${BUSINESS.name}`} author={BUSINESS.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.top}>
          <View>
            <View style={styles.brandRow}>
              <Image src={PDF_LOGO} style={styles.logo} />
              <Text style={styles.brandName}>{BUSINESS.name}</Text>
            </View>
            <Text style={styles.brandSub}>{BUSINESS.legal} · {BUSINESS.address}</Text>
            <Text style={styles.brandSub}>{BUSINESS.email} · WhatsApp {BUSINESS.phone}</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>{isInvoice ? 'INVOICE' : 'RECEIPT'}</Text>
            <View style={styles.metaRow}><Text style={styles.metaKey}>No.</Text><Text style={styles.metaVal}>{d.number}</Text></View>
            <View style={styles.metaRow}><Text style={styles.metaKey}>Date</Text><Text style={styles.metaVal}>{isInvoice ? d.issueDate : (d.paidDate || d.issueDate)}</Text></View>
            {isInvoice && d.dueDate ? <View style={styles.metaRow}><Text style={styles.metaKey}>Due</Text><Text style={styles.metaVal}>{d.dueDate}</Text></View> : null}
            <View style={styles.metaRow}><Text style={styles.metaKey}>Booking</Text><Text style={styles.metaVal}>{d.bookingRef}</Text></View>
          </View>
        </View>

        {!isInvoice ? <Text style={styles.paidBadge}>PAID{d.paidDate ? ` · ${d.paidDate}` : ''}{d.paymentMethod ? ` · ${d.paymentMethod}` : ''}</Text> : null}

        <Text style={styles.label}>{isInvoice ? 'BILL TO' : 'RECEIVED FROM'}</Text>
        <View style={styles.box}>
          {d.agency.map(([k, v]) => (
            <View key={k} style={styles.detailRow}>
              <Text style={styles.detailKey}>{k}</Text>
              <Text style={styles.detailVal}>{v}</Text>
            </View>
          ))}
        </View>

        <View style={styles.table}>
          <View style={styles.thead}>
            <Text style={styles.colDesc}>DESCRIPTION</Text>
            <Text style={styles.colAmt}>AMOUNT</Text>
          </View>
          <View style={styles.trow}>
            <View style={styles.colDesc}>
              <Text style={{ color: COLOR.forest, fontWeight: 700 }}>{d.item}</Text>
              <Text>{d.guestsLine}</Text>
              <Text style={{ color: COLOR.barkLight }}>Client: {d.client}</Text>
            </View>
            <Text style={styles.colAmt}>{baht(d.retail)}</Text>
          </View>
          <View style={[styles.sumRow, { borderTopWidth: 1, borderTopColor: COLOR.sand, paddingTop: 6 }]}>
            <Text style={styles.sumKey}>Retail price</Text><Text style={styles.sumVal}>{baht(d.retail)}</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumKey}>Agency discount</Text><Text style={styles.sumVal}>−{baht(discount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalKey}>{isInvoice ? 'Amount to pay' : 'Amount paid'}</Text>
            <Text style={styles.totalVal}>{baht(d.net)}</Text>
          </View>
        </View>

        {isInvoice ? (
          <View>
            <Text style={styles.label}>HOW TO PAY</Text>
            {d.payInstructions.map((t, i) => <Text key={i} style={styles.para}>{t}</Text>)}
          </View>
        ) : (
          <Text style={styles.thanks}>Thank you for your payment — the booking is confirmed. We look forward to welcoming your guests in Chiang Mai.</Text>
        )}

        <Text style={styles.footer} fixed>
          {BUSINESS.name} ({BUSINESS.legal}) · {BUSINESS.email} · WhatsApp {BUSINESS.phone} · uriherbs.com
        </Text>
      </Page>
    </Document>
  );
}

export async function agencyDocPdf(d: AgencyDocData): Promise<Buffer> {
  return renderToBuffer(<AgencyDocPdf d={d} />);
}

// ── Load the data for one booking ─────────────────────────────
const fmtDate = (d: Date | string) => new Date(d).toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'long', year: 'numeric' });
const fmtDateTime = (d: string) => new Date(d).toLocaleString('en-GB', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
const fmtSlot = (date: string, time: string) => {
  const d = new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  const [h, m] = String(time).slice(0, 5).split(':').map(Number);
  return `${d}, ${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const METHOD: Record<string, string> = { transfer: 'Bank transfer', stripe: 'Card', paypal: 'PayPal', cash: 'Cash', later: 'Pay on arrival' };

export const AGENCY_DOC_SELECT =
  'id, booking_ref, slot_date, start_time, num_participants, is_private, customer_name, status, payment_status, payment_method, paid_at, total_price_thb, retail_price_thb, payment_due_date, agency_pay_deadline, created_at, agency_id, ' +
  'agencies ( company_name, contact_name, email, phone, address, country, license_no, tat_no, portal_token ), packages ( name, calendar_type )';

export function agencyDocData(b: any, kind: AgencyDocKind, siteUrl: string): AgencyDocData {
  const a = Array.isArray(b.agencies) ? b.agencies[0] : b.agencies;
  const pkg = Array.isArray(b.packages) ? b.packages[0] : b.packages;
  const guests = Number(b.num_participants) || 0;
  const charged = b.is_private ? (pkg?.calendar_type === 'aromatherapy' ? 4 : Math.max(guests, 4)) : guests;
  const portal = a?.portal_token ? `${siteUrl}/agency/${a.portal_token}` : null;
  const bank = (process.env.NEXT_PUBLIC_BANK_TRANSFER_INFO || '').trim();
  const pay: string[] = [
    `Pay online (card / PayPal) on your agency page${portal ? `: ${portal}` : '.'}`,
    bank
      ? `Or by bank transfer: ${bank} — then upload the transfer slip on your agency page.`
      : `Or by bank transfer — contact us for the bank details (${BUSINESS.email} · WhatsApp ${BUSINESS.phone}) and upload the transfer slip on your agency page.`,
    b.agency_pay_deadline
      ? `This workshop is less than 14 days away: please pay by ${fmtDateTime(b.agency_pay_deadline)} (Chiang Mai time), otherwise the booking is cancelled automatically.`
      : b.status === 'pending_payment'
        ? 'This workshop is less than 14 days away, so payment is needed now to hold the places.'
        : 'Unpaid bookings are cancelled automatically after the due date.',
  ];
  const rows: [string, string | null | undefined][] = [
    ['Company', a?.company_name], ['Contact person', a?.contact_name], ['Email', a?.email], ['Phone', a?.phone],
    ['Address', a?.address], ['Country', a?.country], ['Business licence no.', a?.license_no], ['TAT licence no.', a?.tat_no],
  ];
  return {
    kind,
    number: `${kind === 'invoice' ? 'INV' : 'RCP'}-${b.booking_ref}`,
    issueDate: fmtDate(b.created_at || new Date()),
    dueDate: b.agency_pay_deadline ? fmtDateTime(b.agency_pay_deadline)
      : b.payment_due_date ? fmtDate(`${b.payment_due_date}T12:00:00+07:00`) : (b.status === 'pending_payment' ? 'Now (within 30 minutes)' : null),
    paidDate: b.paid_at ? fmtDate(b.paid_at) : null,
    paymentMethod: b.payment_method ? (METHOD[b.payment_method] || b.payment_method) : null,
    agency: rows.filter(([, v]) => typeof v === 'string' && v.trim()).map(([k, v]) => [k, String(v).trim()]),
    bookingRef: b.booking_ref,
    client: String(b.customer_name || ''),
    item: `${pkg?.name || 'Workshop'} · ${fmtSlot(b.slot_date, b.start_time)}`,
    guestsLine: `${guests} guest${guests === 1 ? '' : 's'}${b.is_private ? ` · private session${charged !== guests ? ` (priced for ${charged})` : ''}` : ''}`,
    retail: Number(b.retail_price_thb) || Number(b.total_price_thb) || 0,
    net: Number(b.total_price_thb) || 0,
    payInstructions: pay,
    portalUrl: portal,
  };
}

export function agencyDocFilename(kind: AgencyDocKind, bookingRef: string) {
  return `${kind === 'invoice' ? 'Invoice' : 'Receipt'}-${kind === 'invoice' ? 'INV' : 'RCP'}-${bookingRef}.pdf`;
}
