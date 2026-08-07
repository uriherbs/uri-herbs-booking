import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWorkshopPageData } from '@/lib/workshop-content-service';
import SiteHeader from '@/components/SiteHeader';
import * as React from 'react';

const C = { sage: '#6B8F71', sageDark: '#4A7050', sageLight: '#E7EFEA', forest: '#2D4639', parchment: '#F8F5EF', gold: '#A89068', bark: '#5C4A3D', barkLight: '#8A7668' };
const E = React.createElement;

export default async function WorkshopPage({ params }: { params: { slug: string } }) {
    const w = await getWorkshopPageData(params.slug);
    if (!w) notFound();

  const blocks = w.content_blocks.map((b, i) =>
        E('div', { key: b.id, className: 'wblock ' + (i % 2 ? 'rev' : '') },
                b.image_url ? E('div', { className: 'wimg', style: { borderRadius: 16, overflow: 'hidden', aspectRatio: '4/3' } },
                                        E('img', { src: b.image_url, alt: b.title, style: { width: '100%', height: '100%', objectFit: 'cover' } })

                                     ) : null,
                E('div', null,
                          E('div', { style: { width: 32, height: 3, background: C.gold, marginBottom: 14 } }),
                          E('h2', { style: { fontFamily: "'Crimson Pro'", fontSize: 26, fontWeight: 700, color: C.forest, margin: '0 0 12px' } }, b.title),
                          E('p', { style: { fontSize: 16, lineHeight: 1.75, color: C.bark, margin: 0 } }, b.body)
                        )
              )
                                        );

  const galleryItems = w.gallery.map((g) =>
        E('div', { key: g.id, style: { borderRadius: 12, overflow: 'hidden', aspectRatio: '1' } },
                g.media_type === 'video'
                  ? E('video', { src: g.media_url, style: { width: '100%', height: '100%', objectFit: 'cover' }, muted: true, loop: true, playsInline: true })
                  : E('img', { src: g.media_url, alt: '', style: { width: '100%', height: '100%', objectFit: 'cover' } })
              )
                                       );

  return E('div', { style: { background: C.parchment, fontFamily: "'DM Sans', sans-serif" } },
               E('style', null, `@import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@700&family=DM+Sans:wght@400;600;700&display=swap'); * { box-sizing: border-box; } a { text-decoration: none; } .wblock { display: grid; gap: 24px; margin-bottom: 48px; } @media (min-width: 760px) { .wblock { grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; } .wblock.rev .wimg { order: 2; } }`),

               E(SiteHeader),

               E('div', { style: { position: 'relative', height: '48vw', minHeight: 300, maxHeight: 480 } },
                       w.hero_image_url ? E('img', { src: w.hero_image_url, alt: w.name, style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } }) : null,
                       E('div', { style: { position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(45,70,57,0) 40%, rgba(20,30,24,.75) 100%)' } }),
                       E('div', { style: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 24px 32px', maxWidth: 1000, margin: '0 auto' } },
                                 E('h1', { style: { fontFamily: "'Crimson Pro'", fontWeight: 700, color: '#fff', fontSize: 'clamp(32px,6vw,52px)', margin: 0 } }, w.name)
                               )
                     ),

               w.intro_paragraph ? E('div', { style: { maxWidth: 700, margin: '0 auto', padding: '44px 24px 8px' } },
                                           E('p', { style: { fontFamily: "'Crimson Pro'", fontSize: 21, lineHeight: 1.6, color: C.bark, margin: 0 } }, w.intro_paragraph)
                                         ) : null,

               E('div', { style: { maxWidth: 1000, margin: '0 auto', padding: '32px 24px 0' } }, blocks),

               w.takeaway_description ? E('div', { style: { maxWidth: 1000, margin: '0 auto', padding: '8px 24px 44px' } },
                                                E('div', { style: { background: C.sageLight, borderRadius: 16, padding: '22px 26px', borderLeft: '4px solid ' + C.sage } },
                                                          E('div', { style: { fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: C.sageDark, marginBottom: 6 } }, "You'll take home"),
                                                          E('p', { style: { fontSize: 16, color: C.forest, margin: 0, lineHeight: 1.6 } }, w.takeaway_description)
                                                        )
                                              ) : null,

               w.gallery.length > 0 ? E('div', { style: { maxWidth: 1000, margin: '0 auto', padding: '8px 24px 44px' } },
                                              E('h2', { style: { fontFamily: "'Crimson Pro'", fontSize: 22, fontWeight: 700, color: C.forest, marginBottom: 18 } }, 'Gallery'),
                                              E('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 12 } }, galleryItems)
                                            ) : null,

               E('div', { style: { maxWidth: 1000, margin: '0 auto', padding: '16px 24px 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' } },
                       w.price_thb != null ? E('div', { style: { fontFamily: "'Crimson Pro'", fontSize: 30, fontWeight: 700, color: C.gold } },
                                                       '฿' + w.price_thb.toLocaleString(),
                                                       E('span', { style: { fontSize: 14, fontWeight: 400, color: C.barkLight, marginLeft: 8 } }, 'per person, ' + w.duration_minutes + ' min')
                                                     ) : null,
                       E(Link, { href: '/book', style: { background: C.forest, color: '#fff', padding: '15px 34px', borderRadius: 12, fontWeight: 700, fontSize: 16 } }, 'Book This Workshop')
                     )
             );
}
