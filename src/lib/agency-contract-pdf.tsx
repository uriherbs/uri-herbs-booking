// ============================================================
// src/lib/agency-contract-pdf.tsx  (server-only)
// ============================================================
// PDF of a SIGNED agency agreement. Built from `agencies.contract_snapshot`
// — the exact plain text the agency accepted (agency details, terms,
// rates, signature line) — so the PDF can never differ from what was
// signed, even if the contract wording changes later.
//
// Replaces the old "Print / save as PDF" button (window.print), which
// does nothing in the in-app browsers phones open email links in.
//
// Fonts: Noto Sans (Latin) with Noto Sans Thai, SC and TC as
// per-character fallbacks, so agency names/addresses typed in Thai or
// Chinese and the ฿ sign all print. Files live in assets/fonts (SIL OFL,
// bundled with these routes via outputFileTracingIncludes in
// next.config.js) — no network fetch at render time.
// ============================================================

import { Document, Page, Text, View, Image, StyleSheet, Font, renderToBuffer } from '@react-pdf/renderer';
import path from 'path';
import { BUSINESS } from './agency-contract';

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts');
const f = (file: string) => path.join(FONT_DIR, file);
Font.register({ family: 'NotoSans', fonts: [
  { src: f('NotoSans-Regular.ttf'), fontWeight: 400 },
  { src: f('NotoSans-Bold.ttf'), fontWeight: 700 },
] });
Font.register({ family: 'NotoSansThai', fonts: [
  { src: f('NotoSansThai-Regular.ttf'), fontWeight: 400 },
  { src: f('NotoSansThai-Bold.ttf'), fontWeight: 700 },
] });
// Chinese: regular only — also registered as 700 so bold text falls back cleanly.
Font.register({ family: 'NotoSansSC', fonts: [
  { src: f('NotoSansSC-Regular.otf'), fontWeight: 400 },
  { src: f('NotoSansSC-Regular.otf'), fontWeight: 700 },
] });
Font.register({ family: 'NotoSansTC', fonts: [
  { src: f('NotoSansTC-Regular.otf'), fontWeight: 400 },
  { src: f('NotoSansTC-Regular.otf'), fontWeight: 700 },
] });
Font.registerHyphenationCallback(word => [word]); // never split words (Thai/Chinese have no spaces)
const FAMILY = ['NotoSans', 'NotoSansThai', 'NotoSansSC', 'NotoSansTC'];

const COLOR = {
  forest: '#2D4639', sageDark: '#4A7050', gold: '#A89068',
  bark: '#5C4A3D', barkLight: '#8A7668', sand: '#E8E2D8', panel: '#FAF8F3',
};

const styles = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 54, paddingHorizontal: 46, fontFamily: FAMILY as any, fontSize: 9.5, color: COLOR.bark, lineHeight: 1.45 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  logo: { width: 26, height: 26, borderRadius: 13 },
  headerName: { fontWeight: 700, fontSize: 11.5, color: COLOR.forest },
  title: { fontWeight: 700, fontSize: 19, lineHeight: 1.2, color: COLOR.forest, marginBottom: 6 },
  version: { fontSize: 8.5, color: COLOR.barkLight, marginBottom: 16 },
  heading: { fontWeight: 700, fontSize: 12, color: COLOR.forest, marginTop: 12, marginBottom: 5 },
  subheading: { fontWeight: 700, fontSize: 9.5, color: COLOR.bark, marginTop: 6, marginBottom: 3 },
  box: { backgroundColor: COLOR.panel, borderWidth: 1, borderColor: COLOR.sand, borderRadius: 6, paddingVertical: 8, paddingHorizontal: 10 },
  detailRow: { flexDirection: 'row', marginBottom: 2 },
  detailKey: { width: 150, color: COLOR.barkLight },
  detailVal: { flex: 1, color: COLOR.forest },
  listRow: { flexDirection: 'row', marginBottom: 4, paddingRight: 4 },
  bullet: { width: 11, color: COLOR.gold },
  listText: { flex: 1 },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2, gap: 8 },
  signature: { marginTop: 16, borderWidth: 1, borderColor: COLOR.sageDark, borderRadius: 6, padding: 10, color: COLOR.forest },
  footerLeft: { position: 'absolute', bottom: 22, left: 46, fontSize: 7.5, color: COLOR.barkLight },
});


type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'sub'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'detail'; key: string; value: string }
  | { kind: 'rate'; label: string; value: string }
  | { kind: 'text'; text: string };

