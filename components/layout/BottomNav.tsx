'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Home, Users, CreditCard, BookOpen, Activity } from 'lucide-react';

const ITEMS = [
  { href:'/home',           icon:Home,       label:'HOME',            color:'#f97316', countKey:null },
  { href:'/student-submit', icon:BookOpen,   label:'PENDING STUDENT', color:'#a855f7', countKey:'pendingStudents' },
  { href:'/staff-submit',   icon:Users,      label:'PENDING STAFF',   color:'#14b8a6', countKey:'pendingStaff' },
  { href:'/create-id',      icon:CreditCard, label:'CREATE ID',       color:'#f97316', countKey:'pendingIds' },
  { href:'/activity-log',   icon:Activity,   label:'LOGS',            color:'#22c55e', countKey:null },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const [counts, setCounts] = useState<Record<string, number>>({});

useEffect(() => {
    let cancelled = false;

    const fetchCounts = async () => {
      try {
        const res = await fetch('/api/dashboard/counts');
        const data = await res.json();
        if (cancelled) return;
        setCounts(data);
      } catch (e) {
        console.error('Failed to fetch pending counts', e);
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 10000);
    window.addEventListener('counts:refresh', fetchCounts);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('counts:refresh', fetchCounts);
    };
  }, []);

  return (
    <nav className="md:hidden" style={{
      position:'fixed', bottom:0, left:0, right:0, zIndex:40,
      background:'var(--header-bg)', backdropFilter:'blur(20px)',
      borderTop:'1px solid var(--border)', display:'flex',
      padding:'6px 0 14px',
      fontFamily:'Inter, Plus Jakarta Sans, system-ui, sans-serif',
      transition:'background 0.35s',
    }}>
      {ITEMS.map(item => {
        const active = pathname === item.href;
        const count = item.countKey ? counts[item.countKey] : undefined;
        return (
          <Link key={item.href} href={item.href}
            style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
              gap:2, textDecoration:'none', position:'relative' }}>
            {active && (
              <div style={{ position:'absolute', top:-6, left:'50%', transform:'translateX(-50%)',
                width:22, height:2.5, borderRadius:2, background:item.color,
                boxShadow:`0 0 8px ${item.color}` }} />
            )}
            <div style={{ width:36, height:36, borderRadius:10, transition:'all 0.2s',
              background: active ? `${item.color}18` : 'transparent',
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow: active ? `0 0 14px ${item.color}30` : 'none',
              position:'relative' }}>
              <item.icon size={16} style={{ color: active ? item.color : 'var(--text3)' }} />
              {!!count && count > 0 && (
                <span style={{
                  position:'absolute', top:-4, right:-6,
                  background:'#ef4444', color:'#fff',
                  fontSize:9, fontWeight:700, lineHeight:1,
                  borderRadius:9, minWidth:16, height:16,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  padding:'0 3px', boxShadow:'0 0 0 2px var(--header-bg)'
                }}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
            </div>
            <span style={{ fontSize:9, color: active?item.color:'var(--text3)',
              fontWeight:active?700:400 }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}