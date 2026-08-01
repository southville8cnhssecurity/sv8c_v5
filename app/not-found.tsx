'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function NotFound() {
  const { data: session } = useSession();
  const userType = (session?.user as any)?.userType;
  const href = userType === 'admin' ? '/home' : userType ? '/my-status' : '/login';

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg)', fontFamily:'Inter, system-ui, sans-serif', padding:24, transition:'background 0.35s' }}>
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
        style={{ textAlign:'center', maxWidth:400 }}>
        <motion.div animate={{ rotate:[0,-5,5,-5,0] }} transition={{ duration:0.6, delay:0.3 }}
          style={{ fontSize:80, marginBottom:24, display:'block' }}>🔍</motion.div>
        <h1 style={{ fontSize:80, fontWeight:900, color:'var(--accent)', letterSpacing:'-0.04em',
          lineHeight:1, marginBottom:8 }}>404</h1>
        <h2 style={{ fontSize:22, fontWeight:800, color:'var(--text)', marginBottom:12 }}>Page not found</h2>
        <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7, marginBottom:28 }}>
          The page you're looking for doesn't exist or you may not have access to it.
        </p>
        <Link href={href}>
          <motion.button whileHover={{ scale:1.03, y:-2 }} whileTap={{ scale:0.97 }}
            style={{ padding:'13px 28px', borderRadius:13, background:'linear-gradient(135deg,var(--accent),#ea580c)',
              color:'#fff', border:'none', fontSize:15, fontWeight:700, cursor:'pointer',
              boxShadow:'0 6px 24px var(--glow-accent)' }}>
            ← Go back home
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
