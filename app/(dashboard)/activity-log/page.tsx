'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useTheme } from '@/lib/theme';
import {
  Activity, Search, RefreshCw, Filter, Download,
  LogIn, LogOut, Edit, Trash2, CreditCard, Eye,
  ChevronLeft, ChevronRight, Shield, Clock, User,
  FileText, CheckCircle, XCircle, AlertTriangle, FileDown,
  Settings, Moon, Sun,
} from 'lucide-react';

const font = 'Inter, Plus Jakarta Sans, system-ui, sans-serif';
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const GOLD = '#b8935f';
const PAGE_SIZE = 20;

type LogEntry = {
  id: number;
  admin_id: number;
  admin_name: string;
  action_type: string;
  module: string;
  target_id: string | null;
  target_name: string | null;
  details: string | null;
  created_at: string;
};

const ACTION_META: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  LOGIN:       { color:'#22c55e', bg:'rgba(34,197,94,0.1)',   icon:LogIn,      label:'Login'       },
  LOGOUT:      { color:'#ef4444', bg:'rgba(239,68,68,0.1)',   icon:LogOut,     label:'Logout'      },
  UPDATE:      { color:'#3b82f6', bg:'rgba(59,130,246,0.1)',  icon:Edit,       label:'Update'      },
  DELETE:      { color:'#ef4444', bg:'rgba(239,68,68,0.1)',   icon:Trash2,     label:'Delete'      },
  GENERATE_ID: { color:'#f97316', bg:'rgba(249,115,22,0.1)',  icon:CreditCard, label:'Generate ID' },
  VIEW:        { color:'#8b8fa8', bg:'rgba(139,143,168,0.1)', icon:Eye,        label:'View'        },
  CREATE:      { color:'#a855f7', bg:'rgba(168,85,247,0.1)',  icon:CheckCircle,label:'Create'      },
  EXPORT:      { color:'#14b8a6', bg:'rgba(20,184,166,0.1)',  icon:Download,   label:'Export'      },
};

function getActionMeta(type: string) {
  return ACTION_META[type] || { color:'#8b8fa8', bg:'rgba(139,143,168,0.1)', icon:Activity, label:type };
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-PH', {
    month:'short', day:'numeric', year:'numeric',
    hour:'2-digit', minute:'2-digit', second:'2-digit',
  });
}

// Uppercase display helper — used everywhere a detail VALUE is rendered
function up(v: string | null | undefined) {
  return (v ?? '—').toString().toUpperCase();
}

