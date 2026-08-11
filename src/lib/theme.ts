// ============================================================
// src/lib/theme.ts
// ============================================================
// Shared design tokens for the public marketing pages (Home,
// Contact, Blog, Workshops). Every page on the site currently
// re-declares its own local `C` color object with the same
// values (see SiteHeader.tsx, app/contact/page.tsx, etc.) — this
// file exists so *new* components can import one source of truth
// instead of adding yet another copy. Existing pages are left
// untouched; feel free to migrate them here later.
//
// No Tailwind/CSS-in-JS library in this project — components style
// themselves with plain inline `style` objects (+ an occasional
// `<style>` tag for things inline styles can't do, like media
// queries and the Google Fonts @import). Keep following that
// pattern for anything new.
// ============================================================

export const C = {
  sage: '#6B8F71',
  sageDark: '#4A7050',
  sageLight: '#E7EFEA',
  forest: '#2D4639',
  parchment: '#F8F5EF',
  white: '#FFFFFF',
  gold: '#A89068',
  bark: '#5C4A3D',
  barkLight: '#8A7668',
  sand: '#E8E2D8',
} as const;

// Same Google Fonts pairing already loaded by every other page —
// Crimson Pro for display/serif headings, DM Sans for body text.
//
// No quotes around the url() — CSS doesn't require them here, and
// a quote character as literal text inside a <style> tag trips a
// React SSR/hydration mismatch: <style> is an HTML "raw text"
// element (like <script>), so the browser does NOT decode entities
// in its text content, but React's SSR serializer HTML-escapes '
// to &#x27; the same way it would in any other element. The server
// HTML ends up with a literal "&#x27;" in the parsed CSS text while
// client-side hydration writes the real "'" — a genuine mismatch.
export const FONT_IMPORT =
  '@import url(https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,700;1,600&family=DM+Sans:wght@400;500;600;700&display=swap);';

export const FONT_DISPLAY = "'Crimson Pro', serif";
export const FONT_BODY = "'DM Sans', sans-serif";
