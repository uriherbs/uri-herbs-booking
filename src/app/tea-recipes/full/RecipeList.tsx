'use client';

// The 13 recipes on /tea-recipes/full. Each recipe can have two vertical
// videos: the fresh-herb version and the dried tea-bag version. A button
// appears for each video that exists and opens it inside the card;
// recipes without videos look like a plain list item.

import { useState } from 'react';
import type { Recipe } from '@/lib/landing-pages';
import { C, FONT_DISPLAY } from '@/lib/theme';
import YouTubeLite from './YouTubeLite';

type Kind = 'fresh' | 'teabag';
const LABEL: Record<Kind, string> = { fresh: '▶ Fresh herbs video', teabag: '▶ Tea bag video' };

export default function RecipeList({ recipes }: { recipes: Recipe[] }) {
  const [open, setOpen] = useState<{ name: string; kind: Kind } | null>(null);
  return (
    <ol className="rp-list">
      {recipes.map((r, i) => {
        const videos: [Kind, string | undefined][] = [['fresh', r.videoFresh], ['teabag', r.videoTeaBag]];
        const available = videos.filter(([, id]) => !!id) as [Kind, string][];
        const current = open?.name === r.name ? available.find(([k]) => k === open.kind) : undefined;
        return (
          <li key={r.name} style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 14, padding: '14px 16px', gridColumn: current ? '1 / -1' : undefined }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
              <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 700, color: C.sage, minWidth: 30 }}>{String(i + 1).padStart(2, '0')}</span>
              <span style={{ flex: 1 }}>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 16 }}>{r.name}</span>
                <span style={{ display: 'block', fontSize: 14, color: C.barkLight, marginTop: 2 }}>{r.tagline}</span>
                {available.length > 0 && (
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                    {available.map(([kind]) => {
                      const active = current?.[0] === kind;
                      return (
                        <button
                          key={kind}
                          type="button"
                          onClick={() => setOpen(active ? null : { name: r.name, kind })}
                          aria-expanded={active}
                          style={{ background: active ? C.sageLight : C.forest, color: active ? C.forest : C.white, border: 'none', borderRadius: 999, padding: '8px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                        >
                          {active ? 'Close video' : LABEL[kind]}
                        </button>
                      );
                    })}
                  </span>
                )}
              </span>
            </div>
            {current && (
              <div style={{ marginTop: 14 }}>
                <YouTubeLite
                  key={current[1]}
                  id={current[1]}
                  title={`How to make ${r.name} (${current[0] === 'fresh' ? 'fresh herbs' : 'tea bag'})`}
                  maxWidth={320}
                />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
