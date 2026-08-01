'use client';
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, EyeOff, ArrowRight, AlertCircle, Mail, Lock,
  GraduationCap, Users, ShieldCheck, UserPlus, LogIn,
  Sun, Moon, BookOpen, Delete, CheckCircle2, KeyRound
} from 'lucide-react';
import { useTheme } from '@/lib/theme';

type UserType = 'faculty' | 'staff' | 'student' | 'admin';
type Mode = 'login' | 'register';
type Screen = 'pin' | 'form';

// Role PINs
const ROLE_PINS: Record<string, UserType> = {
  '8971': 'student',
  '1389': 'faculty',
  '9013': 'staff',
  '3490': 'admin',
};

const ROLE_META: Record<UserType, { label: string; color: string; glow: string; icon: any; desc: string; grad: string }> = {
  faculty: { label:'Faculty',  color:'#4f6ef7', glow:'rgba(79,110,247,0.3)',  icon:GraduationCap, desc:'Teaching Staff', grad:'linear-gradient(135deg,#4f6ef7,#3b5bdb)' },
  staff:   { label:'Staff',    color:'#14b8a6', glow:'rgba(20,184,166,0.3)',  icon:Users,         desc:'Non-Teaching',  grad:'linear-gradient(135deg,#14b8a6,#0d9488)' },
  student: { label:'Student',  color:'#a855f7', glow:'rgba(168,85,247,0.3)', icon:BookOpen,      desc:'Grade 7–10',    grad:'linear-gradient(135deg,#a855f7,#9333ea)' },
  admin:   { label:'Admin',    color:'#f97316', glow:'rgba(249,115,22,0.3)', icon:ShieldCheck,   desc:'System Admin',  grad:'linear-gradient(135deg,#f97316,#ea580c)' },
};

