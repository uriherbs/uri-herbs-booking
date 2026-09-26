// ============================================================
// src/app/page.tsx
// ============================================================
// Homepage. Layout ported from the uri-herbs-v0-design mockup
// (app/page.tsx: Hero, WorkshopCircles, Intro, GetInTouch), rebuilt
// for this project's actual stack — plain inline-style React
// components, no Tailwind/shadcn — and wired to real data
// (WorkshopCircles reads live workshops from Supabase) instead of
// the mockup's hardcoded arrays and separate booking demo.
//
// FloatingWhatsApp is already rendered once, site-wide, in
// src/app/layout.tsx, so it isn't repeated here.
// ============================================================

import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { Hero } from '@/components/home/Hero';
import { WorkshopCircles } from '@/components/home/WorkshopCircles';
import { Intro } from '@/components/home/Intro';
import { VideoMoment } from '@/components/home/VideoMoment';
import { GetInTouch } from '@/components/home/GetInTouch';
import { C, FONT_IMPORT, FONT_BODY } from '@/lib/theme';

// WorkshopCircles reads live is_active workshops from Supabase on
// every request (an admin can flip a workshop active/inactive at
// any time), so this page opts out of static generation rather
// than baking the list in at build time.
export const dynamic = 'force-dynamic';

export default function Home() {
  return (
    <div style={{ background: C.parchment, minHeight: '100vh', fontFamily: FONT_BODY }}>
      {/* dangerouslySetInnerHTML, not a text child — the Google
          Fonts URL has `&` in it, and React HTML-escapes text
          children the same in every element, but <style> is a "raw
          text" element the browser never entity-decodes, so an
          escaped `&amp;` as a literal child would mismatch what
          hydration writes and break the whole page. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            ${FONT_IMPORT}
            * { box-sizing: border-box; }
          `,
        }}
      />

      <SiteHeader />
      <main>
        <Hero />
        <WorkshopCircles />
        <Intro />
        <VideoMoment />
        <GetInTouch />
      </main>
      <SiteFooter />
    </div>
  );
}
