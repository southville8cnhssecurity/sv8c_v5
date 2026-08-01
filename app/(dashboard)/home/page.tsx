'use client';
import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import { useTheme } from '@/lib/theme';
import { CreditCard, GraduationCap, Users, ShieldCheck, CheckCircle, BookOpen, Clock, LogOut, Settings, Moon, Sun } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { data: session } = useSession();
  const { schoolName, theme, toggleTheme } = useTheme() as any;
  const [stats, setStats] = useState<any>({});
  const [sectionStats, setSectionStats] = useState<Record<number,any[]>>({7:[],8:[],9:[],10:[]});
  const [loading, setLoading] = useState(true);
  // ── Start as null on both server and first client render so they match.
  // The mismatch before was caused by the server and the client each
  // calling `new Date()` independently at a slightly different moment —
  // the actual clock value is now only ever set client-side, after mount. ──
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/home/stats').then(r=>r.json()),
      fetch('/api/home/section-stats').then(r=>r.json()),
    ]).then(([s,ss])=>{ setStats(s); setSectionStats(ss); setLoading(false); }).catch(()=>setLoading(false));
    setTime(new Date());
    const t = setInterval(()=>setTime(new Date()),1000);
    return ()=>clearInterval(t);
  },[]);

  const hour = time ? time.getHours() : 0;
  const greeting = time ? (hour<12?'Good morning':hour<17?'Good afternoon':'Good evening') : '';
  const adminId = (session?.user as any)?.adminId||'';

  const statCards = [
    { label:'Total IDs',      value:stats.totalIds||0,       icon:CreditCard,    color:'#f97316', grad:'linear-gradient(135deg,#f97316,#ea580c)', glow:'rgba(249,115,22,0.3)' },
    { label:'Faculty IDs',    value:stats.facultyIds||0,     icon:GraduationCap, color:'#4f6ef7', grad:'linear-gradient(135deg,#4f6ef7,#3b5bdb)', glow:'rgba(79,110,247,0.3)' },
    { label:'Staff IDs',      value:stats.staffIds||0,       icon:Users,         color:'#14b8a6', grad:'linear-gradient(135deg,#14b8a6,#0d9488)',  glow:'rgba(20,184,166,0.3)' },
    { label:'Student IDs',    value:stats.studentIds||0,     icon:BookOpen,      color:'#a855f7', grad:'linear-gradient(135deg,#a855f7,#9333ea)',  glow:'rgba(168,85,247,0.3)' },
    { label:'Total Students', value:stats.studentCount||0,   icon:BookOpen,      color:'#22c55e', grad:'linear-gradient(135deg,#22c55e,#16a34a)',  glow:'rgba(34,197,94,0.3)' },
    { label:'Pending',        value:stats.pendingStudents||0,icon:Clock,         color:'#f59e0b', grad:'linear-gradient(135deg,#f59e0b,#d97706)',  glow:'rgba(245,158,11,0.3)' },
  ];

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.35 }}
      style={{ background:'var(--bg)', minHeight:'100vh', transition:'background 0.35s',
        fontFamily:'Inter, Plus Jakarta Sans, system-ui, sans-serif' }}>
      {/* ── Sticky top: header bar + school banner both stay visible while scrolling ── */}
      <div style={{ position:'sticky', top:0, zIndex:50, background:'var(--bg)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, padding:'20px 24px',
          borderBottom:'1px solid var(--border)', background:'var(--card)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <img src="/SV8CLOGOBG.png" alt="Logo"
              style={{ width:48, height:48, objectFit:'contain', flexShrink:0 }} />
            <div>
              <h1 style={{ fontSize:24, fontWeight:900, letterSpacing:'0.03em',
                textTransform:'uppercase', color:'var(--text)', margin:0, lineHeight:1.1 }}>
                Dashboard
              </h1>
              <p style={{ fontSize:14, color:'var(--text2)', marginTop:4, fontWeight:500 }}>
                Admin overview
              </p>
            </div>
          </div>

          {/* Right-side toolbar: logout · settings · theme toggle · avatar */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <button onClick={() => signOut()} title="Log out"
              style={{ width:38, height:38, borderRadius:10, border:'1px solid rgba(239,68,68,0.2)',
                background:'rgba(239,68,68,0.08)', color:'#ef4444', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
              <LogOut size={16} />
            </button>

            <Link href="/settings" style={{ textDecoration:'none' }}>
              <button title="Settings"
                style={{ width:38, height:38, borderRadius:10, border:'1px solid var(--border2)',
                  background:'var(--input-bg)', color:'var(--text2)', cursor:'pointer',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Settings size={16} />
              </button>
            </Link>

            <button onClick={() => toggleTheme?.()} title="Toggle theme"
              style={{ width:38, height:38, borderRadius:10, border:'1px solid var(--border2)',
                background:'var(--input-bg)', color:'var(--text2)', cursor:'pointer',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <div title={session?.user?.name || 'Admin'}
              style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#f97316,#ef4444)',
                color:'#fff', fontSize:14, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center',
                flexShrink:0, textTransform:'uppercase' }}>
              {(session?.user?.name || 'A').charAt(0)}
            </div>
          </div>
        </div>
        <div style={{ padding:'0 24px 24px', maxWidth:1200, margin:'0 auto' }}>

          {/* ── School Hero Banner ── */}
          <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.05 }}
            style={{ borderRadius:22, marginTop:24, padding:'28px 32px', position:'relative',
              overflow:'hidden', background:'var(--card)', border:'1px solid var(--border)',
              backdropFilter:'blur(20px)' }}>
            {/* Background orbs */}
            <div style={{ position:'absolute', top:-80, right:-80, width:280, height:280, borderRadius:'50%', pointerEvents:'none',
              background:'radial-gradient(circle,rgba(249,115,22,0.12) 0%,transparent 70%)', filter:'blur(40px)' }}/>
            <div style={{ position:'absolute', bottom:-60, left:'15%', width:220, height:220, borderRadius:'50%', pointerEvents:'none',
              background:'radial-gradient(circle,rgba(79,110,247,0.09) 0%,transparent 70%)', filter:'blur(40px)' }}/>

            <div style={{ position:'relative', zIndex:1, display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
              {/* Logo */}
              <motion.div whileHover={{ scale:1.05, rotate:2 }} transition={{ type:'spring', stiffness:300 }}>
                <div className="animated-border" style={{ padding:3, borderRadius:20, display:'inline-block' }}>
                  <div style={{ background:'var(--bg)', borderRadius:17, padding:12, display:'flex',
                    alignItems:'center', justifyContent:'center' }}>
                    <img src="/SV8CLOGOBG.png"
                      alt="School Logo"
                      style={{ width:72, height:72, objectFit:'contain', display:'block' }} />
                  </div>
                </div>
              </motion.div>

              {/* School name + greeting */}
              <div style={{ flex:1, minWidth:220 }}>
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:20,
                  background:'rgba(249,115,22,0.1)', border:'1px solid rgba(249,115,22,0.2)', marginBottom:10 }}>
                  <ShieldCheck size={11} style={{ color:'var(--accent)' }}/>
                  <p style={{ color:'var(--accent)', fontSize:10, fontWeight:700, letterSpacing:'0.08em' }}>
                    ADMIN · {adminId.toUpperCase()}
                  </p>
                </div>
                <h1 style={{ fontSize:28, fontWeight:900, letterSpacing:'-0.03em', lineHeight:1.1,
                  color:'var(--text)', marginBottom:6 }}>
                  {greeting ? `${greeting}, ${session?.user?.name?.split(' ')[0]}` : '\u00A0'} 👋
                </h1>
                <p style={{ color:'var(--text2)', fontSize:14, fontWeight:600, letterSpacing:'0.01em' }}>
                  SOUTH VILLE 8C NATIONAL HIGH SCHOOL
                </p>
                <p style={{ color:'var(--text3)', fontSize:12, marginTop:3 }}>
                  ID Management System · Administration Portal
                </p>
              </div>

              {/* Live clock — null on first render (server + first client
                  paint match), real value fills in a moment after mount */}
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <p style={{ fontSize:32, fontWeight:800, color:'var(--text)', fontFamily:'monospace',
                  letterSpacing:'0.04em', lineHeight:1 }}>
                  {time ? time.toLocaleTimeString() : '--:--:--'}
                </p>
                <p style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
                  {time ? time.toLocaleDateString('en-PH',{ weekday:'long', month:'long', day:'numeric', year:'numeric' }) : '\u00A0'}
                </p>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      {/* ── Scrollable content below the sticky banner ── */}
      {/* extra bottom padding so the last grade row isn't hidden behind the fixed bottom navbar */}
      <div style={{ padding:'24px 24px 110px', maxWidth:1200, margin:'0 auto' }}>

        {/* ── Stat cards ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:14, marginBottom:24 }}>
          {statCards.map((card,i)=>(
            <motion.div key={card.label}
              initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
              transition={{ delay:0.08+i*0.05 }} whileHover={{ scale:1.03, y:-3 }}
              style={{ padding:18, borderRadius:16, position:'relative', overflow:'hidden',
                background:'var(--card)', border:'1px solid var(--border)', backdropFilter:'blur(12px)',
                cursor:'default' }}>
              <div style={{ width:36, height:36, borderRadius:10, marginBottom:12, background:card.grad,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:`0 4px 16px ${card.glow}`, flexShrink:0 }}>
                <card.icon size={17} style={{ color:'#fff' }}/>
              </div>
              <p style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase',
                letterSpacing:'0.08em', marginBottom:4 }}>{card.label}</p>
              {loading
                ? <div className="skeleton" style={{ height:28, width:50, borderRadius:6 }}/>
                : <p style={{ fontSize:26, fontWeight:900, color:'var(--text)', letterSpacing:'-0.03em', lineHeight:1 }}>
                    {card.value.toLocaleString()}
                  </p>}
            </motion.div>
          ))}
        </div>

        {/* ── Grade / Section Grid ── */}
        <div style={{ borderRadius:18, border:'1px solid var(--border)', background:'var(--card)',
          backdropFilter:'blur(12px)', overflow:'hidden', marginBottom:20 }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)',
            display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
            <div>
              <p style={{ fontSize:14, fontWeight:800, color:'var(--text)' }}>
                Student ID Progress — by Section
              </p>
              <p style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                🟢 Green = all approved students have IDs &nbsp;·&nbsp; ⬜ Grey = incomplete
              </p>
            </div>
            <Link href="/create-id" style={{ textDecoration:'none' }}>
              <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                style={{ padding:'8px 16px', borderRadius:10, fontSize:12, fontWeight:700,
                  background:'rgba(79,110,247,0.1)', border:'1px solid rgba(79,110,247,0.25)',
                  color:'#4f6ef7', cursor:'pointer' }}>Generate IDs →</motion.button>
            </Link>
          </div>
          <div style={{ padding:20 }}>
            {[7,8,9,10].map(grade => {
              const secs: any[] = sectionStats[grade]||[];
              const totalStudents = secs.reduce((a,s)=>a+(s.total||0),0);
              const totalWithIds  = secs.reduce((a,s)=>a+(s.with_ids||0),0);
              const pct = totalStudents>0 ? Math.round(totalWithIds/totalStudents*100) : 0;
              return (
                <div key={grade} style={{ marginBottom:grade<10?20:0 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    marginBottom:10, flexWrap:'wrap', gap:8 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>Grade {grade}</span>
                      <span style={{ fontSize:11, color:'var(--text3)' }}>{totalWithIds}/{totalStudents} IDs done</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:90, height:6, borderRadius:3, background:'var(--input-bg)', overflow:'hidden' }}>
                        <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }}
                          transition={{ duration:0.8, delay:0.1 }}
                          style={{ height:'100%', borderRadius:3,
                            background: pct===100 ? '#22c55e' : 'linear-gradient(90deg,#4f6ef7,#a855f7)' }}/>
                      </div>
                      <span style={{ fontSize:11, fontWeight:700, minWidth:34,
                        color: pct===100 ? '#22c55e' : 'var(--text2)' }}>{pct}%</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                    {secs.length===0
                      ? <span style={{ fontSize:12, color:'var(--text3)', fontStyle:'italic' }}>
                          No sections — configure in Settings
                        </span>
                      : secs.map(sec => {
                          const done = sec.total>0 && sec.with_ids>=sec.total;
                          return (
                            <motion.div key={sec.id} whileHover={{ scale:1.06, y:-2 }}
                              title={`Section ${sec.name}: ${sec.with_ids}/${sec.total} IDs`}
                              style={{ padding:'8px 14px', borderRadius:10, cursor:'default',
                                transition:'all 0.25s',
                                background: done ? 'rgba(34,197,94,0.12)' : 'var(--input-bg)',
                                border:`1.5px solid ${done ? 'rgba(34,197,94,0.4)' : 'var(--border2)'}`,
                                boxShadow: done ? '0 4px 16px rgba(34,197,94,0.2)' : 'none' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                                {done && <CheckCircle size={11} style={{ color:'#22c55e' }}/>}
                                <span style={{ fontSize:13, fontWeight:700,
                                  color: done ? '#22c55e' : 'var(--text2)' }}>
                                  {sec.name}
                                </span>
                              </div>
                              <p style={{ fontSize:9, color:done?'rgba(34,197,94,0.7)':'var(--text3)',
                                marginTop:2, textAlign:'center' }}>{sec.with_ids}/{sec.total}</p>
                            </motion.div>
                          );
                        })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </motion.div>
  );
}