export default function ActivityLogPage() {
  const { theme, toggleTheme } = useTheme() as any;
  const { data: session } = useSession();
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [adminFilter, setAdminFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<LogEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/audit-logs');
      const d = await r.json();
      setLogs(Array.isArray(d) ? d : []);
    } catch { setLogs([]); }
    setLoading(false);
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);
  useEffect(() => {
    if (!autoRefresh) return;
    const i = setInterval(loadLogs, 10000);
    return () => clearInterval(i);
  }, [autoRefresh, loadLogs]);

  // Filtered logs
  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.admin_name.toLowerCase().includes(q)
      || (l.target_name||'').toLowerCase().includes(q)
      || (l.details||'').toLowerCase().includes(q)
      || l.module.toLowerCase().includes(q);
    const matchAction = !actionFilter || l.action_type === actionFilter;
    const matchModule = !moduleFilter || l.module === moduleFilter;
    const matchAdmin  = !adminFilter  || l.admin_name === adminFilter;
    return matchSearch && matchAction && matchModule && matchAdmin;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  // Unique values for filters
  const allActions = [...new Set(logs.map(l=>l.action_type))].sort();
  const allModules = [...new Set(logs.map(l=>l.module))].sort();
  const allAdmins  = [...new Set(logs.map(l=>l.admin_name))].sort();

  // Stats
  const todayLogs = logs.filter(l => {
    const d = new Date(l.created_at);
    const now = new Date();
    return d.getDate()===now.getDate() && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  });

  async function exportCSV() {
    const headers = ['ID','Admin','Action','Module','Target','Details','Date/Time'];
    const rows = filtered.map(l => [
      l.id, l.admin_name, l.action_type, l.module,
      l.target_name||'', (l.details||'').replace(/,/g,';'),
      formatDateTime(l.created_at)
    ]);
    const csv = [headers, ...rows].map(r=>r.join(',')).join('\n');
    const blob = new Blob([csv], { type:'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url;
    a.download=`SV8CNHS-ActivityLog-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  // Loads /SV8CLOGOBG.png from public/ and returns a base64 data URL + its natural aspect ratio
  async function loadLogoDataUrl(): Promise<{ dataUrl: string; ratio: number } | null> {
    try {
      const res = await fetch('/SV8CLOGOBG.png');
      const blob = await res.blob();
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const dims: { w: number; h: number } = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.width, h: img.height });
        img.onerror = reject;
        img.src = dataUrl;
      });
      return { dataUrl, ratio: dims.w / dims.h };
    } catch {
      return null;
    }
  }

  // ---------- FORMAL / LUXURY PDF EXPORT ----------
  async function exportPDF() {
    setExportingPdf(true);
    try {
      const [{ default: jsPDF }, autoTableModule, logo] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        loadLogoDataUrl(),
      ]);
      const autoTable = (autoTableModule as any).default || (autoTableModule as any);

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const marginX = 40;
      const GOLD_RGB: [number, number, number] = [184, 147, 95];
      const INK: [number, number, number] = [26, 28, 38];
      const MUTED: [number, number, number] = [110, 114, 132];

      // ---- Logo (top-left) ----
      const logoH = 40;
      let textStartX = marginX;
      if (logo) {
        const logoW = logoH * logo.ratio;
        doc.addImage(logo.dataUrl, 'PNG', marginX, 8, logoW, logoH);
        textStartX = marginX + logoW + 12;
      }

      // ---- Letterhead ----
      doc.setDrawColor(...GOLD_RGB);
      doc.setLineWidth(1.2);
      doc.line(marginX, 54, pageWidth - marginX, 54);

      doc.setFont('times', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(...INK);
      doc.text('SV8 CATANDUANES NATIONAL HIGH SCHOOL', textStartX, 26);

      doc.setFont('times', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(...MUTED);
      doc.text('OFFICE OF THE SYSTEM ADMINISTRATOR — CONFIDENTIAL AUDIT RECORD', textStartX, 40);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
      const generatedLine = `GENERATED: ${new Date().toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'medium' })}`;
      doc.text(generatedLine, pageWidth - marginX, 26, { align: 'right' });
      doc.text(`TOTAL RECORDS: ${filtered.length}`, pageWidth - marginX, 40, { align: 'right' });

      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(...INK);
      doc.text('SYSTEM ACTIVITY LOG REPORT', marginX, 74);

      // ---- Table ----
      const headers = ['ID', 'ADMINISTRATOR', 'ACTION', 'MODULE', 'TARGET', 'DETAILS', 'DATE / TIME'];
      const rows = filtered.map(l => ([
        String(l.id).toUpperCase(),
        up(l.admin_name),
        up(getActionMeta(l.action_type).label),
        up(l.module),
        up(l.target_name),
        up(l.details),
        formatDateTime(l.created_at).toUpperCase(),
      ]));

      autoTable(doc, {
        head: [headers],
        body: rows,
        startY: 88,
        margin: { left: marginX, right: marginX },
        styles: {
          font: 'helvetica',
          fontSize: 8,
          cellPadding: 6,
          textColor: INK,
          lineColor: [225, 220, 210],
          lineWidth: 0.5,
          overflow: 'linebreak',
        },
        headStyles: {
          fillColor: [26, 28, 38],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
        },
        alternateRowStyles: { fillColor: [250, 247, 242] },
        columnStyles: {
          0: { cellWidth: 36 },
          1: { cellWidth: 90 },
          2: { cellWidth: 70 },
          3: { cellWidth: 70 },
          4: { cellWidth: 90 },
          5: { cellWidth: 180 },
          6: { cellWidth: 110 },
        },
        didDrawPage: (data: any) => {
          // Footer
          const pageCount = doc.getNumberOfPages();
          const pageCurrent = doc.getCurrentPageInfo().pageNumber;
          doc.setDrawColor(...GOLD_RGB);
          doc.setLineWidth(0.8);
          doc.line(marginX, doc.internal.pageSize.getHeight() - 30,
                    pageWidth - marginX, doc.internal.pageSize.getHeight() - 30);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(...MUTED);
          doc.text('THIS DOCUMENT IS SYSTEM-GENERATED AND CONTAINS CONFIDENTIAL AUDIT DATA.',
            marginX, doc.internal.pageSize.getHeight() - 18);
          doc.text(`PAGE ${pageCurrent} OF ${pageCount}`,
            pageWidth - marginX, doc.internal.pageSize.getHeight() - 18, { align: 'right' });
        },
      });

      doc.save(`SV8CNHS-ActivityLog-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  }

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.3 }}
      style={{ fontFamily:font, minHeight:'100vh', background:'var(--bg)', transition:'background 0.35s' }}>

      {/* ── Custom header with logo + bigger title + right-side toolbar ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, padding:'20px 24px',
        borderBottom:'1px solid var(--border)', background:'var(--card)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <img src="/SV8CLOGOBG.png" alt="Logo"
            style={{ width:48, height:48, objectFit:'contain', flexShrink:0 }} />
          <div>
            <h1 style={{ fontSize:24, fontWeight:900, letterSpacing:'0.03em',
              textTransform:'uppercase', color:'var(--text)', margin:0, lineHeight:1.1 }}>
              Activity Log
            </h1>
            <p style={{ fontSize:14, color:'var(--text2)', marginTop:4, fontWeight:500 }}>
              Full audit trail of all admin actions in the system
            </p>
          </div>
        </div>

        {/* Right-side toolbar: logout · settings · theme toggle · avatar */}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <button onClick={() => setLogoutConfirm(true)} title="Log out"
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

      <div style={{ padding:24 }}>

        {/* Stats row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:24 }}>
          {[
            { label:'Total Logs',   value:logs.length,                     color:'#f97316', icon:Activity },
            { label:"Today's Logs", value:todayLogs.length,                color:'#4f6ef7', icon:Clock },
            { label:'ID Generated', value:logs.filter(l=>l.action_type==='GENERATE_ID').length, color:'#14b8a6', icon:CreditCard },
            { label:'Deletions',    value:logs.filter(l=>l.action_type==='DELETE').length,     color:'#ef4444', icon:Trash2 },
          ].map((s,i) => (
            <motion.div key={s.label} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
              transition={{ delay:i*0.05 }}
              style={{ padding:'16px 18px', borderRadius:14, background:'var(--card)',
                border:'1px solid var(--border)', backdropFilter:'blur(12px)', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-8, right:-8, width:56, height:56, borderRadius:'50%',
                pointerEvents:'none', background:`radial-gradient(circle,${s.color}25 0%,transparent 70%)` }}/>
              <div style={{ width:32, height:32, borderRadius:9, marginBottom:10,
                background:`linear-gradient(135deg,${s.color},${s.color}BB)`,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:`0 4px 14px ${s.color}40` }}>
                <s.icon size={15} style={{ color:'#fff' }}/>
              </div>
              <p style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:3 }}>{s.label}</p>
              {loading
                ? <div className="skeleton" style={{ height:24, width:40, borderRadius:6 }}/>
                : <p style={{ fontSize:24, fontWeight:900, color:'var(--text)', lineHeight:1 }}>{s.value.toLocaleString()}</p>
              }
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          {/* Search */}
          <div style={{ position:'relative', flex:1, minWidth:200 }}>
            <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }}/>
            <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }}
              placeholder="Search admin, module, target, details…"
              style={{ width:'100%', padding:'10px 12px 10px 34px', background:'var(--card)',
                color:'var(--text)', border:'1px solid var(--border)', borderRadius:10,
                fontSize:13, outline:'none', fontFamily:'inherit' }}/>
          </div>

          {/* Filters */}
          {[
            { label:'Action', value:actionFilter, setter:setActionFilter, options:allActions },
            { label:'Module', value:moduleFilter, setter:setModuleFilter, options:allModules },
            { label:'Admin',  value:adminFilter,  setter:setAdminFilter,  options:allAdmins  },
          ].map(f => (
            <select key={f.label} value={f.value} onChange={e=>{ f.setter(e.target.value); setPage(1); }}
              style={{ padding:'10px 12px', background:'var(--card)', color:'var(--text)',
                border:'1px solid var(--border)', borderRadius:10, fontSize:12, outline:'none',
                cursor:'pointer', fontFamily:'inherit' }}>
              <option value="">All {f.label}s</option>
              {f.options.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
          ))}

          {/* Auto-refresh toggle */}
          <button onClick={()=>setAutoRefresh(a=>!a)}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 14px', borderRadius:10,
              background: autoRefresh ? 'rgba(34,197,94,0.1)' : 'var(--card)',
              border: autoRefresh ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border)',
              color: autoRefresh ? '#22c55e' : 'var(--text2)', cursor:'pointer', fontSize:12, fontWeight:700 }}>
            <RefreshCw size={13} style={{ animation: autoRefresh ? 'spin 2s linear infinite' : 'none' }}/>
            {autoRefresh ? 'Live' : 'Auto'}
          </button>

          {/* Manual refresh */}
          <button onClick={loadLogs}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 14px', borderRadius:10,
              background:'var(--card)', border:'1px solid var(--border)',
              color:'var(--text2)', cursor:'pointer', fontSize:12, fontWeight:600 }}>
            <RefreshCw size={13}/>
          </button>

          {/* CSV Export */}
          <button onClick={exportCSV}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 14px', borderRadius:10,
              background:'rgba(79,110,247,0.1)', border:'1px solid rgba(79,110,247,0.25)',
              color:'#4f6ef7', cursor:'pointer', fontSize:12, fontWeight:700 }}>
            <Download size={13}/> Export CSV
          </button>

          {/* PDF Export — luxury formal report */}
          <button onClick={exportPDF} disabled={exportingPdf}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 16px', borderRadius:10,
              background: `linear-gradient(135deg, ${GOLD}, #8f7048)`,
              border: '1px solid rgba(184,147,95,0.5)',
              color:'#fff', cursor: exportingPdf ? 'not-allowed' : 'pointer', fontSize:12, fontWeight:700,
              letterSpacing:'0.03em', boxShadow:'0 4px 14px rgba(184,147,95,0.35)',
              opacity: exportingPdf ? 0.7 : 1 }}>
            <FileDown size={13}/> {exportingPdf ? 'Preparing…' : 'Export PDF Report'}
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap:20 }}>
          {/* Log table */}
          <div style={{ borderRadius:18, border:'1px solid var(--border)', background:'var(--card)',
            backdropFilter:'blur(12px)', overflow:'hidden' }}>
            {loading ? (
              <div style={{ padding:20, display:'flex', flexDirection:'column', gap:8 }}>
                {[1,2,3,4,5,6].map(i=><div key={i} className="skeleton" style={{ height:52, borderRadius:10 }}/>)}
              </div>
            ) : paginated.length === 0 ? (
              <div style={{ padding:60, textAlign:'center' }}>
                <Activity size={40} style={{ color:'var(--text3)', margin:'0 auto 14px', display:'block' }}/>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.04em' }}>No Log Entries</p>
                <p style={{ fontSize:13, color:'var(--text2)' }}>
                  {search||actionFilter||moduleFilter||adminFilter ? 'No logs match your filters.' : 'Admin actions will appear here.'}
                </p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div style={{ display:'grid', gridTemplateColumns:'auto 1fr auto auto auto', gap:12,
                  padding:'10px 16px', borderBottom:`1px solid ${GOLD}55`, background:'var(--bg2)' }}>
                  {['Action','Admin / Target','Module','Time',''].map(h=>(
                    <p key={h} style={{ fontSize:10, fontWeight:800, color:'var(--text3)',
                      textTransform:'uppercase', letterSpacing:'0.09em' }}>{h}</p>
                  ))}
                </div>

                {paginated.map((l, i) => {
                  const meta = getActionMeta(l.action_type);
                  const isSelected = selected?.id === l.id;
                  return (
                    <motion.div key={l.id} initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }}
                      transition={{ delay:i*0.025 }}
                      onClick={() => setSelected(isSelected ? null : l)}
                      style={{ display:'grid', gridTemplateColumns:'auto 1fr auto auto auto', gap:12,
                        padding:'12px 16px', borderBottom:'1px solid var(--border)', cursor:'pointer',
                        background: isSelected ? 'rgba(184,147,95,0.08)' : 'transparent',
                        borderLeft: isSelected ? `3px solid ${GOLD}` : '3px solid transparent',
                        transition:'all 0.15s', alignItems:'center' }}
                      onMouseEnter={e=>(e.currentTarget.style.background=isSelected?'rgba(184,147,95,0.08)':'var(--bg2)')}
                      onMouseLeave={e=>(e.currentTarget.style.background=isSelected?'rgba(184,147,95,0.08)':'transparent')}>

                      {/* Action badge */}
                      <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                        <div style={{ width:30, height:30, borderRadius:8, flexShrink:0,
                          background:meta.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
                          <meta.icon size={13} style={{ color:meta.color }}/>
                        </div>
                        <span style={{ fontSize:11, fontWeight:700, color:meta.color, whiteSpace:'nowrap', textTransform:'uppercase', letterSpacing:'0.02em' }}>{meta.label}</span>
                      </div>

                      {/* Admin + target */}
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', textTransform:'uppercase',
                          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {up(l.admin_name)}
                        </p>
                        {l.target_name && (
                          <p style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase',
                            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            → {up(l.target_name)}
                          </p>
                        )}
                      </div>

                      {/* Module */}
                      <span style={{ padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700,
                        background:'var(--input-bg)', color:'var(--text2)', whiteSpace:'nowrap',
                        border:'1px solid var(--border2)', textTransform:'uppercase', letterSpacing:'0.03em' }}>
                        {up(l.module)}
                      </span>

                      {/* Time */}
                      <p style={{ fontSize:10, color:'var(--text3)', fontFamily:'monospace', whiteSpace:'nowrap' }}>
                        {timeAgo(l.created_at).toUpperCase()}
                      </p>

                      {/* View indicator */}
                      <Eye size={13} style={{ color:'var(--text3)' }}/>
                    </motion.div>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                    padding:'12px 16px', borderTop:'1px solid var(--border)' }}>
                    <p style={{ fontSize:12, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.03em' }}>
                      {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length.toLocaleString()} entries
                    </p>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                        style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border2)',
                          background:'var(--input-bg)', cursor:page===1?'not-allowed':'pointer',
                          color:'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center',
                          opacity:page===1?0.4:1 }}>
                        <ChevronLeft size={14}/>
                      </button>
                      {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                        const p = Math.max(1,Math.min(page-2,totalPages-4))+i;
                        return (
                          <button key={p} onClick={()=>setPage(p)}
                            style={{ width:30, height:30, borderRadius:8, fontSize:12, fontWeight:700,
                              border:p===page?`1.5px solid ${GOLD}`:'1px solid var(--border2)',
                              background:p===page?'rgba(184,147,95,0.14)':'var(--input-bg)',
                              color:p===page?GOLD:'var(--text2)', cursor:'pointer' }}>{p}</button>
                        );
                      })}
                      <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                        style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border2)',
                          background:'var(--input-bg)', cursor:page===totalPages?'not-allowed':'pointer',
                          color:'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center',
                          opacity:page===totalPages?0.4:1 }}>
                        <ChevronRight size={14}/>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Detail panel — formal document card */}
          <AnimatePresence>
            {selected && (
              <motion.div initial={{ opacity:0, x:24 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:24 }}
                style={{ borderRadius:18, border:`1px solid ${GOLD}55`, background:'var(--card)',
                  backdropFilter:'blur(16px)', overflow:'hidden', height:'fit-content', position:'sticky', top:80,
                  boxShadow:'0 8px 30px rgba(184,147,95,0.12)' }}>
                {(() => {
                  const meta = getActionMeta(selected.action_type);
                  return (
                    <>
                      <div style={{ padding:'16px 18px', borderBottom:`1px solid ${GOLD}55`,
                        display:'flex', alignItems:'center', justifyContent:'space-between',
                        background:`linear-gradient(135deg, rgba(184,147,95,0.1), transparent)` }}>
                        <div>
                          <p style={{ fontSize:9, color:GOLD, fontWeight:800, letterSpacing:'0.14em', marginBottom:2 }}>
                            OFFICIAL RECORD
                          </p>
                          <p style={{ fontSize:14, fontWeight:800, color:'var(--text)', fontFamily:SERIF, letterSpacing:'0.02em' }}>
                            LOG ENTRY №{String(selected.id).padStart(5,'0')}
                          </p>
                        </div>
                        <button onClick={()=>setSelected(null)}
                          style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--border2)',
                            background:'var(--input-bg)', cursor:'pointer', color:'var(--text2)',
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>×</button>
                      </div>
                      <div style={{ padding:18, display:'flex', flexDirection:'column', gap:0 }}>
                        {/* Action */}
                        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0',
                          borderBottom:'1px solid var(--border)' }}>
                          <div style={{ width:44, height:44, borderRadius:12, background:meta.bg,
                            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <meta.icon size={20} style={{ color:meta.color }}/>
                          </div>
                          <div>
                            <p style={{ fontSize:15, fontWeight:800, color:meta.color, textTransform:'uppercase', letterSpacing:'0.03em' }}>{meta.label}</p>
                            <p style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.03em' }}>ACTION TYPE: {up(selected.action_type)}</p>
                          </div>
                        </div>
                        {[
                          { icon:User,     label:'Admin',    val:up(selected.admin_name) },
                          { icon:Shield,   label:'Module',   val:up(selected.module) },
                          { icon:FileText, label:'Target',   val:up(selected.target_name) },
                          { icon:Activity, label:'Details',  val:up(selected.details) },
                          { icon:Clock,    label:'Time',     val:formatDateTime(selected.created_at).toUpperCase() },
                        ].map(({icon:Icon,label,val}) => (
                          <div key={label} style={{ display:'flex', gap:10, padding:'10px 0',
                            borderBottom:'1px solid var(--border)', alignItems:'flex-start' }}>
                            <Icon size={13} style={{ color:GOLD, flexShrink:0, marginTop:2 }}/>
                            <div>
                              <p style={{ fontSize:10, color:'var(--text3)', fontWeight:700,
                                textTransform:'uppercase', letterSpacing:'0.1em' }}>{label.toUpperCase()}</p>
                              <p style={{ fontSize:12, color:'var(--text)', wordBreak:'break-word', lineHeight:1.5,
                                textTransform:'uppercase', letterSpacing:'0.01em', fontWeight:600 }}>{val}</p>
                            </div>
                          </div>
                        ))}
                        <p style={{ fontSize:9, color:'var(--text3)', textAlign:'center', marginTop:14,
                          letterSpacing:'0.1em', textTransform:'uppercase' }}>
                          — End Of Record —
                        </p>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Logout confirmation modal */}
      <AnimatePresence>
        {logoutConfirm && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setLogoutConfirm(false)}
            style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <motion.div initial={{ opacity:0, scale:0.9, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.9 }}
              transition={{ type:'spring', stiffness:300, damping:25 }}
              onClick={e => e.stopPropagation()}
              style={{ background:'var(--card)', borderRadius:20, padding:32, maxWidth:340, width:'100%', textAlign:'center', border:'1px solid rgba(239,68,68,0.25)', boxShadow:'0 40px 100px rgba(0,0,0,0.6)' }}>
              <div style={{ width:56, height:56, borderRadius:'50%', margin:'0 auto 16px', background:'rgba(239,68,68,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <LogOut size={24} style={{ color:'#ef4444' }} />
              </div>
              <p style={{ fontSize:15, fontWeight:800, color:'var(--text)', marginBottom:8 }}>Log Out</p>
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, marginBottom:22 }}>
                Are you sure you want to log out?
              </p>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setLogoutConfirm(false)}
                  style={{ flex:1, padding:'12px', border:'1px solid var(--border2)', borderRadius:12, background:'var(--input-bg)', color:'var(--text)', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                  Cancel
                </button>
                <button onClick={() => { setLogoutConfirm(false); signOut(); }}
                  style={{ flex:1, padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                  Log Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }`}</style>
    </motion.div>
  );
}