function parse(lines: string[]): Block[] {
  const out: Block[] = [];
  let section = '';
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) continue;
    if (line.startsWith('- ')) { out.push({ kind: 'bullet', text: line.slice(2) }); continue; }
    if (line.startsWith('  ')) {
      const t = line.trim();
      const i = t.indexOf(': ');
      if (section === 'AGENCY DETAILS' && i > 0) out.push({ kind: 'detail', key: t.slice(0, i), value: t.slice(i + 2) });
      else if (i > 0) out.push({ kind: 'rate', label: t.slice(0, i), value: t.slice(i + 2) });
      else out.push({ kind: 'text', text: t });
      continue;
    }
    const bare = line.replace(/\(.*?\)/g, ''); // "RATE TABLE (per person)"
    if (/[A-Z]/.test(bare) && bare === bare.toUpperCase()) { section = line; out.push({ kind: 'heading', text: line }); continue; }
    if (/:$/.test(line)) { out.push({ kind: 'sub', text: prettyDate(line.slice(0, -1)) }); continue; }
    out.push({ kind: 'text', text: line });
  }
  return out;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// "Workshops from 2027-01-01" → "Workshops from 1 January 2027"
const prettyDate = (s: string) => s.replace(/(\d{4})-(\d{2})-(\d{2})/, (_, y, m, d) => `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`);

// "1. PARTIES" → "1. Parties"
const titleCase = (s: string) => s.toLowerCase().replace(/[a-z]/, c => c.toUpperCase());

function AgencyContractPdf({ snapshot }: { snapshot: string }) {
  const all = snapshot.split('\n');
  const title = all[0] || 'AGENCY AGREEMENT';
  const version = /^Version /.test(all[1] || '') ? all[1] : '';
  const body = all.slice(version ? 2 : 1);
  // The signature ("Accepted electronically by …") is the last paragraph.
  const sigAt = body.findIndex(l => l.startsWith('Accepted electronically by'));
  const blocks = parse(sigAt >= 0 ? body.slice(0, sigAt) : body);
  const signature = sigAt >= 0 ? body.slice(sigAt).filter(l => l.trim()).join(' ') : '';
  const logoPath = path.join(process.cwd(), 'public', 'uri-herbs-logo.jpg');

  // Group consecutive detail rows into one box.
  const rendered: JSX.Element[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.kind === 'detail') {
      const rows: { key: string; value: string }[] = [];
      while (i < blocks.length && blocks[i].kind === 'detail') { rows.push(blocks[i] as any); i++; }
      i--;
      rendered.push(
        <View key={`d${i}`} style={styles.box} wrap={false}>
          {rows.map((r, j) => (
            <View key={j} style={styles.detailRow}>
              <Text style={styles.detailKey}>{r.key}</Text>
              <Text style={styles.detailVal}>{r.value}</Text>
            </View>
          ))}
        </View>
      );
      continue;
    }
    if (b.kind === 'heading') rendered.push(<Text key={i} style={styles.heading} minPresenceAhead={40}>{titleCase(b.text)}</Text>);
    else if (b.kind === 'sub') rendered.push(<Text key={i} style={styles.subheading}>{b.text}</Text>);
    else if (b.kind === 'bullet') rendered.push(
      <View key={i} style={styles.listRow} wrap={false}>
        <Text style={styles.bullet}>•</Text>
        <Text style={styles.listText}>{b.text}</Text>
      </View>
    );
    else if (b.kind === 'rate') rendered.push(
      <View key={i} style={styles.rateRow} wrap={false}>
        <Text style={{ flex: 1 }}>{b.label}</Text>
        <Text>{b.value}</Text>
      </View>
    );
    else if (b.kind === 'text') rendered.push(<Text key={i} style={{ marginBottom: 4 }}>{b.text}</Text>);
  }

  return (
    <Document title={title} author={BUSINESS.name}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <Image src={logoPath} style={styles.logo} />
          <Text style={styles.headerName}>{BUSINESS.name}</Text>
        </View>
        <Text style={styles.title}>{titleCase(title.split(' — ')[0])}</Text>
        {title.includes(' — ') ? <Text style={[styles.headerName, { marginBottom: 2 }]}>{title.split(' — ').slice(1).join(' — ')}</Text> : null}
        {version ? <Text style={styles.version}>{version}</Text> : null}
        {rendered}
        {signature ? <Text style={styles.signature} wrap={false}>{signature}</Text> : null}
        <Text style={styles.footerLeft} fixed>{`${BUSINESS.name} (${BUSINESS.legal}) · ${BUSINESS.email} · ${BUSINESS.phone}`}</Text>
      </Page>
    </Document>
  );
}

export async function agencyContractPdf(snapshot: string): Promise<Buffer> {
  return renderToBuffer(<AgencyContractPdf snapshot={snapshot} />);
}

export function agencyContractPdfName(company: string): string {
  const slug = company.normalize('NFKD').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'Agency';
  return `Uri-Herbs-Agency-Agreement-${slug}.pdf`;
}
