'use client';

// Click-to-load YouTube player for our VERTICAL videos (9:16, Shorts).
// Shows the thumbnail and loads the real player (youtube-nocookie) only
// when tapped, so the page stays light. Width is capped so a vertical
// video doesn't fill a whole desktop screen.

import { useState } from 'react';

export default function YouTubeLite({ id, title, maxWidth = 360 }: { id: string; title: string; maxWidth?: number }) {
  const [play, setPlay] = useState(false);
  const [thumb, setThumb] = useState(`https://i.ytimg.com/vi/${encodeURIComponent(id)}/oardefault.jpg`);
  const box: React.CSSProperties = {
    position: 'relative', aspectRatio: '9/16', width: '100%', maxWidth, margin: '0 auto',
    borderRadius: 18, overflow: 'hidden', background: '#000', display: 'block',
  };
  if (play) {
    return (
      <div style={box}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      </div>
    );
  }
  return (
    <button type="button" onClick={() => setPlay(true)} aria-label={`Play video: ${title}`} style={{ ...box, border: 'none', padding: 0, cursor: 'pointer' }}>
      {/* oardefault = thumbnail in the video's own (vertical) shape; falls back to the standard one */}
      <img
        src={thumb}
        onError={() => setThumb(`https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`)}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
      <span aria-hidden style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <span style={{ width: 68, height: 68, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 28, display: 'grid', placeItems: 'center' }}>▶</span>
      </span>
    </button>
  );
}
