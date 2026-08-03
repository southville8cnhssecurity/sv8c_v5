'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { Sun, Moon, Settings, LogOut, X } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface Props { title: string; subtitle?: string; actions?: React.ReactNode; }

export default function Header({ title, subtitle, actions }: Props) {
  const { data: session } = useSession();
  const { theme, toggleTheme, headerTitle } = useTheme();
  const pathname = usePathname();
  const isLight = theme === 'light';
  const onSettings = pathname === '/settings';

  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  async function performSignOut() {
    setSigningOut(true);
    try { await fetch('/api/auth/logout', { method:'POST' }); } catch {}
    signOut({ callbackUrl:'/login' });
  }

  const signOutModal = (
    <AnimatePresence>
      {showSignOutConfirm && (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          style={{ position:'fixed', inset:0, background:'rgba(8,10,16,0.6)', backdropFilter:'blur(6px)',
            display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, padding:20 }}
          onClick={()=>{ if(!signingOut) setShowSignOutConfirm(false); }}>

          <motion.div initial={{ opacity:0, scale:0.92, y:16 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.94, y:10 }}
            transition={{ type:'spring', stiffness:380, damping:28 }}
            onClick={e=>e.stopPropagation()}
            style={{ width:'100%', maxWidth:380, borderRadius:24, background:'var(--card)',
              border:'1px solid var(--border)', overflow:'hidden', position:'relative',
              boxShadow:'0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02)' }}>

            <button onClick={()=>{ if(!signingOut) setShowSignOutConfirm(false); }} disabled={signingOut}
              style={{ position:'absolute', top:14, right:14, width:28, height:28, borderRadius:8,
                border:'1px solid var(--border2)', background:'var(--input-bg)',
                cursor:signingOut?'not-allowed':'pointer', color:'var(--text3)',
                display:'flex', alignItems:'center', justifyContent:'center', zIndex:2 }}>
              <X size={13}/>
            </button>

            <div style={{ height:4, width:'100%',
              background:'linear-gradient(90deg,#ef4444,#f97316,#ef4444)', backgroundSize:'200% 100%' }} />

            <div style={{ padding:'36px 32px 28px', textAlign:'center' }}>
              <div style={{ position:'relative', width:64, height:64, margin:'0 auto 20px' }}>
                <div style={{ position:'absolute', inset:-6, borderRadius:20,
                  background:'rgba(239,68,68,0.12)' }} />
                <div style={{ position:'relative', width:64, height:64, borderRadius:18,
                  background:'linear-gradient(135deg,#ef4444,#dc2626)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:'0 10px 28px rgba(239,68,68,0.45)' }}>
                  <LogOut size={26} style={{ color:'#fff' }} />
                </div>
              </div>

              <p style={{ fontSize:18, fontWeight:800, color:'var(--text)', marginBottom:8, letterSpacing:'-0.01em' }}>
                Sign out of your account?
              </p>
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.65, maxWidth:280, margin:'0 auto' }}>
                You'll be logged out of this session and need to sign in again to continue managing student records.
              </p>

              {session?.user?.name && (
                <div style={{ marginTop:18, display:'inline-flex', alignItems:'center', gap:8,
                  padding:'8px 14px', borderRadius:12, background:'var(--bg2)', border:'1px solid var(--border)' }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', flexShrink:0,
                    background:'linear-gradient(135deg,var(--accent),var(--accent2,#ea580c))',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:10, fontWeight:800, color:'#fff' }}>
                    {session.user.name.charAt(0)}
                  </div>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{session.user.name}</span>
                </div>
              )}
            </div>

            <div style={{ borderTop:'1px solid var(--border)', padding:'18px 24px 24px',
              display:'flex', gap:10 }}>
              <button onClick={()=>setShowSignOutConfirm(false)} disabled={signingOut}
                style={{ flex:1, padding:'12px', borderRadius:12, fontSize:13, fontWeight:700,
                  background:'var(--input-bg)', border:'1px solid var(--border)',
                  cursor:signingOut?'not-allowed':'pointer',
                  color:'var(--text2)', transition:'all 0.15s' }}>
                Cancel
              </button>
              <motion.button whileTap={!signingOut ? { scale:0.98 } : {}}
                onClick={performSignOut} disabled={signingOut}
                style={{ flex:1.3, padding:'12px', borderRadius:12, fontSize:13, fontWeight:700,
                  border:'none', cursor:signingOut?'not-allowed':'pointer',
                  background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                  opacity:signingOut?0.8:1,
                  boxShadow:'0 8px 22px rgba(239,68,68,0.35)', transition:'box-shadow 0.15s' }}>
                {signingOut
                  ? <><motion.div animate={{ rotate:360 }}
                      transition={{ duration:0.7, repeat:Infinity, ease:'linear' }}
                      style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.35)',
                        borderTopColor:'#fff', borderRadius:'50%' }} />Signing out…</>
                  : <><LogOut size={14}/> Sign Out</>
                }
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <header style={{
      height: 60, position:'sticky', top:0, zIndex:30,
      background: 'var(--header-bg)',
      backdropFilter:'blur(20px)',
      borderBottom:'1px solid var(--border)',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'0 24px',
      fontFamily:'Inter, Plus Jakarta Sans, system-ui, sans-serif',
      transition: 'background 0.35s, border-color 0.35s',
    }}>
      <div>
        <h1 style={{ fontSize:16, fontWeight:800, color:'var(--text)', letterSpacing:'-0.02em', lineHeight:1.2 }}>
          {title}
        </h1>
        {subtitle
          ? <p style={{ fontSize:11, color:'var(--text2)', marginTop:1 }}>{subtitle}</p>
          : <p style={{ fontSize:10, color:'var(--accent)', fontWeight:700, letterSpacing:'0.06em', marginTop:1 }}>{headerTitle}</p>
        }
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {actions}

        <motion.button whileTap={{ scale:0.92 }}
          onClick={() => setShowSignOutConfirm(true)}
          title="Sign Out"
          style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:9,
            background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.18)',
            cursor:'pointer', color:'#ef4444', fontSize:12, fontWeight:700 }}>
          <LogOut size={14}/> <span className="hidden sm:inline">Sign Out</span>
        </motion.button>

        <motion.div whileTap={{ scale:0.92 }}>
          <Link href="/settings"
            style={{ width:34, height:34, borderRadius:9, cursor:'pointer',
              background: onSettings ? 'rgba(100,116,139,0.15)' : 'var(--input-bg)',
              border: onSettings ? '1.5px solid rgba(100,116,139,0.5)' : '1px solid var(--border2)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color: onSettings ? '#94a3b8' : 'var(--text3)',
              textDecoration:'none', transition:'all 0.2s' }}>
            <Settings size={15} style={{
              transition:'transform 0.4s ease',
            }}/>
          </Link>
        </motion.div>

        <motion.button whileTap={{ scale:0.92 }} onClick={toggleTheme}
          title={isLight ? 'Switch to Dark' : 'Switch to Light'}
          style={{ width:34, height:34, borderRadius:9, cursor:'pointer',
            background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
            border:'1px solid var(--border2)',
            display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text2)' }}>
          {isLight ? <Moon size={14}/> : <Sun size={14}/>}
        </motion.button>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0,
            background:'linear-gradient(135deg,var(--accent),var(--accent2,#ea580c))',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:12, fontWeight:800, color:'#fff',
            boxShadow:'0 4px 12px var(--glow-accent)' }}>
            {session?.user?.name?.charAt(0) || 'A'}
          </div>
          <div className="hidden sm:block">
            <p style={{ fontSize:12, fontWeight:700, color:'var(--text)', lineHeight:1.2 }}>
              {session?.user?.name}
            </p>
            <p style={{ fontSize:10, color:'var(--accent)', fontWeight:600 }}>
              {(session?.user as any)?.adminId}
            </p>
          </div>
        </div>
      </div>

      {mounted && createPortal(signOutModal, document.body)}
    </header>
  );
}