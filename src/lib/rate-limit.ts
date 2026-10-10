// ============================================================
// Basic per-IP rate limiting for public, unauthenticated form
// routes (council review 2026-08-23, task 24) — /api/contact,
// /api/trade, /api/comments. None of these had any throttling
// before: a script could hammer Mali's inbox with unlimited contact/
// trade-lead emails, or flood a blog post with comments.
//
// Backed by a small Supabase table (rate_limit_hits) rather than
// Redis/Upstash — this app's traffic is a handful of form
// submissions a day, not high QPS, so a DB round-trip per submission
// is a non-issue and this avoids adding a new piece of
// infrastructure. Not appropriate to reuse as-is for a hot endpoint.
//
// Fails OPEN: if the rate-limit check itself errors (e.g. the table
// is briefly unreachable), the request is allowed through rather
// than blocking real customers because of an unrelated outage.
// ============================================================

import { NextRequest } from 'next/server';
import { getServiceClient } from './supabase';

export interface RateLimitOptions {
  maxHits: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

// Best-effort IP extraction — Vercel populates x-forwarded-for for
// every request; NextRequest.ip isn't reliably present for the
// Node.js runtime, so headers are the portable source of truth here.
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

export async function checkRateLimit(
  bucket: string,
  identifier: string,
  opts: RateLimitOptions
): Promise<RateLimitResult> {
  const db = getServiceClient();
  const windowStartMs = Date.now() - opts.windowSeconds * 1000;
  const windowStart = new Date(windowStartMs).toISOString();

  const { count, error: countError } = await db
    .from('rate_limit_hits')
    .select('id', { count: 'exact', head: true })
    .eq('bucket', bucket)
    .eq('identifier', identifier)
    .gte('created_at', windowStart);

  if (countError) {
    console.error(`checkRateLimit: count failed for ${bucket}/${identifier}:`, countError.message);
    return { allowed: true }; // fail open — see module comment
  }

  if ((count ?? 0) >= opts.maxHits) {
    return { allowed: false, retryAfterSeconds: opts.windowSeconds };
  }

  const { error: insertError } = await db.from('rate_limit_hits').insert({ bucket, identifier });
  if (insertError) {
    console.error(`checkRateLimit: insert failed for ${bucket}/${identifier}:`, insertError.message);
  }

  // Best-effort housekeeping so the table doesn't grow unbounded.
  // Awaited (rather than fire-and-forget) since a serverless function
  // can be frozen the instant the response goes out — an unawaited
  // query here could be cut off mid-flight more often than not.
  // Failures are harmless either way (worst case the table is a bit
  // bigger than ideal until the next hit), so they're logged, not
  // thrown.
  const { error: cleanupError } = await db
    .from('rate_limit_hits')
    .delete()
    .eq('bucket', bucket)
    .lt('created_at', windowStart);
  if (cleanupError) {
    console.error(`checkRateLimit: cleanup failed for ${bucket}:`, cleanupError.message);
  }

  return { allowed: true };
}
