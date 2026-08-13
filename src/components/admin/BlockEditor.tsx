// ============================================================
// src/components/admin/BlockEditor.tsx
// ============================================================
// The dynamic add/remove/reorder content-block editor for
// /admin/content/blog/[slug] — stage 2 of the blog CMS (stage 1
// shipped post-level fields with a read-only block preview; see
// that page's git history). A blog post can have any number of
// blocks (11–18 in the existing "Wellness Tips" posts), unlike the
// workshop editor's fixed 4, so this is a real list editor: add a
// block of any type, reorder with ↑/↓ (no drag-and-drop — this
// project has no drag library and up/down buttons are simpler and
// fully keyboard/touch-accessible), and remove one.
//
// Purely a controlled list editor — `blocks` in, `onChange` out.
// The parent page owns the actual draft state and persists it via
// saveBlogContentBlocks() (admin-blog-service.ts) on Save; this
// component never talks to Supabase itself except for image
// uploads, which (like the hero image on the parent page) upload
// immediately so the preview shows the real result.
// ============================================================

'use client';

import { useRef, useState } from 'react';
import { uploadBlogImage, type BlogContentBlockType } from '@/lib/admin-blog-service';

const C = {
  sage: '#6B8F71',
  sageDark: '#4A7050',
  sageLight: '#E7EFEA',
  forest: '#2D4639',
  white: '#FFFFFF',
  bark: '#5C4A3D',
  barkLight: '#8A7668',
  sand: '#E8E2D8',
  mist: '#F0EDE6',
  coral: '#C07A6E',
};

// A block being edited. `key` is a stable React/list-identity key
// independent of `id` — new blocks have `id: null` until Save
// creates the real row, so `id` alone can't key the list (multiple
// new blocks would collide on `null`).
export interface EditableBlock {
  key: string;
  id: string | null;
  block_type: BlogContentBlockType;
  text_content: string;
  image_url: string | null;
  image_alt: string;
  caption: string;
  attribution: string;
}

let keySeq = 0;
function newKey(): string {
  keySeq += 1;
  return `new-${Date.now()}-${keySeq}`;
}

export function emptyBlock(block_type: BlogContentBlockType = 'paragraph'): EditableBlock {
  return { key: newKey(), id: null, block_type, text_content: '', image_url: null, image_alt: '', caption: '', attribution: '' };
}

const BLOCK_TYPES: { value: BlogContentBlockType; label: string }[] = [
  { value: 'paragraph', label: 'Paragraph' },
  { value: 'heading', label: 'Heading' },
  { value: 'image', label: 'Image' },
  { value: 'quote', label: 'Quote' },
];

const TEXT_PLACEHOLDER: Record<BlogContentBlockType, string> = {
  paragraph: "Write this block's paragraph…",
  heading: 'Section heading…',
  quote: 'A short standout quote or callout…',
  image: '',
};

function ImagePlaceholderIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={C.barkLight} strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M21 15l-5-5-11 9" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.bark} strokeWidth="2.2">
      <path d="M12 15V3M7 8l5-5 5 5" /><path d="M4 17v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
    </svg>
  );
}

function BlockImagePreview({ url, uploading }: { url: string | null; uploading: boolean }) {
  return (
    <div style={{
      width: 60, height: 60, borderRadius: 10, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      background: url ? undefined : C.mist,
      border: url ? `1px solid ${C.sand}` : `1.5px dashed ${C.sand}`,
      position: 'relative',
    }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <ImagePlaceholderIcon />
      )}
      {uploading && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, fontWeight: 600, color: C.bark,
        }}>…</div>
      )}
    </div>
  );
}

const smallInputStyle: React.CSSProperties = {
  width: '100%', fontSize: 13, color: C.bark, background: C.white,
  border: `1.5px solid ${C.sand}`, borderRadius: 8, padding: '8px 11px', fontFamily: "'DM Sans', sans-serif",
};

function reorderButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: C.white, border: `1.5px solid ${C.sand}`, borderRadius: 7,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.35 : 1,
  };
}

interface BlockEditorProps {
  blocks: EditableBlock[];
  onChange: (blocks: EditableBlock[]) => void;
  postSlug: string;
}

