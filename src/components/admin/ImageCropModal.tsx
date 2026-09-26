'use client';

// ============================================================
// src/components/admin/ImageCropModal.tsx
// ============================================================
// Opens after an admin picks a photo, BEFORE it's uploaded. Shows the
// photo inside a frame with exactly the shape the public site uses for
// that spot (e.g. 16:10 workshop hero, 4:3 workshop section photo), so
// Mali can drag / zoom to choose what's in view. Only the framed part
// is uploaded, so the website shows exactly what she chose instead of
// the browser guessing a centre crop.
//
// Output: a JPEG File (max 2000px wide, quality 0.88) passed to
// onConfirm — callers hand it to their existing upload function.
// ============================================================

import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';

const C = {
  forest: '#2D4639', sage: '#6B8F71', white: '#FFFFFF', sand: '#E8E2D8',
  bark: '#5C4A3D', barkLight: '#8A7668', parchment: '#F8F5EF',
};

const MAX_WIDTH = 2000;

type Props = {
  file: File | null; // null = closed
  aspect: number; // width / height, e.g. 16 / 10
  shapeLabel: string; // e.g. "Main photo (wide)"
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read this image'));
    img.src = src;
  });
}

async function cropToFile(src: string, area: Area, originalName: string): Promise<File> {
  const img = await loadImage(src);
  const scale = Math.min(1, MAX_WIDTH / area.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(area.width * scale);
  canvas.height = Math.round(area.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not crop this image');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the cropped image'))), 'image/jpeg', 0.88)
  );
  const base = originalName.replace(/\.[^.]+$/, '') || 'photo';
  return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
}

export default function ImageCropModal({ file, aspect, shapeLabel, onCancel, onConfirm }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) { setSrc(null); return; }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  if (!file || !src) return null;

  const confirm = async () => {
    if (!area) return;
    setBusy(true);
    try {
      onConfirm(await cropToFile(src, area, file.name));
    } catch (err: any) {
      alert(err?.message || 'Could not crop this image');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(20,28,24,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{
        width: '100%', maxWidth: 560, background: C.parchment, borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)', fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{ padding: '14px 18px', background: C.forest, color: C.white }}>
          <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 19, fontWeight: 700 }}>Adjust photo</div>
          <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 2 }}>
            {shapeLabel}: drag to move, pinch or use the slider to zoom. What&apos;s inside the frame is what the website shows.
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', height: 340, background: '#1a1a1a' }}>
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            minZoom={1}
            maxZoom={4}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            showGrid
            objectFit="contain"
          />
        </div>

        <div style={{ padding: '14px 18px 18px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, color: C.barkLight }}>
            Zoom
            <input
              type="range" min={1} max={4} step={0.01} value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              style={{ flex: 1, accentColor: C.sage }}
            />
          </label>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              type="button" onClick={onCancel} disabled={busy}
              style={{
                background: C.white, border: `1.5px solid ${C.sand}`, color: C.bark, fontSize: 14, fontWeight: 600,
                padding: '10px 18px', borderRadius: 10, cursor: busy ? 'default' : 'pointer',
              }}
            >Cancel</button>
            <button
              type="button" onClick={confirm} disabled={busy || !area}
              style={{
                background: busy || !area ? C.barkLight : C.forest, border: 'none', color: C.white, fontSize: 14, fontWeight: 700,
                padding: '10px 20px', borderRadius: 10, cursor: busy || !area ? 'default' : 'pointer',
              }}
            >{busy ? 'Preparing…' : 'Use this photo'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
