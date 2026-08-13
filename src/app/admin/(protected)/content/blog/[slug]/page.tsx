// ============================================================
// src/app/admin/(protected)/content/blog/[slug]/page.tsx
// ============================================================
// Blog Content (CMS) — edit screen: post-level fields (title, slug,
// excerpt, published date, read time, hero image, category,
// published/draft toggle) + the dynamic content-block editor
// (BlockEditor — add/remove/reorder any number of paragraph/
// heading/image/quote blocks; see that component's header for why
// blog posts need this instead of the workshop editor's fixed-4
// slots) + Delete Post.
//
// Same local-draft-state pattern as the workshop editor
// ([slug]/page.tsx one level up): fields (and now blocks) are
// seeded from the fetch, edited freely, and only written back on
// "Save Changes" — via updateBlogPostFields() + saveBlogContentBlocks()
// together, so one Save persists both. Image uploads are the one
// exception — a chosen file uploads to Storage immediately so the
// preview shows the real result, but the post/block rows themselves
// aren't updated until Save.
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminBlogEditor } from '@/lib/hooks';
import {
  updateBlogPostFields,
  uploadBlogImage,
  deleteBlogPost,
  saveBlogContentBlocks,
  type BlogPostCategory,
} from '@/lib/admin-blog-service';
import { BlockEditor, type EditableBlock } from '@/components/admin/BlockEditor';

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
      width: size, height: size, borderRadius: 12, flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      background: url ? undefined : C.mist,
      border: url ? `1px solid ${C.sand}` : `1.5px dashed ${C.sand}`,
      position: 'relative',
    }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <ImagePlaceholderIcon size={30} />
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

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.barkLight, display: 'flex', justifyContent: 'space-between' }}>
      <span>{children}</span>
      {hint && <span style={{ textTransform: 'none', fontWeight: 500, letterSpacing: 0 }}>{hint}</span>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', fontSize: 13.5, color: C.bark, background: C.white,
  border: `1.5px solid ${C.sand}`, borderRadius: 10, padding: '11px 13px',
};

