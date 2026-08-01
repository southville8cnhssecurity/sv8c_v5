'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function Loading() {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const phases = ['Initializing...', 'Loading modules...', 'Connecting database...', 'Almost ready...'];

  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => {
        const n = p + Math.random() * 10;
        if (n >= 100) { clearInterval(t); return 100; }
        if (n > 75) setPhase(3);
        else if (n > 50) setPhase(2);
        else if (n > 25) setPhase(1);
        return n;
      });
    }, 120);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ position:'fixed',inset:0,zIndex:9999,overflow:'hidden',
      background:'linear-gradient(135deg, #08090d 0%, #0d0e1f 50%, #080d1a 100%)',
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      fontFamily:'Inter, system-ui, sans-serif' }}>

      {/* Animated orbs */}
      <motion.div animate={{ x:[0,50,0],y:[0,-40,0],scale:[1,1.2,1] }}
        transition={{ duration:9,repeat:Infinity,ease:'easeInOut' }}
        style={{ position:'absolute',width:600,height:600,borderRadius:'50%',top:'-20%',left:'-15%',pointerEvents:'none',
          background:'radial-gradient(circle,rgba(79,110,247,0.1) 0%,transparent 70%)',filter:'blur(60px)' }} />
      <motion.div animate={{ x:[0,-40,0],y:[0,50,0] }}
        transition={{ duration:7,repeat:Infinity,ease:'easeInOut',delay:2 }}
        style={{ position:'absolute',width:500,height:500,borderRadius:'50%',bottom:'-15%',right:'-10%',pointerEvents:'none',
          background:'radial-gradient(circle,rgba(249,115,22,0.1) 0%,transparent 70%)',filter:'blur(60px)' }} />
      <motion.div animate={{ scale:[1,1.3,1],opacity:[0.5,1,0.5] }}
        transition={{ duration:5,repeat:Infinity,ease:'easeInOut',delay:1 }}
        style={{ position:'absolute',width:300,height:300,borderRadius:'50%',top:'35%',right:'25%',pointerEvents:'none',
          background:'radial-gradient(circle,rgba(20,184,166,0.07) 0%,transparent 70%)',filter:'blur(40px)' }} />

      {/* Grid */}
      <div style={{ position:'absolute',inset:0,opacity:0.025,pointerEvents:'none',
        backgroundImage:'linear-gradient(rgba(255,255,255,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.08) 1px,transparent 1px)',
        backgroundSize:'48px 48px' }} />

      <motion.div initial={{ opacity:0,y:40 }} animate={{ opacity:1,y:0 }}
        transition={{ duration:0.8,ease:[0.22,1,0.36,1] }}
        style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:36,position:'relative',zIndex:10 }}>

        {/* Logo ring */}
        <div style={{ position:'relative' }}>
          {/* Spinning ring */}
          <motion.div animate={{ rotate:360 }} transition={{ duration:3,repeat:Infinity,ease:'linear' }}
            style={{ position:'absolute',inset:-8,borderRadius:'50%',
              background:'conic-gradient(from 0deg, #f97316, #4f6ef7, #14b8a6, #f97316)',
              opacity:0.5,filter:'blur(2px)' }} />
          <div style={{ position:'absolute',inset:-6,borderRadius:'50%',background:'#08090d' }} />
          {/* Pulsing glow */}
          <motion.div animate={{ scale:[1,1.4,1],opacity:[0.4,0.8,0.4] }}
            transition={{ duration:2.5,repeat:Infinity,ease:'easeInOut' }}
            style={{ position:'absolute',inset:-16,borderRadius:'50%',
              background:'radial-gradient(circle,rgba(249,115,22,0.25) 0%,transparent 70%)',pointerEvents:'none' }} />
          {/* Logo */}
          <div style={{ width:88,height:88,borderRadius:'50%',background:'rgba(15,16,28,0.9)',
            border:'1px solid rgba(255,255,255,0.08)',position:'relative',
            display:'flex',alignItems:'center',justifyContent:'center' }}>
            <img src="https://cdn.phototourl.com/free/2026-05-30-cddc7547-fc18-4888-841d-b8acd54ea907.png"
              alt="Logo" style={{ width:60,height:60,objectFit:'contain' }} />
          </div>
        </div>

        {/* School name */}
        <div style={{ textAlign:'center' }}>
          <motion.h1 initial={{ opacity:0,y:10 }} animate={{ opacity:1,y:0 }} transition={{ delay:0.3 }}
            style={{ color:'#f0f2ff',fontSize:24,fontWeight:900,letterSpacing:'-0.03em',lineHeight:1.15,marginBottom:10 }}>
            South Ville 8C<br />National High School
          </motion.h1>
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.5 }}
            style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
            <div style={{ height:1,width:32,background:'linear-gradient(90deg,transparent,#f97316)' }} />
            <p style={{ color:'#f97316',fontSize:11,fontWeight:700,letterSpacing:'0.14em',textTransform:'uppercase' }}>
              ID Management System
            </p>
            <div style={{ height:1,width:32,background:'linear-gradient(90deg,#f97316,transparent)' }} />
          </motion.div>
        </div>

        {/* Progress */}
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.7 }}
          style={{ width:320,display:'flex',flexDirection:'column',gap:10 }}>
          <div style={{ height:3,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden',
            boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.04)' }}>
            <motion.div animate={{ width:`${Math.min(progress,100)}%` }}
              transition={{ duration:0.2,ease:'linear' }}
              style={{ height:'100%',borderRadius:3,
                background:'linear-gradient(90deg,#f97316,#4f6ef7,#14b8a6)',
                boxShadow:'0 0 12px rgba(249,115,22,0.5)' }} />
          </div>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <motion.p key={phase} initial={{ opacity:0,x:-8 }} animate={{ opacity:1,x:0 }}
              style={{ color:'var(--text3)',fontSize:11,fontFamily:'monospace' }}>
              {phases[phase]}
            </motion.p>
            <p style={{ color:'#f97316',fontSize:11,fontFamily:'monospace',fontWeight:700 }}>
              {Math.min(Math.round(progress),100)}%
            </p>
          </div>
        </motion.div>

        {/* Dots */}
        <div style={{ display:'flex',gap:8 }}>
          {[0,1,2,3].map(i => (
            <motion.div key={i} animate={{ opacity:[0.2,1,0.2],scale:[0.7,1,0.7],y:[0,-4,0] }}
              transition={{ duration:1.4,repeat:Infinity,delay:i*0.25 }}
              style={{ width:7,height:7,borderRadius:'50%',
                background:['#f97316','#4f6ef7','#14b8a6','#a855f7'][i] }} />
          ))}
        </div>
      </motion.div>

      <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1 }}
        style={{ position:'absolute',bottom:28,color:'var(--text3)',fontSize:10,fontFamily:'monospace' }}>
        SV8CNHS ID System v2.0.0 · South Ville 8C NHS
      </motion.p>
    </div>
  );
}
