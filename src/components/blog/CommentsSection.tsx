// ============================================================
// src/components/blog/CommentsSection.tsx
// ============================================================
// Comment form + list at the bottom of each /blog/[slug] post.
// Client component: fetches GET /api/comments?postSlug=... on
// mount and posts new ones to the same route. No SWR in this
// project's dependencies, so this is plain fetch + useState instead
// of the mockup's useSWR-based version (components/blog/comments/*
// in uri-herbs-v0-design) — same behavior, one file, no new
// dependency.
//
// Structure-only pass: real moderation (is_approved gating, spam
// filtering beyond the honeypot) is out of scope here — every
// posted comment is publicly visible immediately, same as the v0
// reference implementation.
// ============================================================

'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { C, FONT_DISPLAY, FONT_BODY } from '@/lib/theme';

interface PublicComment {
  id: string;
  name: string;
  body: string;
  created_at: string;
}

type FieldErrors = Partial<Record<'name' | 'email' | 'body', string>>;

function formatCommentDate(isoDate: string) {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(
    new Date(isoDate),
  );
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 14px',
  borderRadius: 10,
  border: `1px solid ${C.sand}`,
  fontFamily: FONT_BODY,
  fontSize: 14,
  color: C.forest,
  background: C.white,
  outline: 'none',
};

export function CommentsSection({ postSlug }: { postSlug: string }) {
  const [comments, setComments] = useState<PublicComment[] | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [body, setBody] = useState('');
  // Honeypot — left empty by real visitors, invisible to them via CSS.
  const [company, setCompany] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/comments?postSlug=${encodeURIComponent(postSlug)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setComments(data.comments ?? []);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [postSlug]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const fieldErrors: FieldErrors = {};
    if (name.trim().length < 2) fieldErrors.name = 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) fieldErrors.email = 'Enter a valid email address.';
    if (body.trim().length < 3) fieldErrors.body = 'Comment should be at least 3 characters.';

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postSlug, name: name.trim(), email: email.trim(), body: body.trim(), company }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');

      setComments((current) => [data.comment, ...(current ?? [])]);
      setName('');
      setEmail('');
      setBody('');
    } catch {
      setSubmitError('Something went wrong posting your comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section style={{ marginTop: 56 }}>
      <h2 style={{ margin: 0, fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: C.forest }}>
        Comments{comments ? ` (${comments.length})` : ''}
      </h2>

      <form
        onSubmit={handleSubmit}
        noValidate
        autoComplete="on"
        style={{
          marginTop: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          borderRadius: 20,
          border: `1px solid ${C.sand}`,
          background: C.white,
          padding: 24,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="comment-form-grid">
          <style dangerouslySetInnerHTML={{ __html: `@media (min-width: 560px) { .comment-form-grid { grid-template-columns: 1fr 1fr; } }` }} />
          <div>
            <label htmlFor="comment-name" style={{ display: 'block', marginBottom: 6, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.bark }}>
              Name
            </label>
            <input
              id="comment-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
              style={inputStyle}
            />
            {errors.name && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#B3453B' }}>{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="comment-email" style={{ display: 'block', marginBottom: 6, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.bark }}>
              Email
            </label>
            <input
              id="comment-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              style={inputStyle}
            />
            {errors.email && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#B3453B' }}>{errors.email}</p>}
            <p style={{ margin: '6px 0 0', fontSize: 12, color: C.barkLight }}>Never shown publicly.</p>
          </div>
        </div>

        {/* Honeypot — hidden from real visitors, not from bots that
            auto-fill every field. tabIndex -1 + off-screen instead of
            display:none, which some bots skip filling. */}
        <input
          type="text"
          name="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }}
        />

        <div>
          <label htmlFor="comment-body" style={{ display: 'block', marginBottom: 6, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.bark }}>
            Comment
          </label>
          <textarea
            id="comment-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts..."
            rows={4}
            style={{ ...inputStyle, height: 'auto', padding: '10px 14px', resize: 'vertical', fontFamily: FONT_BODY }}
          />
          {errors.body && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#B3453B' }}>{errors.body}</p>}
        </div>

        {submitError && <p style={{ margin: 0, fontSize: 13, color: '#B3453B' }}>{submitError}</p>}

        <button
          type="submit"
          disabled={submitting}
          style={{
            alignSelf: 'flex-start',
            height: 46,
            padding: '0 26px',
            borderRadius: 999,
            border: 'none',
            background: C.sageDark,
            color: C.white,
            fontFamily: FONT_BODY,
            fontWeight: 700,
            fontSize: 14,
            cursor: submitting ? 'default' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'Posting…' : 'Post Comment'}
        </button>
      </form>

      <div style={{ marginTop: 32 }}>
        {comments === null ? null : comments.length === 0 ? (
          <p
            style={{
              margin: 0,
              padding: '28px 24px',
              textAlign: 'center',
              borderRadius: 16,
              border: `1px dashed ${C.sand}`,
              fontFamily: FONT_BODY,
              fontSize: 14,
              color: C.barkLight,
            }}
          >
            Be the first to leave a comment.
          </p>
        ) : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 22 }}>
            {comments.map((comment) => (
              <li key={comment.id} style={{ display: 'flex', gap: 14 }}>
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: C.sageLight,
                    color: C.sageDark,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FONT_BODY,
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {initials(comment.name)}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 }}>
                    <p style={{ margin: 0, fontFamily: FONT_BODY, fontWeight: 700, fontSize: 14, color: C.forest }}>{comment.name}</p>
                    <p style={{ margin: 0, fontFamily: FONT_BODY, fontSize: 12, color: C.barkLight }}>{formatCommentDate(comment.created_at)}</p>
                  </div>
                  <p style={{ margin: '4px 0 0', fontFamily: FONT_BODY, fontSize: 14, lineHeight: 1.65, color: C.bark }}>{comment.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
