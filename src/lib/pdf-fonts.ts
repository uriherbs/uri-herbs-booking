// ============================================================
// src/lib/pdf-fonts.ts  (server-only)
// ============================================================
// Fonts for server-made PDFs (agency agreement, invoice, receipt).
// Noto Sans (Latin) with Noto Sans Thai, SC and TC as per-character
// fallbacks, so names/addresses typed in Thai or Chinese and the ฿ sign
// all print. Files live in assets/fonts (SIL OFL) and are shipped with
// the routes that make PDFs via outputFileTracingIncludes in
// next.config.js — no network fetch at render time.
// ============================================================

import { Font } from '@react-pdf/renderer';
import path from 'path';

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts');
const f = (file: string) => path.join(FONT_DIR, file);

let registered = false;
export function registerPdfFonts() {
  if (registered) return;
  registered = true;
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
}

export const PDF_FAMILY = ['NotoSans', 'NotoSansThai', 'NotoSansSC', 'NotoSansTC'];
export const PDF_LOGO = path.join(process.cwd(), 'public', 'uri-herbs-logo.jpg');