export default function LoginPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  // ── PIN screen state ──
  const [screen, setScreen] = useState<Screen>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinShake, setPinShake] = useState(false);
  const [pinMasked, setPinMasked] = useState(true);

  // ── Form screen state ──
  const [userType, setUserType] = useState<UserType | null>(null);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const sel = userType ? ROLE_META[userType] : null;

  // ── PIN keypad logic ──
  function pressKey(k: string) {
    if (pin.length >= 4) return;
    const next = pin + k;
    setPin(next);
    setPinError('');
    if (next.length === 4) validatePin(next);
  }

  function pressDelete() { setPin(p => p.slice(0, -1)); setPinError(''); }

  function validatePin(p: string) {
    const role = ROLE_PINS[p];
    if (!role) {
      setPinShake(true);
      setPinError('Incorrect PIN. Please try again.');
      setTimeout(() => { setPinShake(false); setPin(''); }, 600);
      return;
    }
    setTimeout(() => {
      setUserType(role);
      setScreen('form');
      setPin('');
      setPinError('');
    }, 200);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userType) return;
    setLoading(true); setError(''); setSuccess('');

    if (mode === 'register') {
      if (password !== confirmPw) { setError('Passwords do not match.'); setLoading(false); return; }
      if (!email.endsWith('@gmail.com')) { setError('Please use a Gmail address (@gmail.com).'); setLoading(false); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); setLoading(false); return; }
      const apiType = userType === 'student' ? 'students' : userType;
      const res = await fetch(`/api/${apiType}/create-account`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed.'); setLoading(false); return; }
      setSuccess('Account created! You can now sign in.');
      setMode('login'); setPassword(''); setConfirmPw('');
      setLoading(false); return;
    }

    const res = await signIn('credentials', { username: email, password, userType, redirect: false });
    if (res?.error) { setError('Invalid credentials. Please try again.'); setLoading(false); }
    else { router.push(userType === 'admin' ? '/home' : userType === 'student' ? '/student-status' : '/my-status'); }
  }

  const KEYS = [['1','2','3'],['4','5','6'],['7','8','9'],['','0','del']];

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 14px 14px 44px',
    background: 'var(--input-bg)', color: 'var(--text)',
    border: '1.5px solid var(--input-border)', borderRadius: 13,
    fontSize: 15, outline: 'none', transition: 'all 0.2s', fontFamily: 'inherit',
  };

  return (
    <div suppressHydrationWarning style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg)', position:'relative', overflow:'hidden', transition:'background 0.35s' }}>

      {/* BG orbs */}
      <motion.div animate={{ x:[0,60,0], y:[0,-40,0] }} transition={{ duration:10, repeat:Infinity, ease:'easeInOut' }}
        style={{ position:'fixed', width:700, height:700, borderRadius:'50%', top:'-20%', left:'-10%', pointerEvents:'none',
          background:'radial-gradient(circle,rgba(79,110,247,0.10) 0%,transparent 70%)', filter:'blur(60px)' }} />
      <motion.div animate={{ x:[0,-50,0], y:[0,50,0] }} transition={{ duration:8, repeat:Infinity, ease:'easeInOut', delay:2 }}
        style={{ position:'fixed', width:600, height:600, borderRadius:'50%', bottom:'-15%', right:'-5%', pointerEvents:'none',
          background:'radial-gradient(circle,rgba(249,115,22,0.08) 0%,transparent 70%)', filter:'blur(60px)' }} />
      <div style={{ position:'fixed', inset:0, opacity:isLight?0.04:0.025, pointerEvents:'none',
        backgroundImage:'linear-gradient(var(--border2) 1px,transparent 1px),linear-gradient(90deg,var(--border2) 1px,transparent 1px)',
        backgroundSize:'48px 48px' }} />

      {/* Theme toggle */}
      <motion.button whileTap={{ scale:0.92 }} onClick={toggleTheme}
        style={{ position:'fixed', top:20, right:20, zIndex:100, width:42, height:42, borderRadius:12, cursor:'pointer',
          background:'var(--card)', border:'1px solid var(--border2)',
          display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text2)',
          backdropFilter:'blur(16px)', boxShadow:'0 4px 16px rgba(0,0,0,0.15)' }}>
        {isLight ? <Moon size={18}/> : <Sun size={18}/>}
      </motion.button>

      <AnimatePresence mode="wait">

        {/* ── PIN SCREEN ── */}
        {screen === 'pin' && (
          <motion.div key="pin"
            initial={{ opacity:0, scale:0.94 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.94 }}
            transition={{ duration:0.4, ease:[0.22,1,0.36,1] }}
            style={{ width:'100%', maxWidth:400, padding:24, zIndex:1 }}>

            {/* Header card */}
            <div className="glass-strong noise" style={{ borderRadius:28, overflow:'hidden' }}>
              <div style={{ height:4, background:'linear-gradient(90deg,#4f6ef7,#f97316,#14b8a6)' }} />
              <div style={{ padding:'36px 32px 32px', display:'flex', flexDirection:'column', alignItems:'center' }}>

                {/* Logo + school name */}
                <div className="animated-border" style={{ padding:3, borderRadius:20, display:'inline-block', marginBottom:16 }}>
                  <div style={{ background:'var(--bg)', borderRadius:17, padding:12, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <img src="https://cdn.phototourl.com/free/2026-05-30-cddc7547-fc18-4888-841d-b8acd54ea907.png"
                      alt="Logo" style={{ width:56, height:56, objectFit:'contain', display:'block' }} />
                  </div>
                </div>
                <h1 style={{ fontSize:18, fontWeight:900, color:'var(--text)', letterSpacing:'-0.02em', textAlign:'center', lineHeight:1.2, marginBottom:4 }}>
                  SOUTH VILLE 8C
                </h1>
                <p style={{ fontSize:13, color:'var(--text2)', fontWeight:700, textAlign:'center', marginBottom:4 }}>
                  NATIONAL HIGH SCHOOL
                </p>
                <p style={{ fontSize:10, color:'var(--accent)', fontWeight:700, letterSpacing:'0.12em', textAlign:'center', marginBottom:28 }}>
              
                </p>

                {/* PIN label */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
                  <KeyRound size={15} style={{ color:'var(--text3)' }} />
                  <p style={{ fontSize:13, color:'var(--text2)', fontWeight:600 }}>Enter your private access PIN</p>
                </div>

                {/* PIN dots */}
                <motion.div
                  animate={pinShake ? { x:[-8,8,-6,6,-4,4,0] } : { x:0 }}
                  transition={{ duration:0.4 }}
                  style={{ display:'flex', gap:12, marginBottom:14 }}>
                  {Array.from({ length:4 }).map((_, i) => {
                    const filled = i < pin.length;
                    return (
                      <div key={i} style={{ width:44, height:52, borderRadius:12,
                        background: filled ? 'var(--accent)' : 'var(--input-bg)',
                        border: `2px solid ${filled ? 'var(--accent)' : 'var(--border2)'}`,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:22, fontWeight:900, color:'#fff',
                        transition:'all 0.15s',
                        boxShadow: filled ? '0 4px 16px var(--glow-accent)' : 'none' }}>
                        {filled ? (pinMasked ? '●' : pin[i]) : ''}
                      </div>
                    );
                  })}
                </motion.div>

                {/* Show/hide PIN */}
                <button onClick={() => setPinMasked(p => !p)}
                  style={{ fontSize:11, color:'var(--text3)', background:'none', border:'none', cursor:'pointer', marginBottom:6 }}>
                  {pinMasked ? 'Show PIN' : 'Hide PIN'}
                </button>

                {/* Error */}
                <AnimatePresence>
                  {pinError && (
                    <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                      style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(239,68,68,0.1)',
                        border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'10px 14px',
                        color:'#ef4444', fontSize:12, width:'100%', marginBottom:8 }}>
                      <AlertCircle size={14} style={{ flexShrink:0 }} /> {pinError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Numpad */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, width:'100%', marginTop:4 }}>
                  {KEYS.flat().map((k, i) => {
                    if (k === '') return <div key={i} />;
                    return (
                      <motion.button key={i}
                        whileHover={{ scale:1.05, y:-1 }} whileTap={{ scale:0.93 }}
                        onClick={() => k === 'del' ? pressDelete() : pressKey(k)}
                        style={{ height:56, borderRadius:14, fontSize:k==='del'?13:22, fontWeight:k==='del'?700:800,
                          background: k==='del' ? 'rgba(239,68,68,0.08)' : 'var(--input-bg)',
                          border: k==='del' ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--border2)',
                          color: k==='del' ? '#ef4444' : 'var(--text)',
                          cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                          transition:'all 0.15s', fontFamily:'monospace' }}>
                        {k === 'del' ? <Delete size={18}/> : k}
                      </motion.button>
                    );
                  })}
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {/* ── FORM SCREEN ── */}
        {screen === 'form' && userType && sel && (
          <motion.div key="form"
            initial={{ opacity:0, x:40 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-40 }}
            transition={{ duration:0.4, ease:[0.22,1,0.36,1] }}
            style={{ width:'100%', maxWidth:460, padding:24, zIndex:1 }}>

            <div className="glass-strong noise" style={{ borderRadius:28, overflow:'hidden' }}>
              <div style={{ height:4, background:sel.grad }} />
              <div style={{ padding:'32px 36px 36px' }}>

                {/* Back + role badge */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
                  <button onClick={() => { setScreen('pin'); setError(''); setSuccess(''); setEmail(''); setPassword(''); setConfirmPw(''); }}
                    style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700,
                      color:'var(--text3)', background:'none', border:'none', cursor:'pointer' }}>
                    ← Back to PIN
                  </button>
                  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px', borderRadius:20,
                    background:`${sel.color}18`, border:`1px solid ${sel.color}40` }}>
                    <sel.icon size={14} style={{ color:sel.color }} />
                    <span style={{ fontSize:12, fontWeight:800, color:sel.color }}>{sel.label} Portal</span>
                  </div>
                </div>

                {/* Logo + title */}
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
                  <div style={{ width:44, height:44, borderRadius:13, background:sel.grad,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow:`0 6px 20px ${sel.glow}` }}>
                    <sel.icon size={20} style={{ color:'#fff' }} />
                  </div>
                  <div>
                    <h2 style={{ fontSize:20, fontWeight:900, color:'var(--text)', letterSpacing:'-0.03em', lineHeight:1.1 }}>
                      {mode === 'register' ? 'Create Account' : `STUDENT ID FORM`}
                    </h2>
                    <p style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>
                      {mode === 'register' ? `Register as ${sel.label}` : `Sign in to ${sel.label} Portal`}
                    </p>
                  </div>
                </div>

                {/* Sign in / Register toggle (not for admin) */}
                {userType !== 'admin' && (
                  <div style={{ display:'flex', gap:4, marginBottom:22, background:'var(--input-bg)',
                    padding:4, borderRadius:13, border:'1px solid var(--border)' }}>
                    {(['login','register'] as Mode[]).map(m => (
                      <motion.button key={m} onClick={() => { setMode(m); setError(''); setSuccess(''); }}
                        whileTap={{ scale:0.97 }}
                        style={{ flex:1, padding:'11px', borderRadius:10, fontSize:13, fontWeight:700,
                          border:'none', cursor:'pointer', display:'flex', alignItems:'center',
                          justifyContent:'center', gap:6, transition:'all 0.2s',
                          background: mode===m ? sel.color : 'transparent',
                          color: mode===m ? '#fff' : 'var(--text2)',
                          boxShadow: mode===m ? `0 4px 14px ${sel.glow}` : 'none' }}>
                        {m==='login' ? <><LogIn size={14}/>Sign In</> : <><UserPlus size={14}/>Register</>}
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Error / success alerts */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                      style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(239,68,68,0.1)',
                        border:'1px solid rgba(239,68,68,0.25)', borderRadius:12, padding:'12px 16px',
                        marginBottom:18, color:'#ef4444', fontSize:14 }}>
                      <AlertCircle size={16}/> {error}
                    </motion.div>
                  )}
                  {success && (
                    <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
                      style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(34,197,94,0.1)',
                        border:'1px solid rgba(34,197,94,0.25)', borderRadius:12, padding:'12px 16px',
                        marginBottom:18, color:'#22c55e', fontSize:14 }}>
                      <CheckCircle2 size={16}/> {success}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  {/* Email */}
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:'var(--text2)', display:'block',
                      marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                      {userType==='admin' ? 'Username' : 'Gmail Address'}
                    </label>
                    <div style={{ position:'relative' }}>
                      <Mail size={17} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }} />
                      <input type={userType==='admin'?'text':'email'} value={email}
                        onChange={e=>setEmail(e.target.value)} required
                        placeholder={userType==='admin'?'Enter username':'yourname@gmail.com'}
                        autoComplete={userType==='admin'?'username':'email'}
                        style={{ ...inputStyle, paddingLeft:44,
                          borderColor: email ? `${sel.color}60` : 'var(--input-border)',
                          boxShadow: email ? `0 0 0 3px ${sel.glow}` : 'none' }}
                        onFocus={e=>{ e.target.style.borderColor=sel.color+'90'; e.target.style.boxShadow=`0 0 0 3px ${sel.glow}`; }}
                        onBlur={e=>{ e.target.style.borderColor=email?`${sel.color}60`:'var(--input-border)'; e.target.style.boxShadow=email?`0 0 0 3px ${sel.glow.replace('0.3','0.1')}`:'none'; }}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:'var(--text2)', display:'block',
                      marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Password</label>
                    <div style={{ position:'relative' }}>
                      <Lock size={17} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }} />
                      <input type={showPw?'text':'password'} value={password}
                        onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"
                        placeholder="Enter your password"
                        style={{ ...inputStyle, paddingLeft:44, paddingRight:46 }}
                        onFocus={e=>{ e.target.style.borderColor=sel.color+'90'; e.target.style.boxShadow=`0 0 0 3px ${sel.glow}`; }}
                        onBlur={e=>{ e.target.style.borderColor='var(--input-border)'; e.target.style.boxShadow='none'; }}
                      />
                      <button type="button" onClick={()=>setShowPw(!showPw)}
                        style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
                          background:'none', border:'none', cursor:'pointer', color:'var(--text3)', padding:4 }}>
                        {showPw ? <EyeOff size={17}/> : <Eye size={17}/>}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  {mode==='register' && (
                    <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }}>
                      <label style={{ fontSize:12, fontWeight:700, color:'var(--text2)', display:'block',
                        marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Confirm Password</label>
                      <div style={{ position:'relative' }}>
                        <Lock size={17} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }} />
                        <input type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)}
                          required placeholder="Re-enter password"
                          style={{ ...inputStyle, paddingLeft:44,
                            borderColor: confirmPw && confirmPw===password ? 'rgba(34,197,94,0.6)' : 'var(--input-border)' }}
                          onFocus={e=>{ e.target.style.borderColor=sel.color+'90'; e.target.style.boxShadow=`0 0 0 3px ${sel.glow}`; }}
                          onBlur={e=>{ e.target.style.borderColor=confirmPw&&confirmPw===password?'rgba(34,197,94,0.6)':'var(--input-border)'; e.target.style.boxShadow='none'; }}
                        />
                        {confirmPw && confirmPw===password && <span style={{ position:'absolute', right:14, top:'50%', transform:'translateY(-50%)', color:'#22c55e', fontSize:16 }}>✓</span>}
                      </div>
                    </motion.div>
                  )}

                  <motion.button type="submit" disabled={loading}
                    whileHover={!loading?{scale:1.02,y:-1}:{}} whileTap={!loading?{scale:0.98}:{}}
                    style={{ width:'100%', padding:'16px', marginTop:4,
                      background: loading ? 'var(--input-bg)' : sel.grad,
                      color: loading ? 'var(--text3)' : '#fff',
                      border: loading ? '1px solid var(--border)' : 'none',
                      borderRadius:15, fontSize:15, fontWeight:700,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                      boxShadow: loading ? 'none' : `0 8px 28px ${sel.glow}`,
                      transition:'all 0.2s' }}>
                    {loading ? (
                      <><motion.div animate={{rotate:360}} transition={{duration:0.8,repeat:Infinity,ease:'linear'}}
                        style={{width:18,height:18,border:'2px solid var(--text3)',borderTopColor:'var(--text)',borderRadius:'50%'}}/>
                      {mode==='register'?'Creating...':'Signing in...'}</>
                    ) : (
                      <>{mode==='register'?<><UserPlus size={16}/>Create Account</>:<><LogIn size={16}/>Sign In</>}<ArrowRight size={15}/></>
                    )}
                  </motion.button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
