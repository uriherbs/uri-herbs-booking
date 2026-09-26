// ============================================================
// src/lib/video-url.ts
// ============================================================
// Helpers for workshops.hero_video_url, which holds EITHER a YouTube
// link (any common form) OR a direct video file URL (Supabase Storage
// upload). Shared by the admin editor and the public workshop page.
// ============================================================

export type ParsedVideo =
  | { kind: 'youtube'; id: string; vertical: boolean }
  | { kind: 'file'; url: string };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTube(input: string): { id: string; vertical: boolean } | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, '');
  let id: string | null = null;
  let vertical = false;
  if (host === 'youtu.be') {
    id = url.pathname.slice(1).split('/')[0];
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'watch') id = url.searchParams.get('v');
    else if (parts[0] === 'shorts') { id = parts[1]; vertical = true; }
    else if (parts[0] === 'embed' || parts[0] === 'live') id = parts[1];
  }
  return id && YT_ID.test(id) ? { id, vertical } : null;
}

export function parseVideoUrl(value: string | null | undefined): ParsedVideo | null {
  if (!value) return null;
  const yt = parseYouTube(value);
  if (yt) return { kind: 'youtube', ...yt };
  if (/^https:\/\//i.test(value)) return { kind: 'file', url: value };
  return null;
}

export function youTubeEmbedUrl(id: string): string {
  // youtube-nocookie: no tracking cookies until the visitor presses play.
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
}
