// ============================================================
// GET/POST /api/comments
// ============================================================
// Backs the comments section at the bottom of each /blog/[slug]
// post. Same conventions as /api/contact: plain manual validation
// (no zod in this project's dependencies), a hidden honeypot field,
// and a public/anon Supabase client (this data is fully public —
// see the "blog_comments" RLS policies from the create_blog_schema
// migration: public INSERT, no public SELECT).
//
// Reads go through the blog_comments_public VIEW, not the
// blog_comments table directly — the view omits the email column,
// so a commenter's email can never leak through this GET, even by
// future mistake (the base table has no public SELECT policy at
// all, so a direct read would fail regardless — the view is the
// only public read path, and it's already shaped to be safe).
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const publicClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: NextRequest) {
  const postSlug = request.nextUrl.searchParams.get('postSlug');
  if (!postSlug) {
    return NextResponse.json({ error: 'postSlug is required.' }, { status: 400 });
  }

  const { data: post, error: postError } = await publicClient
    .from('blog_posts')
    .select('id')
    .eq('slug', postSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (postError) {
    console.error('GET /api/comments: failed to resolve post', postError.message);
    return NextResponse.json({ error: 'Something went wrong loading comments.' }, { status: 500 });
  }
  if (!post) {
    // Unknown/inactive slug — no post to have comments, not an error.
    return NextResponse.json({ comments: [] });
  }

  const { data: comments, error } = await publicClient
    .from('blog_comments_public')
    .select('id, name, body, created_at')
    .eq('post_id', post.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('GET /api/comments: failed to load comments', error.message);
    return NextResponse.json({ error: 'Something went wrong loading comments.' }, { status: 500 });
  }

  return NextResponse.json({ comments: comments ?? [] });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const postSlug = typeof body.postSlug === 'string' ? body.postSlug.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const commentBody = typeof body.body === 'string' ? body.body.trim() : '';
  // Hidden honeypot field (mirrors /api/contact) — real visitors never
  // fill this in. Any value here means silently "succeed" without
  // actually posting anything.
  const honeypot = typeof body.company === 'string' ? body.company.trim() : '';

  if (honeypot) {
    return NextResponse.json({ success: true });
  }

  const errors: string[] = [];
  if (!postSlug) errors.push('postSlug is required.');
  if (!name || name.length < 2 || name.length > 100) errors.push('Please enter your name.');
  if (!email || !EMAIL_RE.test(email)) errors.push('Please enter a valid email address.');
  if (!commentBody || commentBody.length < 3) errors.push('Comment should be at least 3 characters.');
  if (commentBody.length > 2000) errors.push('Comment is too long.');

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
  }

  const { data: post, error: postError } = await publicClient
    .from('blog_posts')
    .select('id')
    .eq('slug', postSlug)
    .eq('is_active', true)
    .maybeSingle();

  if (postError) {
    console.error('POST /api/comments: failed to resolve post', postError.message);
    return NextResponse.json({ error: 'Something went wrong posting your comment.' }, { status: 500 });
  }
  if (!post) {
    return NextResponse.json({ error: 'This post could not be found.' }, { status: 404 });
  }

  // Insert via the base table (public INSERT is allowed by RLS), then
  // read the new row back through the public view so the response
  // shape matches what GET returns — and never echoes the email back
  // to the client either.
  const { data: inserted, error: insertError } = await publicClient
    .from('blog_comments')
    .insert({ post_id: post.id, name, email, body: commentBody })
    .select('id')
    .single();

  if (insertError) {
    console.error('POST /api/comments: failed to save comment', insertError.message);
    return NextResponse.json({ error: "Couldn't post your comment. Please try again." }, { status: 502 });
  }

  const { data: comment, error: readError } = await publicClient
    .from('blog_comments_public')
    .select('id, name, body, created_at')
    .eq('id', inserted.id)
    .single();

  if (readError || !comment) {
    console.error('POST /api/comments: failed to re-read comment', readError?.message);
    return NextResponse.json({ error: "Couldn't post your comment. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ comment }, { status: 201 });
}
