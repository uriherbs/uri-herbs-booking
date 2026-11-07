'use client';

// Click-to-load YouTube player: shows the thumbnail and loads the real
// player (youtube-nocookie) only when tapped, so the page stays light.

import { useState } from 'react';

export default function YouTubeLite({ id, title }: { id: string; title: string }) {
  const [play, setPlay] = useState(false);
  const box: React.CSSProperties = { position: 'relative', aspectRatio: '16/9', borderRadius: 18, overflow: 'hidden', background: '#000' };
  if (play) {
    return (
      <div style={box}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      </div>
    );
  }
  return (
    <button type="button" onClick={() => setPlay(true)} aria-label={`Play video: ${title}`} style={{ ...box, width: '100%', border: 'none', padding: 0, cursor: 'pointer', display: 'block' }}>
      <img src={`https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <span aria-hidden style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <span style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 30, display: 'grid', placeItems: 'center' }}>▶</span>
      </span>
    </button>
  );
}
