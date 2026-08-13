// ============================================================
// src/app/admin/(protected)/content/[slug]/page.tsx
// ============================================================
// Workshop Content (CMS) — edit screen. Hero image + intro
// paragraph + exactly 4 content blocks, one "Save Changes" button
// that saves everything together (see saveWorkshopContent()).
//
// Local component state holds the DRAFT — it's seeded from the
// fetched workshop on load, edited freely, and only written back
// to Supabase when the admin taps Save. Image uploads are the one
// exception: a chosen file is uploaded to Storage immediately (so
// the preview can show the real result), but the workshop/block
// row itself isn't updated until Save.
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminWorkshopEditor } from '@/lib/hooks';
import { saveWorkshopContent, uploadWorkshopImage } from '@/lib/admin-content-service';
import type { AdminContentBlock } from '@/lib/admin-content-service';

const C = {
  sage: '#6B8F71',
  sageDark: '#4A7050',
  sageLight: '#E7EFEA',
  sagePale: '#F2F7F3',
  forest: '#2D4639',
  parchment: '#F5F2EC',
  white: '#FFFFFF',
  gold: '#A89068',
  bark: '#5C4A3D',
  barkLight: '#8A7668',
  sand: '#E8E2D8',
  mist: '#F0EDE6',
  coral: '#C07A6E',
};

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.bark} strokeWidth="2.2">
      <path d="M12 15V3M7 8l5-5 5 5" /><path d="M4 17v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
    </svg>
  );
}

function ImagePlaceholderIcon({ size = 18, color = C.barkLight }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.6">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path d="M21 15l-5-5-11 9" />
    </svg>
  );
}

function ImagePreview({ url, size, uploading }: { url: string | null; size: number; uploading: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size > 60 ? 12 : 8, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      background: url ? undefined : C.mist,
      border: url ? `1px solid ${C.sand}` : `1.5px dashed ${C.sand}`,
      position: 'relative',
    }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <ImagePlaceholderIcon size={size > 60 ? 30 : 16} />
      )}
      {uploading && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 600, color: C.bark,
        }}>Uploading…</div>
      )}
    </div>
  );
}

