// ============================================================
// src/components/legal/LegalBlocks.tsx
// ============================================================
// Renders the plain-data LegalBlock[] (src/lib/legal-content.ts) to
// HTML/JSX. This is the WEB renderer — src/lib/legal-pdf.tsx is the
// PDF renderer for the exact same data. Neither one owns the content;
// both just map it to their own output.
//
// No 'use client' — this has no hooks or browser-only APIs, so it
// stays usable as a plain Server Component on /terms and /privacy
// (keeps their client JS bundle small) while also working fine
// inside the client-side LegalModal.
// ============================================================

import type { LegalBlock, LegalRun } from '@/lib/legal-content';
import { ContactCard } from './LegalTheme';

function RunText({ run }: { run: LegalRun }) {
  if (typeof run === 'string') return <>{run}</>;
  const isExternal = run.href.startsWith('http');
  return (
    <a href={run.href} target={isExternal ? '_blank' : undefined} rel={isExternal ? 'noopener noreferrer' : undefined}>
      {run.text}
    </a>
  );
}

export function LegalBlocks({ blocks }: { blocks: LegalBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === 'paragraph') {
          return (
            <p key={i}>
              {block.runs.map((run, j) => <RunText key={j} run={run} />)}
            </p>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={i}>
              {block.items.map((runs, j) => (
                <li key={j}>
                  {runs.map((run, k) => <RunText key={k} run={run} />)}
                </li>
              ))}
            </ul>
          );
        }
        // 'contact'
        return <ContactCard key={i} email={block.email} phone={block.phone} address={block.address} />;
      })}
    </>
  );
}