export function BlockEditor({ blocks, onChange, postSlug }: BlockEditorProps) {
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const update = (key: string, patch: Partial<EditableBlock>) => {
    onChange(blocks.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  };

  const move = (key: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.key === key);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  const remove = (key: string) => {
    const block = blocks.find((b) => b.key === key);
    // Only confirm for blocks that already exist in the DB — an
    // unsaved block the admin just added costs nothing to re-add.
    if (block?.id && !confirm('Remove this block? It will be deleted when you Save Changes.')) return;
    onChange(blocks.filter((b) => b.key !== key));
  };

  const add = (block_type: BlogContentBlockType) => {
    onChange([...blocks, emptyBlock(block_type)]);
  };

  const handleImageUpload = async (key: string, file: File) => {
    setUploading((prev) => ({ ...prev, [key]: true }));
    try {
      const url = await uploadBlogImage(file, postSlug);
      update(key, { image_url: url });
    } catch (err: any) {
      alert(`Couldn't upload image: ${err.message}`);
    } finally {
      setUploading((prev) => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {blocks.length === 0 && (
        <div style={{ padding: '9px 12px', borderRadius: 10, background: C.mist, fontSize: 12, color: C.barkLight }}>
          No content blocks yet — add one below.
        </div>
      )}

      {blocks.map((b, i) => (
        <div key={b.key} style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 9 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.barkLight, width: 18, flexShrink: 0 }}>#{i + 1}</span>
            <select
              value={b.block_type}
              onChange={(e) => update(b.key, { block_type: e.target.value as BlogContentBlockType })}
              style={{
                fontSize: 12.5, fontWeight: 700, color: C.sageDark, background: C.sageLight,
                border: 'none', borderRadius: 7, padding: '6px 8px', cursor: 'pointer',
              }}
            >
              {BLOCK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 5 }}>
              <button type="button" onClick={() => move(b.key, -1)} disabled={i === 0} aria-label="Move up" style={reorderButtonStyle(i === 0)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.bark} strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
              </button>
              <button type="button" onClick={() => move(b.key, 1)} disabled={i === blocks.length - 1} aria-label="Move down" style={reorderButtonStyle(i === blocks.length - 1)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.bark} strokeWidth="2.5"><path d="M12 5v14M5 12l7 7 7-7" /></svg>
              </button>
              <button type="button" onClick={() => remove(b.key)} aria-label="Remove block" style={{
                width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: '#FFF5F3', border: '1.5px solid rgba(192,122,110,0.3)', borderRadius: 7, cursor: 'pointer',
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.coral} strokeWidth="2.2"><path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m2 0l-1 13a2 2 0 01-2 2H9a2 2 0 01-2-2L6 7" /></svg>
              </button>
            </div>
          </div>

          {b.block_type === 'image' ? (
            <>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <BlockImagePreview url={b.image_url} uploading={!!uploading[b.key]} />
                <input
                  ref={(el) => { fileInputRefs.current[b.key] = el; }}
                  type="file" accept="image/*" hidden
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(b.key, f); e.target.value = ''; }}
                />
                <button type="button" onClick={() => fileInputRefs.current[b.key]?.click()} disabled={!!uploading[b.key]} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: C.white, border: `1.5px solid ${C.sand}`, color: C.bark,
                  fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 8, cursor: uploading[b.key] ? 'default' : 'pointer',
                }}>
                  <UploadIcon /> {b.image_url ? 'Replace' : 'Upload'}
                </button>
              </div>
              <input type="text" value={b.image_alt} onChange={(e) => update(b.key, { image_alt: e.target.value })} placeholder="Alt text (for accessibility)" style={smallInputStyle} />
              <input type="text" value={b.caption} onChange={(e) => update(b.key, { caption: e.target.value })} placeholder="Caption (optional)" style={smallInputStyle} />
            </>
          ) : (
            <textarea
              rows={b.block_type === 'heading' ? 1 : 3}
              value={b.text_content}
              onChange={(e) => update(b.key, { text_content: e.target.value })}
              placeholder={TEXT_PLACEHOLDER[b.block_type]}
              style={{ ...smallInputStyle, resize: 'none', lineHeight: 1.55 }}
            />
          )}

          {b.block_type === 'quote' && (
            <input type="text" value={b.attribution} onChange={(e) => update(b.key, { attribution: e.target.value })} placeholder="Attribution (optional)" style={smallInputStyle} />
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {BLOCK_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => add(t.value)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              background: C.white, border: `1.5px dashed ${C.sand}`, color: C.bark,
              fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 9, cursor: 'pointer',
            }}
          >
            + {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