export default function WorkshopContentEditPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug;
  const { workshop, loading, error, refresh } = useAdminWorkshopEditor(slug ?? null);

  const [intro, setIntro] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<AdminContentBlock[]>([]);
  const [heroUploading, setHeroUploading] = useState(false);
  const [blockUploading, setBlockUploading] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedJustNow, setSavedJustNow] = useState(false);

  const heroInputRef = useRef<HTMLInputElement>(null);
  const blockInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Seed the draft from the fetched workshop — runs on initial load and
  // again after a successful Save (via refresh()), so newly-created
  // blocks pick up their real database ids for the next edit.
  useEffect(() => {
    if (!workshop) return;
    setIntro(workshop.intro_paragraph ?? '');
    setHeroImageUrl(workshop.hero_image_url);
    setBlocks(workshop.blocks);
  }, [workshop]);

  const handleHeroUpload = async (file: File) => {
    if (!slug) return;
    setHeroUploading(true);
    setSaveError(null);
    try {
      const url = await uploadWorkshopImage(file, slug);
      setHeroImageUrl(url);
    } catch (err: any) {
      alert(`Couldn't upload image: ${err.message}`);
    } finally {
      setHeroUploading(false);
    }
  };

  const handleBlockUpload = async (index: number, file: File) => {
    if (!slug) return;
    setBlockUploading((prev) => ({ ...prev, [index]: true }));
    setSaveError(null);
    try {
      const url = await uploadWorkshopImage(file, slug);
      setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, image_url: url } : b)));
    } catch (err: any) {
      alert(`Couldn't upload image: ${err.message}`);
    } finally {
      setBlockUploading((prev) => ({ ...prev, [index]: false }));
    }
  };

  const updateBlock = (index: number, field: 'title' | 'body', value: string) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  };

  const handleSave = async () => {
    if (!workshop) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveWorkshopContent(workshop.id, { intro_paragraph: intro, hero_image_url: heroImageUrl }, blocks);
      await refresh();
      setSavedJustNow(true);
      setTimeout(() => setSavedJustNow(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !workshop) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.parchment, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: C.barkLight }}>Loading…</span>
      </div>
    );
  }

  if (error || !workshop) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.parchment, padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
        <p style={{ color: C.coral, fontSize: 14 }}>{error || 'Workshop not found.'}</p>
        <button onClick={() => router.push('/admin/content')} style={{ color: C.sage, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, textDecoration: 'underline' }}>
          Back to workshop content
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.parchment, fontFamily: "'DM Sans', sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url(https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&display=swap);
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        button:active { transform: scale(0.98); }
        textarea, input[type="text"] { font-family: 'DM Sans', sans-serif; }
        textarea:focus, input[type="text"]:focus { outline: none; border-color: ${C.sage}; }
      ` }} />

      <div style={{ background: C.forest, padding: '18px 16px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="#fff" opacity="0.9"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22.5C7.76 17.66 9.41 12.67 18 11.18V14C21.78 10.58 20 2 20 2S13.21 4.58 17 8Z" /></svg>
        <span style={{ fontFamily: "'Crimson Pro'", fontSize: 19, fontWeight: 700, color: C.white }}>Uri Herbs Admin</span>
      </div>

      <div style={{ background: C.white, borderBottom: `1px solid ${C.sand}`, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => router.push('/admin/content')} aria-label="Back to workshop list" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8, background: C.sagePale, flexShrink: 0, border: 'none', cursor: 'pointer',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 700, color: C.forest }}>{workshop.name}</div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 11.5, color: C.barkLight }}>{workshop.slug} · editing</div>
        </div>
      </div>

      <div style={{ padding: '18px 16px 110px', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Hero image */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.barkLight, display: 'flex', justifyContent: 'space-between' }}>
            <span>Hero Image</span>
            <span style={{ textTransform: 'none', fontWeight: 500, letterSpacing: 0 }}>shown at the top of the public page</span>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <ImagePreview url={heroImageUrl} size={108} uploading={heroUploading} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
              <input ref={heroInputRef} type="file" accept="image/*" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleHeroUpload(f); e.target.value = ''; }} />
              <button type="button" onClick={() => heroInputRef.current?.click()} disabled={heroUploading} style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, justifyContent: 'center', width: 'fit-content',
                background: C.white, border: `1.5px solid ${C.sand}`, color: C.bark,
                fontSize: 13, fontWeight: 600, padding: '9px 14px', borderRadius: 9, cursor: heroUploading ? 'default' : 'pointer',
              }}>
                <UploadIcon /> {heroImageUrl ? 'Replace photo' : 'Upload photo'}
              </button>
              {!heroImageUrl && <span style={{ fontSize: 11.5, color: C.barkLight }}>No photo yet</span>}
            </div>
          </div>
        </div>

        {/* Intro paragraph */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.barkLight, display: 'flex', justifyContent: 'space-between' }}>
            <span>Intro Paragraph</span>
            <span style={{ textTransform: 'none', fontWeight: 500, letterSpacing: 0 }}>appears under the workshop title</span>
          </div>
          <textarea
            rows={4}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="Write the opening paragraph guests see when they open this workshop's page…"
            style={{ width: '100%', fontSize: 13.5, color: C.bark, background: C.white, border: `1.5px solid ${C.sand}`, borderRadius: 10, padding: '11px 13px', resize: 'none', lineHeight: 1.55 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: C.sand }} />
          <span style={{ fontFamily: "'Crimson Pro'", fontSize: 13.5, fontWeight: 600, color: C.barkLight }}>Content Blocks</span>
          <div style={{ flex: 1, height: 1, background: C.sand }} />
        </div>

        {/* 4 content blocks */}
        {blocks.map((block, i) => (
          <div key={i} style={{ background: C.white, border: `1px solid ${C.sand}`, borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6, background: C.sagePale, color: C.sageDark,
                fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.barkLight }}>Block Title</div>
            </div>
            <input
              type="text"
              value={block.title}
              onChange={(e) => updateBlock(i, 'title', e.target.value)}
              placeholder="e.g. What You'll Learn"
              style={{ width: '100%', fontSize: 14, fontWeight: 600, color: C.forest, background: C.white, border: `1.5px solid ${C.sand}`, borderRadius: 10, padding: '11px 13px' }}
            />
            <textarea
              rows={3}
              value={block.body}
              onChange={(e) => updateBlock(i, 'body', e.target.value)}
              placeholder="Write this block's paragraph…"
              style={{ width: '100%', fontSize: 13.5, color: C.bark, background: C.white, border: `1.5px solid ${C.sand}`, borderRadius: 10, padding: '11px 13px', resize: 'none', lineHeight: 1.55 }}
            />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <ImagePreview url={block.image_url} size={52} uploading={!!blockUploading[i]} />
              <input ref={(el) => { blockInputRefs.current[i] = el; }} type="file" accept="image/*" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBlockUpload(i, f); e.target.value = ''; }} />
              <button type="button" onClick={() => blockInputRefs.current[i]?.click()} disabled={!!blockUploading[i]} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: C.white, border: `1.5px solid ${C.sand}`, color: C.bark,
                fontSize: 12, fontWeight: 600, padding: '7px 12px', borderRadius: 8, cursor: blockUploading[i] ? 'default' : 'pointer',
              }}>
                <UploadIcon /> {block.image_url ? 'Replace' : 'Upload'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky save bar */}
      <div style={{
        position: 'sticky', bottom: 0,
        background: `linear-gradient(0deg, ${C.parchment} 60%, rgba(245,242,236,0))`,
        padding: '16px 16px 18px', marginTop: -90,
        display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11.5, color: saveError ? C.coral : C.barkLight }}>
          {saveError ? saveError : savedJustNow ? 'Saved ✓' : ' '}
        </span>
        <button onClick={handleSave} disabled={saving} style={{
          background: C.sage, color: '#fff', border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 700, padding: '12px 24px', cursor: saving ? 'default' : 'pointer',
          boxShadow: '0 8px 20px -8px rgba(74,112,80,0.55)', opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
