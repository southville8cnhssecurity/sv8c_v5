'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Check, X, Move, ZoomIn, ZoomOut, Camera } from 'lucide-react';

interface Props {
  onComplete: (dataUrl: string, file: File) => void;
  currentPhoto?: string;
  accent?: string;
}

// 2:2 square ratio — standard 2x2 ID photo
const CROP_W = 240;
const CROP_H = 240;

export default function PhotoUploadCrop({ onComplete, currentPhoto, accent = '#4f6ef7' }: Props) {
  const [preview, setPreview]     = useState<string>(currentPhoto || '');
  const [showCrop, setShowCrop]   = useState(false);
  const [offset, setOffset]       = useState({ x: 0, y: 0 });
  const [scale, setScale]         = useState(1);
  const [dragging, setDragging]   = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, ox: 0, oy: 0 });
  const [mounted, setMounted]     = useState(false);
  const fileRef   = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const clamp = useCallback((nextOffset: { x: number; y: number }, nextScale: number) => {
    const img = imgRef.current;
    if (!img) return { offset: nextOffset, scale: nextScale };
    const minScale = Math.max(CROP_W / img.width, CROP_H / img.height);
    const s = Math.max(minScale, Math.min(6, nextScale));
    const scaledW = img.width * s;
    const scaledH = img.height * s;
    const minX = CROP_W - scaledW;
    const maxX = 0;
    const minY = CROP_H - scaledH;
    const maxY = 0;
    const x = Math.min(maxX, Math.max(minX, nextOffset.x));
    const y = Math.min(maxY, Math.max(minY, nextOffset.y));
    return { offset: { x, y }, scale: s };
  }, []);

  function handleFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const s = Math.max(CROP_W / img.width, CROP_H / img.height);
      setScale(s);
      setOffset({ x: (CROP_W - img.width * s) / 2, y: (CROP_H - img.height * s) / 2 });
      setShowCrop(true);
    };
    img.src = url;
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CROP_W, CROP_H);
    ctx.drawImage(img, offset.x, offset.y, img.width * scale, img.height * scale);
  }, [offset, scale]);

  useEffect(() => {
    if (!showCrop) return;
    let tries = 0;
    function tryDraw() {
      if (canvasRef.current) { draw(); }
      else if (tries < 30) { tries++; setTimeout(tryDraw, 16); }
    }
    tryDraw();
  }, [showCrop, draw]);

  function onMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y });
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    const next = { x: dragStart.ox + e.clientX - dragStart.x, y: dragStart.oy + e.clientY - dragStart.y };
    const { offset: clamped } = clamp(next, scale);
    setOffset(clamped);
  }
  function stopDrag() { setDragging(false); }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    setDragging(true);
    setDragStart({ x: t.clientX, y: t.clientY, ox: offset.x, oy: offset.y });
  }
  function onTouchMove(e: React.TouchEvent) {
    if (!dragging) return;
    const t = e.touches[0];
    const next = { x: dragStart.ox + t.clientX - dragStart.x, y: dragStart.oy + t.clientY - dragStart.y };
    const { offset: clamped } = clamp(next, scale);
    setOffset(clamped);
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const nextScale = scale + (e.deltaY < 0 ? 0.1 : -0.1);
    const { offset: clampedOffset, scale: clampedScale } = clamp(offset, nextScale);
    setOffset(clampedOffset);
    setScale(clampedScale);
  }

  function zoomBy(delta: number) {
    const { offset: clampedOffset, scale: clampedScale } = clamp(offset, scale + delta);
    setOffset(clampedOffset);
    setScale(clampedScale);
  }

  function confirmCrop() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    requestAnimationFrame(() => {
      draw();
      setTimeout(() => {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.93);
        setPreview(dataUrl);
        setShowCrop(false);
        canvas.toBlob(blob => {
          if (!blob) return;
          const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
          onComplete(dataUrl, file);
        }, 'image/jpeg', 0.93);
      }, 60);
    });
  }

  const cropModal = (
    <AnimatePresence>
      {showCrop && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <motion.div
            initial={{ scale: 0.88, y: 24 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              background: 'var(--card)', borderRadius: 22, padding: 24,
              border: '1px solid var(--border2)', maxWidth: 300, width: '100%',
              boxShadow: '0 40px 100px rgba(0,0,0,0.65)',
            }}
          >
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
              Crop ID Photo
            </p>
            <p style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 5 }}>
              <Move size={11} /> Drag to reposition · scroll to zoom
            </p>

            <div
              style={{
                position: 'relative', width: CROP_W, height: CROP_H,
                margin: '0 auto', cursor: dragging ? 'grabbing' : 'grab',
                overflow: 'hidden', borderRadius: 12, userSelect: 'none',
                border: `2px solid ${accent}60`,
                boxShadow: `0 0 0 4px ${accent}20`,
              }}
              onMouseDown={onMouseDown} onMouseMove={onMouseMove}
              onMouseUp={stopDrag} onMouseLeave={stopDrag}
              onWheel={onWheel}
              onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={stopDrag}
            >
              <canvas ref={canvasRef} width={CROP_W} height={CROP_H} style={{ display: 'block' }} />
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: `linear-gradient(rgba(255,255,255,0.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.07) 1px,transparent 1px)`,
                backgroundSize: '33.33% 33.33%',
              }} />
              <div style={{ position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%,-50%)', width: 24, height: 24, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: `${accent}90` }} />
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: `${accent}90` }} />
              </div>
            </div>

            <p style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', marginTop: 8 }}>
              2×2 square · standard ID photo size
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, justifyContent: 'center' }}>
              <button onClick={() => zoomBy(-0.1)}
                style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border2)',
                  background: 'var(--input-bg)', cursor: 'pointer', color: 'var(--text2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ZoomOut size={14} />
              </button>
              <div style={{ background: 'var(--input-bg)', border: '1px solid var(--border2)',
                padding: '5px 14px', borderRadius: 9, minWidth: 60, textAlign: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text)' }}>
                  {Math.round(scale * 100)}%
                </span>
              </div>
              <button onClick={() => zoomBy(0.1)}
                style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border2)',
                  background: 'var(--input-bg)', cursor: 'pointer', color: 'var(--text2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ZoomIn size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowCrop(false)}
                style={{ flex: 1, padding: '10px', borderRadius: 11, fontSize: 13, fontWeight: 700,
                  background: 'var(--input-bg)', border: '1px solid var(--border)', cursor: 'pointer',
                  color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <X size={13} /> Cancel
              </button>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={confirmCrop}
                style={{ flex: 1, padding: '10px', borderRadius: 11, fontSize: 13, fontWeight: 700,
                  background: `linear-gradient(135deg,${accent},${accent}cc)`, border: 'none',
                  cursor: 'pointer', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  boxShadow: `0 4px 18px ${accent}40` }}>
                <Check size={13} /> Use Photo
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {/* Preview — square 2x2 box */}
      <div style={{
        width: 120, height: 120, borderRadius: 12, overflow: 'hidden',
        border: `2.5px solid ${preview ? accent + '80' : 'var(--border2)'}`,
        background: preview ? 'transparent' : 'var(--input-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: preview ? `0 8px 28px ${accent}30` : 'none',
        position: 'relative', transition: 'all 0.3s', flexShrink: 0,
      }}>
        {preview
          ? <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="ID Photo" />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <Camera size={22} style={{ color: 'var(--text3)' }} />
              <span style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600 }}>No photo</span>
            </div>
          )
        }
        {preview && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'rgba(0,0,0,0.5)', padding: '3px 0',
            textAlign: 'center', fontSize: 8, color: 'rgba(255,255,255,0.85)', fontWeight: 700,
            letterSpacing: '0.04em' }}>
            2×2 ID PHOTO
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />

      <motion.button type="button" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
        onClick={() => fileRef.current?.click()}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 10,
          background: preview ? 'rgba(34,197,94,0.1)' : `${accent}15`,
          border: `1.5px solid ${preview ? 'rgba(34,197,94,0.4)' : accent + '45'}`,
          color: preview ? '#22c55e' : accent, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
        {preview ? <><Check size={13} /> Change Photo</> : <><Upload size={13} /> Upload Photo</>}
      </motion.button>
      <p style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.5 }}>
        Drag &amp; scroll to position · JPEG / PNG
      </p>

      {mounted && createPortal(cropModal, document.body)}
    </div>
  );
}
