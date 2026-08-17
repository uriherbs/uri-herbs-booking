// ============================================================
// src/lib/legal-pdf.tsx
// ============================================================
// PDF renderer for a LegalDoc — the PDF counterpart to
// src/components/legal/LegalBlocks.tsx (the web/HTML renderer).
// Both read the exact same data (src/lib/legal-content.ts); neither
// owns any legal text of its own. Called fresh on every request by
// the /api/legal/[doc]/pdf route — nothing here is pre-generated or
// cached, so the PDF can never go stale relative to the live pages.
//
// Uses only the 14 standard PDF fonts (Times-Roman/Helvetica
// families) — always built into every PDF reader, zero network
// fetch required. A closer match to the site's actual Crimson Pro /
// DM Sans webfonts would need registering real font files, which
// means a runtime fetch to Google Fonts from inside the serverless
// function on every PDF request — not worth the fragility for a
// document whose job is to be read and printed, not to be a pixel
// match for the web page. Colors and layout still carry the brand.
// ============================================================

import { Document, Page, Text, View, Image, Link, StyleSheet } from '@react-pdf/renderer';
import path from 'path';
import type { LegalDoc, LegalBlock, LegalRun } from './legal-content';
import { SHOP_NAME } from './legal-content';

const COLOR = {
  forest: '#2D4639',
  sage: '#6B8F71',
  sageDark: '#4A7050',
  gold: '#A89068',
  bark: '#5C4A3D',
  barkLight: '#8A7668',
  sand: '#E8E2D8',
  parchment: '#F8F5EF',
};

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontFamily: 'Helvetica', fontSize: 10.5, color: COLOR.bark, lineHeight: 1.5 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
  logo: { width: 26, height: 26, borderRadius: 13 },
  headerName: { fontFamily: 'Times-Bold', fontSize: 12, color: COLOR.forest },
  title: { fontFamily: 'Times-Bold', fontSize: 24, color: COLOR.forest, marginBottom: 12 },
  effectiveDate: { fontSize: 9, color: COLOR.barkLight, marginBottom: 22 },
  tocBox: { backgroundColor: '#FAF8F3', borderWidth: 1, borderColor: COLOR.sand, borderRadius: 6, padding: 14, marginBottom: 26 },
  tocLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLOR.barkLight, letterSpacing: 1, marginBottom: 8 },
  tocRow: { flexDirection: 'row', marginBottom: 4 },
  tocNum: { fontFamily: 'Helvetica-Bold', color: COLOR.gold, width: 20 },
  section: { marginBottom: 16 },
  heading: { fontFamily: 'Times-Bold', fontSize: 13.5, color: COLOR.forest, marginBottom: 6 },
  headingNum: { color: COLOR.gold },
  paragraph: { marginBottom: 8 },
  listRow: { flexDirection: 'row', marginBottom: 5, paddingRight: 4 },
  bullet: { width: 12, color: COLOR.gold },
  listText: { flex: 1 },
  link: { color: COLOR.sageDark, textDecoration: 'underline' },
  contactBox: { borderWidth: 1, borderColor: COLOR.sand, borderRadius: 6, padding: 10, marginTop: 4, marginBottom: 8 },
  contactLine: { marginBottom: 3 },
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 8, color: COLOR.barkLight },
});

// react-pdf's own Style/StyleProp types aren't part of its public
// export surface, so `any` here is the pragmatic choice rather than
// reaching into @react-pdf/types' internals for a small helper.
function Runs({ runs, style }: { runs: LegalRun[]; style?: any }) {
  return (
    <Text style={style}>
      {runs.map((run, i) =>
        typeof run === 'string' ? (
          <Text key={i}>{run}</Text>
        ) : (
          <Link key={i} src={run.href} style={styles.link}>{run.text}</Link>
        )
      )}
    </Text>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (block.type === 'paragraph') {
    return <Runs runs={block.runs} style={styles.paragraph} />;
  }
  if (block.type === 'list') {
    return (
      <View>
        {block.items.map((runs, i) => (
          <View key={i} style={styles.listRow}>
            <Text style={styles.bullet}>•</Text>
            <Runs runs={runs} style={styles.listText} />
          </View>
        ))}
      </View>
    );
  }
  // 'contact'
  return (
    <View style={styles.contactBox}>
      <Link src={`mailto:${block.email}`} style={[styles.link, styles.contactLine]}>{block.email}</Link>
      <Link src={`tel:${block.phone.replace(/\s/g, '')}`} style={[{ color: COLOR.forest }, styles.contactLine]}>{block.phone}</Link>
      {block.address && <Text style={{ color: COLOR.barkLight, fontSize: 9.5 }}>{block.address}</Text>}
    </View>
  );
}

export function LegalPdfDocument({ doc }: { doc: LegalDoc }) {
  // public/ files are readable directly by file path when rendering
  // server-side (this route runs in the Node runtime, not Edge).
  const logoPath = path.join(process.cwd(), 'public', 'uri-herbs-logo.jpg');

  return (
    <Document title={`${doc.title} — ${SHOP_NAME}`} author={SHOP_NAME}>
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerRow}>
          <Image src={logoPath} style={styles.logo} />
          <Text style={styles.headerName}>{SHOP_NAME}</Text>
        </View>

        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.effectiveDate}>Effective {doc.effectiveDate}</Text>

        {/* Same jump-list structure as the web page — internal links
            jump to each section's anchor further down this document. */}
        <View style={styles.tocBox}>
          <Text style={styles.tocLabel}>ON THIS PAGE</Text>
          {doc.sections.map((s) => (
            <View key={s.id} style={styles.tocRow}>
              <Text style={styles.tocNum}>{s.number}.</Text>
              <Link src={`#pdf-${doc.slug}-${s.id}`} style={[styles.link, { fontFamily: 'Helvetica' }]}>
                {s.heading}
              </Link>
            </View>
          ))}
        </View>

        {doc.sections.map((s) => (
          <View key={s.id} style={styles.section} id={`pdf-${doc.slug}-${s.id}`} wrap={false}>
            <Text style={styles.heading}>
              <Text style={styles.headingNum}>{s.number}. </Text>
              {s.heading}
            </Text>
            {s.blocks.map((block, i) => <Block key={i} block={block} />)}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>{SHOP_NAME} — {doc.title}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
