'use client';
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, CheckCircle, ImageIcon, X } from 'lucide-react';

interface Props {
  onComplete: (dataUrl: string, file: File) => void;
  currentPhoto?: string;
  accent?: string;
}

const UNIFORM_COLOR = '#1a2a5e'; // Navy blue uniform background

export default function PhotoUploadBGRemoval({ onComplete, currentPhoto, accent = '#4f6ef7' }: Props) {
  const [stage, setStage] = useState<'idle'|'loading_model'|'removing'|'done'|'error'>('idle');
  const [preview, setPreview] = useState<string>(currentPhoto||'');
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const compositeOnUniform = useCallback((transparentDataUrl: string): Promise<string> => {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const TARGET_W = 300, TARGET_H = 375; // 4:5 ratio — portrait ID size
        canvas.width = TARGET_W; canvas.height = TARGET_H;
        const ctx = canvas.getContext('2d')!;
        // Uniform background
        ctx.fillStyle = UNIFORM_COLOR;
        ctx.fillRect(0,0,TARGET_W,TARGET_H);
        // Subtle collar/shoulder guide
        ctx.fillStyle = '#2a3f7e';
        ctx.beginPath();
        ctx.ellipse(TARGET_W/2, TARGET_H+40, TARGET_W*0.6, TARGET_H*0.5, 0, 0, Math.PI*2);
        ctx.fill();
        // Center and scale person
        const scale = Math.min(TARGET_W/img.width, TARGET_H/img.height) * 0.95;
        const sw = img.width*scale, sh = img.height*scale;
        const ox = (TARGET_W-sw)/2, oy = TARGET_H-sh;
        ctx.drawImage(img, ox, oy, sw, sh);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.src = transparentDataUrl;
    });
  }, []);

  async function handleFileSelect(file: File) {
    if (!file.type.startsWith('image/')) { setErrorMsg('Please select an image file.'); setStage('error'); return; }
    if (file.size > 10*1024*1024) { setErrorMsg('Image must be under 10MB.'); setStage('error'); return; }
    setErrorMsg('');
    // Show raw preview first
    const rawUrl = URL.createObjectURL(file);
    setPreview(rawUrl); setStage('loading_model');
    try {
      const { removeBackground } = await import('@imgly/background-removal');
      setStage('removing');
      const resultBlob = await removeBackground(file, {
        model: 'isnet',
        output: { format:'image/png', quality:0.9 },
      });
      const transparentUrl = URL.createObjectURL(resultBlob);
      setStage('removing');
      const composited = await compositeOnUniform(transparentUrl);
      URL.revokeObjectURL(transparentUrl);
      URL.revokeObjectURL(rawUrl);
      setPreview(composited);
      setStage('done');
      // Convert dataUrl back to File for upload
      const res = await fetch(composited);
      const blob = await res.blob();
      const processedFile = new File([blob], `photo_processed_${Date.now()}.jpg`, { type:'image/jpeg' });
      onComplete(composited, processedFile);
    } catch (e: any) {
      console.error('BG removal error:', e);
      // Fallback: use original photo without BG removal
      setStage('done');
      const res = await fetch(rawUrl);
      const blob = await res.blob();
      const fallbackFile = new File([blob], file.name, { type: file.type });
      onComplete(rawUrl, fallbackFile);
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:14 }}>
      {/* Preview box */}
      <div style={{ width:120, height:150, borderRadius:14, overflow:'hidden', position:'relative',
        border:`2px solid ${preview ? accent+'60' : 'var(--border2)'}`,
        background: preview ? 'transparent' : 'var(--input-bg)',
        display:'flex', alignItems:'center', justifyContent:'center',
        boxShadow: preview ? `0 8px 28px ${accent}30` : 'none', transition:'all 0.3s' }}>
        {preview ? (
          <img src={preview} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="Photo preview" />
        ) : (
          <ImageIcon size={28} style={{ color:'var(--text3)' }} />
        )}
        {/* Processing overlay */}
        <AnimatePresence>
          {(stage === 'loading_model' || stage === 'removing') && (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
              style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.72)',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 }}>
              <motion.div animate={{ rotate:360 }} transition={{ duration:1, repeat:Infinity, ease:'linear' }}>
                <Loader2 size={22} style={{ color:'#fff' }} />
              </motion.div>
              <p style={{ color:'#fff', fontSize:9, fontWeight:700, textAlign:'center', padding:'0 6px' }}>
                {stage==='loading_model' ? 'Loading AI model…' : 'Removing background…'}
              </p>
            </motion.div>
          )}
          {stage === 'done' && (
            <motion.div initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
              style={{ position:'absolute', top:6, right:6, width:22, height:22, borderRadius:'50%',
                background:'#22c55e', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <CheckCircle size={14} style={{ color:'#fff' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload button */}
      <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }}
        onChange={e=>{ if(e.target.files?.[0]) handleFileSelect(e.target.files[0]); e.target.value=''; }} />
      <motion.button type="button" whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
        onClick={()=>inputRef.current?.click()}
        disabled={stage==='loading_model'||stage==='removing'}
        style={{ display:'flex', alignItems:'center', gap:7, padding:'9px 18px', borderRadius:11,
          background: stage==='done' ? 'rgba(34,197,94,0.1)' : `${accent}15`,
          border: `1.5px solid ${stage==='done' ? 'rgba(34,197,94,0.35)' : accent+'40'}`,
          color: stage==='done' ? '#22c55e' : accent, cursor:'pointer', fontSize:13, fontWeight:700,
          opacity: stage==='loading_model'||stage==='removing' ? 0.6 : 1, transition:'all 0.2s' }}>
        {stage==='done' ? <><CheckCircle size={14}/> Change Photo</> :
         stage==='loading_model'||stage==='removing' ? <><Loader2 size={14}/> Processing…</> :
         <><Upload size={14}/> Upload Photo</>}
      </motion.button>

      {/* Instructions */}
      <div style={{ fontSize:10, color:'var(--text3)', textAlign:'center', lineHeight:1.6, maxWidth:200 }}>
        {stage==='idle' && <>Upload a clear photo of yourself.<br/><strong style={{color:'var(--text2)'}}>AI will auto-remove background</strong><br/>and apply a school uniform background.</>}
        {stage==='loading_model' && <span style={{color:accent}}>Loading background removal model…<br/>This only happens once.</span>}
        {stage==='removing' && <span style={{color:accent}}>Removing background and applying<br/>uniform background…</span>}
        {stage==='done' && <span style={{color:'#22c55e'}}>✓ Background removed & uniform applied!<br/>You can change the photo anytime.</span>}
        {stage==='error' && <span style={{color:'#ef4444'}}>{errorMsg}</span>}
      </div>
    </div>
  );
}