export default function BlogPostEditPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug;
  const { post, loading, error, refresh } = useAdminBlogEditor(slug ?? null);

  const [title, setTitle] = useState('');
  const [slugField, setSlugField] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [readTime, setReadTime] = useState('');
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [category, setCategory] = useState<BlogPostCategory>('wellness-tips');
  const [isActive, setIsActive] = useState(false);
  const [blocks, setBlocks] = useState<EditableBlock[]>([]);

  const [heroUploading, setHeroUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedJustNow, setSavedJustNow] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const heroInputRef = useRef<HTMLInputElement>(null);

  // Seed the draft from the fetched post — runs on initial load and
  // again after a successful Save (via refresh()), so a slug change
  // is reflected once the save round-trips.
  useEffect(() => {
    if (!post) return;
    setTitle(post.title);
    setSlugField(post.slug);
    setExcerpt(post.excerpt ?? '');
    setPublishedAt(post.published_at);
    setReadTime(post.read_time_minutes != null ? String(post.read_time_minutes) : '');
    setHeroImageUrl(post.hero_image_url);
    setCategory(post.category);
    setIsActive(post.is_active);
    setBlocks(
      post.blocks.map((b) => ({
        key: b.id,
        id: b.id,
        block_type: b.block_type,
        text_content: b.text_content ?? '',
        image_url: b.image_url,
        image_alt: b.image_alt ?? '',
        caption: b.caption ?? '',
        attribution: b.attribution ?? '',
      })),
    );
  }, [post]);

  const handleHeroUpload = async (file: File) => {
    if (!slug) return;
    setHeroUploading(true);
    setSaveError(null);
    try {
      const url = await uploadBlogImage(file, slug);
      setHeroImageUrl(url);
    } catch (err: any) {
      alert(`Couldn't upload image: ${err.message}`);
    } finally {
      setHeroUploading(false);
    }
  };

  const handleSave = async () => {
    if (!post) return;
    setSaving(true);
    setSaveError(null);
    try {
      const originalBlockIds = post.blocks.map((b) => b.id);
      await saveBlogContentBlocks(post.id, originalBlockIds, blocks);

      const { slug: newSlug } = await updateBlogPostFields(post.id, {
        title,
        slug: slugField,
        excerpt,
        published_at: publishedAt,
        read_time_minutes: readTime.trim() ? Number(readTime) : null,
        hero_image_url: heroImageUrl,
        category,
        is_active: isActive,
      });
      if (newSlug !== slug) {
        router.replace(`/admin/content/blog/${newSlug}`);
        return;
      }
      await refresh();
      setSavedJustNow(true);
      setTimeout(() => setSavedJustNow(false), 3000);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!post) return;
    if (!confirm(`Delete "${post.title}"? This also removes its content blocks and comments — this can't be undone.`)) return;
    setDeleting(true);
    try {
      await deleteBlogPost(post.id);
      router.push('/admin/content/blog');
    } catch (err: any) {
      alert(`Couldn't delete post: ${err.message}`);
      setDeleting(false);
    }
  };

  if (loading && !post) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.parchment, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: C.barkLight }}>Loading…</span>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto', minHeight: '100vh', background: C.parchment, padding: 24, fontFamily: "'DM Sans', sans-serif" }}>
        <p style={{ color: C.coral, fontSize: 14 }}>{error || 'Post not found.'}</p>
        <button onClick={() => router.push('/admin/content/blog')} style={{ color: C.sage, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, textDecoration: 'underline' }}>
          Back to blog content
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
        textarea, input[type="text"], input[type="date"], input[type="number"] { font-family: 'DM Sans', sans-serif; }
        textarea:focus, input:focus { outline: none; border-color: ${C.sage}; }
      ` }} />

      <div style={{ background: C.forest, padding: '18px 16px 14px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="#fff" opacity="0.9"><path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22.5C7.76 17.66 9.41 12.67 18 11.18V14C21.78 10.58 20 2 20 2S13.21 4.58 17 8Z" /></svg>
        <span style={{ fontFamily: "'Crimson Pro'", fontSize: 19, fontWeight: 700, color: C.white }}>Uri Herbs Admin</span>
      </div>

      <div style={{ background: C.white, borderBottom: `1px solid ${C.sand}`, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => router.push('/admin/content/blog')} aria-label="Back to blog list" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8, background: C.sagePale, flexShrink: 0, border: 'none', cursor: 'pointer',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="2.2"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "'Crimson Pro'", fontSize: 18, fontWeight: 700, color: C.forest, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.title}</div>
          <div style={{ fontFamily: "'DM Sans'", fontSize: 11.5, color: C.barkLight }}>{post.slug} · editing</div>
        </div>
      </div>

      <div style={{ padding: '18px 16px 110px', display: 'flex', flexDirection: 'column', gap: 22 }}>

        {/* Published / draft toggle */}
        <button
          type="button"
          onClick={() => setIsActive((v) => !v)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: isActive ? C.sageLight : C.mist, border: `1.5px solid ${isActive ? C.sage : C.sand}`,
            borderRadius: 12, padding: '11px 14px', cursor: 'pointer', textAlign: 'left',
          }}
        >
          <span style={{ fontSize: 13.5, fontWeight: 700, color: isActive ? C.sageDark : C.barkLight }}>
            {isActive ? '✓ Published — visible on /blog' : '● Draft — hidden from /blog'}
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: C.barkLight, textDecoration: 'underline' }}>Toggle</span>
        </button>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FieldLabel>Title</FieldLabel>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" style={inputStyle} />
        </div>

        {/* Slug */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FieldLabel hint="/blog/…">URL Slug</FieldLabel>
          <input type="text" value={slugField} onChange={(e) => setSlugField(e.target.value)} placeholder="auto-generated-from-title" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 12.5 }} />
        </div>

        {/* Excerpt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FieldLabel hint="shown on the /blog card">Excerpt</FieldLabel>
          <textarea rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="A short 1-2 sentence summary…" style={{ ...inputStyle, resize: 'none', lineHeight: 1.55 }} />
        </div>

        {/* Category */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FieldLabel>Category</FieldLabel>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['workshop', 'wellness-tips'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                style={{
                  flex: 1, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                  border: `1.5px solid ${category === c ? C.sage : C.sand}`,
                  background: category === c ? C.sageLight : C.white,
                  color: category === c ? C.sageDark : C.bark,
                  fontSize: 13, fontWeight: 700,
                }}
              >
                {c === 'workshop' ? 'Workshop Story' : 'Wellness Tip'}
              </button>
            ))}
          </div>
        </div>

        {/* Published date + read time */}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FieldLabel>Published Date</FieldLabel>
            <input type="date" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ width: 110, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <FieldLabel>Read (min)</FieldLabel>
            <input type="number" min={1} value={readTime} onChange={(e) => setReadTime(e.target.value)} placeholder="5" style={inputStyle} />
          </div>
        </div>

        {/* Hero image */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FieldLabel hint="shown at the top of the post + on its card">Hero Image</FieldLabel>
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <ImagePreview url={heroImageUrl} size={90} uploading={heroUploading} />
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, height: 1, background: C.sand }} />
          <span style={{ fontFamily: "'Crimson Pro'", fontSize: 13.5, fontWeight: 600, color: C.barkLight }}>Content Blocks</span>
          <div style={{ flex: 1, height: 1, background: C.sand }} />
        </div>

        {/* Content blocks — add/remove/reorder any number of
            paragraph/heading/image/quote blocks. */}
        <BlockEditor blocks={blocks} onChange={setBlocks} postSlug={slug ?? post.slug} />

        {/* Danger zone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
          <div style={{ flex: 1, height: 1, background: C.sand }} />
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              background: '#FFF5F3', border: '1.5px solid rgba(192,122,110,0.35)', color: C.coral,
              fontSize: 13, fontWeight: 700, padding: '11px 14px', borderRadius: 10,
              cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? 'Deleting…' : 'Delete Post'}
          </button>
        </div>
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
