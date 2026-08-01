'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Home, GraduationCap, Users, CreditCard, Settings, LogOut, BookOpen, Activity } from 'lucide-react';
import { useTheme } from '@/lib/theme';

const NAV = [
  { href:'/home',           icon:Home,          label:'Dashboard',        color:'#f97316' },
  { href:'/faculty-submit', icon:GraduationCap, label:'Faculty',           color:'#4f6ef7' },
  { href:'/staff-submit',   icon:Users,         label:'Staff',             color:'#14b8a6' },
  { href:'/student-submit', icon:BookOpen,      label:'Students',          color:'#a855f7' },
  { href:'/create-id',      icon:CreditCard,    label:'Create ID',         color:'#f97316' },
  { href:'/activity-log',   icon:Activity,      label:'Activity Log',      color:'#f97316' },
  { href:'/settings',       icon:Settings,      label:'Settings',          color:'#64748b' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, schoolName } = useTheme();
  const isLight = theme === 'light';
  const shortName = schoolName.split(' ').slice(0,3).map((w:string)=>w[0]).join('') || 'SV8C';
  const logoBg = isLight ? '#f0f4ff' : '#08090d';

  return (
    <aside style={{ width:260, height:'100vh', position:'fixed', left:0, top:0, zIndex:40,
      display:'flex', flexDirection:'column',
      background: isLight ? 'rgba(240,244,255,0.97)' : 'rgba(8,9,13,0.97)',
      backdropFilter:'blur(24px)', borderRight:'1px solid var(--border)',
      fontFamily:'Inter, Plus Jakarta Sans, system-ui, sans-serif', transition:'background 0.35s, border-color 0.35s' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:160,
        background:'radial-gradient(ellipse at 50% -20%,rgba(249,115,22,0.10) 0%,transparent 70%)', pointerEvents:'none' }} />

      {/* Logo */}
      <div style={{ padding:'20px 18px 16px', borderBottom:'1px solid var(--border)', position:'relative', zIndex:1 }}>
        <Link href="/home" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:12 }}>
          <div className="animated-border" style={{ padding:2, borderRadius:12, display:'inline-block', flexShrink:0 }}>
            <div style={{ background:logoBg, borderRadius:10, padding:6, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <img src="https://cdn.phototourl.com/free/2026-05-30-cddc7547-fc18-4888-841d-b8acd54ea907.png"
                alt="Logo" style={{ width:28, height:28, objectFit:'contain', display:'block' }} />
            </div>
          </div>
          <div style={{ minWidth:0 }}>
            <p style={{ color:'var(--text)', fontSize:13, fontWeight:800, letterSpacing:'-0.02em',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{shortName}</p>
            <p style={{ color:'var(--accent)', fontSize:9, fontWeight:700, letterSpacing:'0.12em' }}>ID MANAGEMENT</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav style={{ flex:1, padding:'12px 10px', overflowY:'auto', position:'relative', zIndex:1 }}>
        <p style={{ color:'var(--text3)', fontSize:9, fontWeight:700, letterSpacing:'0.12em',
          textTransform:'uppercase', padding:'0 8px 8px' }}>Navigation</p>
        {NAV.map(item => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration:'none', display:'block', marginBottom:3 }}>
              <motion.div whileHover={{ x:4 }} whileTap={{ scale:0.97 }}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:11,
                  background: active ? `${item.color}18` : 'transparent',
                  border: active ? `1px solid ${item.color}35` : '1px solid transparent',
                  cursor:'pointer', transition:'all 0.15s', position:'relative', overflow:'hidden' }}>
                {active && (
                  <motion.div layoutId="nav-active-bar"
                    style={{ position:'absolute', left:0, top:0, bottom:0, width:3, borderRadius:'0 3px 3px 0',
                      background:`linear-gradient(180deg,${item.color},${item.color}60)` }} />
                )}
                <div style={{ width:32, height:32, borderRadius:9, flexShrink:0,
                  background: active ? `${item.color}20` : 'var(--input-bg)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow: active ? `0 0 14px ${item.color}40` : 'none', transition:'all 0.2s' }}>
                  <item.icon size={15} style={{ color: active ? item.color : 'var(--text3)' }} />
                </div>
                <span style={{ color: active?'var(--text)':'var(--text2)', fontSize:13, fontWeight:active?700:400, flex:1 }}>
                  {item.label}
                </span>
                {active && <div style={{ width:6, height:6, borderRadius:'50%', background:item.color, boxShadow:`0 0 8px ${item.color}` }} />}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding:'10px 10px 16px', borderTop:'1px solid var(--border)', position:'relative', zIndex:1 }}>
        <div style={{ padding:12, borderRadius:12, background:'var(--input-bg)',
          border:'1px solid var(--border)', marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', flexShrink:0,
              background:'linear-gradient(135deg,var(--accent),#ea580c)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:13, fontWeight:800, color:'#fff', boxShadow:'0 4px 12px var(--glow-accent)' }}>
              {session?.user?.name?.charAt(0)||'A'}
            </div>
            <div style={{ minWidth:0, flex:1 }}>
              <p style={{ color:'var(--text)', fontSize:12, fontWeight:700,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{session?.user?.name}</p>
              <p style={{ color:'var(--accent)', fontSize:10, fontWeight:600 }}>{(session?.user as any)?.adminId}</p>
            </div>
          </div>
        </div>
        <motion.button whileHover={{ scale:1.01 }} whileTap={{ scale:0.97 }}
          onClick={async()=>{
            try { await fetch('/api/auth/logout',{method:'POST'}); } catch{}
            signOut({ callbackUrl:'/login' });
          }}
          style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'9px 12px',
            borderRadius:10, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)',
            cursor:'pointer', transition:'all 0.15s' }}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,0.12)';e.currentTarget.style.borderColor='rgba(239,68,68,0.3)';}}
          onMouseLeave={e=>{e.currentTarget.style.background='rgba(239,68,68,0.06)';e.currentTarget.style.borderColor='rgba(239,68,68,0.15)';}}>
          <LogOut size={14} style={{ color:'#ef4444' }} />
          <span style={{ color:'#ef4444', fontSize:13, fontWeight:600 }}>Sign Out</span>
        </motion.button>
      </div>
    </aside>
  );
}
