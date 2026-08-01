'use client';
import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { useTheme } from '@/lib/theme';
import {
  GraduationCap, Search, Check, X, User, Eye,
  ChevronLeft, ChevronRight, Trash2, Phone, MapPin, Mail, BookOpen,
  ArrowUpDown, ArrowUp, ArrowDown, Plus, ChevronDown, AlertCircle,
  LogOut, Settings, Moon, Sun
} from 'lucide-react';

const font = 'Inter, Plus Jakarta Sans, system-ui, sans-serif';
const PAGE_SIZE = 15;
type FilterTab = 'pending'|'approved'|'rejected';
type SortDir = 'none'|'asc'|'desc';

function StatusPill({ status }: { status:string }) {
  const m: Record<string,any> = {
    approved:{ bg:'rgba(34,197,94,0.12)',  color:'#22c55e' },
    rejected:{ bg:'rgba(239,68,68,0.12)',  color:'#ef4444' },
    pending: { bg:'rgba(249,115,22,0.12)', color:'#f97316' },
  };
  const s = m[status]||m.pending;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px',
      borderRadius:20, fontSize:11, fontWeight:700, background:s.bg, color:s.color,
      textTransform:'uppercase', letterSpacing:'0.05em' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:s.color }}/>
      {status}
    </span>
  );
}

// ── Fields the reviewer can flag as the reason for rejection ──────────
const REJECTION_FIELDS: { key:string; label:string; suggestions:string[] }[] = [
  { key:'photo',        label:'ID Photo',        suggestions:['gamitin ang picture na sinend ko sa GC natin'] },
  { key:'name',         label:'Full Name',       suggestions:['Name has a typo','Name doesn\'t match records','Missing middle initial'] },
  { key:'grade_section',label:'Grade & Section', suggestions:['Wrong section selected','Wrong grade level'] },
  { key:'contact',      label:'Contact Number',  suggestions:['Number is invalid','Number is unreachable'] },
  { key:'guardian',     label:'Guardian Info',   suggestions:['Guardian name incomplete','Wrong relation selected'] },
  { key:'address',      label:'Address',         suggestions:['Address is incomplete','Not in uppercase / hard to read'] },
  { key:'other',        label:'Other',           suggestions:[] },
];

type RejectIssue = { id:string; field:string; note:string };

export default function StudentSubmitPage() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme() as any;
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState<FilterTab>('pending');
  const [gradeFilter, setGradeFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState('');
  const [editFields, setEditFields] = useState<{lrn:string}|null>(null);
  const [fieldSaving, setFieldSaving] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [nameSort, setNameSort] = useState<SortDir>('none');
  const [sectionSort, setSectionSort] = useState<SortDir>('none');

  const [approveTarget, setApproveTarget] = useState<any>(null);
  const [approveLrn, setApproveLrn] = useState('');
  const [approveLrnConfirm, setApproveLrnConfirm] = useState('');
  const [approveError, setApproveError] = useState('');
  const [approveSaving, setApproveSaving] = useState(false);

  // ── Reject-with-reason modal state ─────────────────────────────────
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectIssues, setRejectIssues] = useState<RejectIssue[]>([]);
  const [newIssueField, setNewIssueField] = useState(REJECTION_FIELDS[0].key);
  const [newIssueNote, setNewIssueNote] = useState('');
  const [generalNote, setGeneralNote] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);

  async function saveAdminFields(id: number) {
    if (!editFields) return;
    setFieldSaving(true); setFieldError('');
    const r = await fetch('/api/students/admin-fields', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id, lrn: editFields.lrn })
    });
    const d = await r.json();
    if (!r.ok) { setFieldError(d.error||'Failed'); setFieldSaving(false); return; }
    await load();
    setSelected((prev:any) => prev?.id===id ? {...prev, lrn:editFields.lrn} : prev);
    setEditFields(null); setFieldSaving(false);
  }
  const [sections, setSections] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/students');
    const d = await r.json();
    setStudents(Array.isArray(d)?d:[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch('/api/sections').then(r=>r.json()).then(d=>{
      const all: any[] = [];
      Object.values(d).forEach((arr:any)=>all.push(...arr));
      setSections(all);
    });
  }, []);

  async function updateStatus(id:number, status:string) {
    setActionLoading(`${id}-${status}`);
    await fetch(`/api/students/${id}`,{ method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status}) });
    await load();
    setSelected((prev:any)=>prev?.id===id?{...prev,status}:prev);
    setActionLoading('');
  }

  async function saveLrnAndApprove(id:number, lrn:string) {
    const r = await fetch('/api/students/admin-fields', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id, lrn })
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Failed to save LRN');
    await updateStatus(id, 'approved');
  }

  function handleApproveClick(s:any) {
    if (s.lrn && String(s.lrn).trim().length > 0) {
      updateStatus(s.id, 'approved');
      return;
    }
    setApproveTarget(s);
    setApproveLrn('');
    setApproveLrnConfirm('');
    setApproveError('');
  }

  async function confirmApproveWithLrn() {
    if (!approveTarget) return;
    const lrn = approveLrn.trim();
    const lrn2 = approveLrnConfirm.trim();
    if (!lrn || lrn.length < 6) { setApproveError('Enter a valid LRN (numbers only).'); return; }
    if (lrn !== lrn2) { setApproveError('LRN entries do not match.'); return; }
    setApproveSaving(true); setApproveError('');
    try {
      await saveLrnAndApprove(approveTarget.id, lrn);
      setSelected((prev:any)=>prev?.id===approveTarget.id ? {...prev, lrn, status:'approved'} : prev);
      setApproveTarget(null); setApproveLrn(''); setApproveLrnConfirm('');
    } catch (e:any) {
      setApproveError(e.message || 'Something went wrong.');
    } finally {
      setApproveSaving(false);
    }
  }

  // ── Reject flow ───────────────────────────────────────────────────
  function handleRejectClick(s:any) {
    setRejectTarget(s);
    setRejectIssues([]);
    setNewIssueField(REJECTION_FIELDS[0].key);
    setNewIssueNote('');
    setGeneralNote('');
    setRejectError('');
  }

  function addIssue() {
    const note = newIssueNote.trim();
    if (!note) { setRejectError('Write a note for this field before adding it.'); return; }
    setRejectIssues(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, field: newIssueField, note }]);
    setNewIssueNote('');
    setRejectError('');
  }

  function removeIssue(id:string) {
    setRejectIssues(prev => prev.filter(i => i.id !== id));
  }

  function buildRejectReason() {
    const lines = rejectIssues.map(issue => {
      const label = REJECTION_FIELDS.find(f => f.key === issue.field)?.label || issue.field;
      return `• ${label}: ${issue.note}`;
    });
    const parts = [...lines];
    if (generalNote.trim()) parts.push(`Note: ${generalNote.trim()}`);
    return parts.join('\n');
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const reason = buildRejectReason();
    if (!reason.trim()) { setRejectError('Add at least one issue so the student knows what to fix.'); return; }
    setRejectSaving(true); setRejectError('');
    try {
      const r = await fetch(`/api/students/${rejectTarget.id}`, {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ status:'rejected', rejection_reason: reason })
      });
      if (!r.ok) {
        const d = await r.json().catch(()=>({}));
        throw new Error(d.error || 'Failed to reject.');
      }
      await load();
      setSelected((prev:any)=>prev?.id===rejectTarget.id ? {...prev, status:'rejected', rejection_reason:reason} : prev);
      setRejectTarget(null); setRejectIssues([]); setGeneralNote('');
    } catch (e:any) {
      setRejectError(e.message || 'Something went wrong.');
    } finally {
      setRejectSaving(false);
    }
  }

  async function deleteStudent(id:number) {
    if (!confirm('Delete this student record? This cannot be undone.')) return;
    await fetch(`/api/students/${id}`,{ method:'DELETE' });
    setSelected(null); load();
  }

  function cycleNameSort() {
    setNameSort(prev => prev==='none' ? 'asc' : prev==='asc' ? 'desc' : 'none');
    setSectionSort('none');
    setPage(1);
  }
  function cycleSectionSort() {
    setSectionSort(prev => prev==='none' ? 'asc' : prev==='asc' ? 'desc' : 'none');
    setNameSort('none');
    setPage(1);
  }

  let filtered = students
    .filter(s=>s.status===filter)
    .filter(s=>!gradeFilter||String(s.grade_level)===gradeFilter)
    .filter(s=>!sectionFilter||s.section_name===sectionFilter)
    .filter(s=>!search||
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase())||
      s.student_number?.toLowerCase().includes(search.toLowerCase())||
      s.lrn?.includes(search)||s.email?.toLowerCase().includes(search.toLowerCase()));

  if (nameSort !== 'none') {
    filtered = [...filtered].sort((a,b)=>{
      const an = `${a.last_name||''} ${a.first_name||''}`.trim().toLowerCase();
      const bn = `${b.last_name||''} ${b.first_name||''}`.trim().toLowerCase();
      return nameSort==='asc' ? an.localeCompare(bn) : bn.localeCompare(an);
    });
  } else if (sectionSort !== 'none') {
    filtered = [...filtered].sort((a,b)=>{
      const ag = Number(a.grade_level)||0, bg = Number(b.grade_level)||0;
      if (ag !== bg) return sectionSort==='asc' ? ag-bg : bg-ag;
      const asec = (a.section_name||'').toLowerCase();
      const bsec = (b.section_name||'').toLowerCase();
      if (asec !== bsec) return sectionSort==='asc' ? asec.localeCompare(bsec) : bsec.localeCompare(asec);
      const an = `${a.last_name||''} ${a.first_name||''}`.trim().toLowerCase();
      const bn = `${b.last_name||''} ${b.first_name||''}`.trim().toLowerCase();
      return an.localeCompare(bn);
    });
  }

  const totalPages = Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const counts = {
    pending:students.filter(s=>s.status==='pending').length,
    approved:students.filter(s=>s.status==='approved').length,
    rejected:students.filter(s=>s.status==='rejected').length,
  };
  const tabColors: Record<FilterTab,string> = { pending:'#f59e0b', approved:'#22c55e', rejected:'#ef4444' };

  const NameSortIcon = nameSort==='asc' ? ArrowUp : nameSort==='desc' ? ArrowDown : ArrowUpDown;
  const SectionSortIcon = sectionSort==='asc' ? ArrowUp : sectionSort==='desc' ? ArrowDown : ArrowUpDown;

  const sectionFilterOptions = gradeFilter
    ? sections.filter(s=>String(s.grade_level)===gradeFilter)
    : sections;

  const currentFieldConfig = REJECTION_FIELDS.find(f => f.key === newIssueField)!;
  const rejectPreview = buildRejectReason();

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.3 }}
      style={{ fontFamily:font, minHeight:'100vh', background:'var(--bg)', transition:'background 0.35s' }}>

      {/* ── Custom header with logo + bigger, uppercase title + right-side toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '20px 24px',
        borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/SV8CLOGOBG.png" alt="Logo"
            style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '0.03em',
              textTransform: 'uppercase', color: 'var(--text)', margin: 0, lineHeight: 1.1 }}>
              Student Submissions
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 4, fontWeight: 500 }}>
              Review and approve student registrations
            </p>
          </div>
        </div>

        {/* Right-side toolbar: logout · settings · theme toggle · avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={() => signOut()} title="Log out"
            style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)',
              background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={16} />
          </button>

          <Link href="/settings" style={{ textDecoration: 'none' }}>
            <button title="Settings"
              style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border2)',
                background: 'var(--input-bg)', color: 'var(--text2)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={16} />
            </button>
          </Link>

          <button onClick={() => toggleTheme?.()} title="Toggle theme"
            style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border2)',
              background: 'var(--input-bg)', color: 'var(--text2)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <div title={session?.user?.name || 'Admin'}
            style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#f97316,#ef4444)',
              color: '#fff', fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, textTransform: 'uppercase' }}>
            {(session?.user?.name || 'A').charAt(0)}
          </div>
        </div>
      </div>

      <div style={{ padding:24 }}>
        {/* Filters row */}
        <div style={{ display:'flex', gap:8, marginBottom:20, alignItems:'center' }}>

          {/* LEFT: grade / section / sort controls */}
          <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
            <select value={gradeFilter}
              onChange={e=>{ setGradeFilter(e.target.value); setSectionFilter(''); setPage(1); }}
              style={{ padding:'8px 14px', borderRadius:10, fontSize:12, fontWeight:700,
                background:'var(--card)', border:'1px solid var(--border)', color:'var(--text2)',
                cursor:'pointer', outline:'none', fontFamily:'inherit', textTransform:'uppercase', letterSpacing:'0.05em' }}>
              <option value="">ALL GRADES</option>
              {[7,8,9,10].map(g=><option key={g} value={g}>GRADE {g}</option>)}
            </select>

            <select value={sectionFilter}
              onChange={e=>{ setSectionFilter(e.target.value); setPage(1); }}
              style={{ padding:'8px 14px', borderRadius:10, fontSize:12, fontWeight:700,
                background: sectionFilter ? 'rgba(168,85,247,0.12)' : 'var(--card)',
                border: sectionFilter ? '1.5px solid rgba(168,85,247,0.5)' : '1px solid var(--border)',
                color: sectionFilter ? '#a855f7' : 'var(--text2)',
                cursor:'pointer', outline:'none', fontFamily:'inherit', textTransform:'uppercase', letterSpacing:'0.05em' }}>
              <option value="">ALL SECTIONS</option>
              {sectionFilterOptions.map(s=>(
                <option key={s.id} value={s.name}>
                  {gradeFilter ? s.name : `G${s.grade_level} – ${s.name}`}
                </option>
              ))}
            </select>

            <button onClick={cycleNameSort}
              style={{ padding:'8px 14px', borderRadius:10, fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6,
                background: nameSort!=='none' ? 'rgba(79,110,247,0.12)' : 'var(--card)',
                border: nameSort!=='none' ? '1.5px solid rgba(79,110,247,0.5)' : '1px solid var(--border)',
                color: nameSort!=='none' ? '#4f6ef7' : 'var(--text2)', cursor:'pointer',
                textTransform:'uppercase', letterSpacing:'0.05em' }}>
              <NameSortIcon size={13}/>
              {nameSort==='asc' ? 'NAME A–Z' : nameSort==='desc' ? 'NAME Z–A' : 'SORT BY NAME'}
            </button>

            <button onClick={cycleSectionSort}
              style={{ padding:'8px 14px', borderRadius:10, fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6,
                background: sectionSort!=='none' ? 'rgba(168,85,247,0.12)' : 'var(--card)',
                border: sectionSort!=='none' ? '1.5px solid rgba(168,85,247,0.5)' : '1px solid var(--border)',
                color: sectionSort!=='none' ? '#a855f7' : 'var(--text2)', cursor:'pointer',
                textTransform:'uppercase', letterSpacing:'0.05em' }}>
              <SectionSortIcon size={13}/>
              {sectionSort==='asc' ? 'GRADE & SECTION ↑' : sectionSort==='desc' ? 'GRADE & SECTION ↓' : 'GROUP BY SECTION'}
            </button>
          </div>

          {/* CENTER: status tabs */}
          <div style={{ flex:1, display:'flex', justifyContent:'center', gap:6 }}>
            {(['pending','approved','rejected'] as FilterTab[]).map(t=>{
              const active=filter===t, color=tabColors[t];
              return (
                <motion.button key={t} whileTap={{ scale:0.96 }} onClick={()=>{ setFilter(t); setPage(1); }}
                  style={{ padding:'8px 14px', borderRadius:10, fontSize:12, fontWeight:700,
                    background:active?`${color}18`:'var(--card)', border:active?`1.5px solid ${color}50`:'1px solid var(--border)',
                    color:active?color:'var(--text2)', cursor:'pointer', transition:'all 0.2s',
                    boxShadow:active?`0 0 16px ${color}20`:'none',
                    textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  {t} <span style={{ opacity:0.7 }}>({counts[t]})</span>
                </motion.button>
              );
            })}
          </div>

          {/* RIGHT: search */}
          <div style={{ position:'relative', minWidth:220, flexShrink:0 }}>
            <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }} />
            <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }}
              placeholder="Name, ID, LRN, email…"
              style={{ width:'100%', padding:'10px 14px 10px 34px', background:'var(--input-bg)',
                color:'var(--text)', border:'1px solid var(--border2)', borderRadius:10, fontSize:13, outline:'none', fontFamily:'inherit' }} />
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:selected?'1fr 380px':'1fr', gap:20 }}>
          {/* Table — Student No., LRN, and Guardian columns removed */}
          <div style={{ borderRadius:18, overflow:'hidden', border:'1px solid var(--border)', background:'var(--card)', backdropFilter:'blur(12px)' }}>
            {loading ? (
              <div style={{ padding:20, display:'flex', flexDirection:'column', gap:10 }}>
                {[1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{ height:52, borderRadius:10 }}/>)}
              </div>
            ) : paginated.length===0 ? (
              <div style={{ padding:60, textAlign:'center' }}>
                <GraduationCap size={40} style={{ color:'var(--text3)', margin:'0 auto 14px', display:'block' }} />
                <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:6 }}>No students found</p>
                <p style={{ fontSize:13, color:'var(--text2)' }}>No {filter} students{search?` matching "${search}"`:''}</p>
              </div>
            ) : (
              <>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--border)' }}>
                      {['Student','Grade & Section','Status','Actions'].map(h=>{
                        const clickable = h==='Student' || h==='Grade & Section';
                        const onClickHandler = h==='Student' ? cycleNameSort : h==='Grade & Section' ? cycleSectionSort : undefined;
                        const ActiveIcon = h==='Student' ? NameSortIcon : SectionSortIcon;
                        const isActive = h==='Student' ? nameSort!=='none' : h==='Grade & Section' ? sectionSort!=='none' : false;
                        const rightAlign = h==='Status' || h==='Actions';
                        return (
                          <th key={h} onClick={onClickHandler}
                            style={{ padding: rightAlign ? '12px 20px' : '12px 14px',
                            textAlign: rightAlign ? 'right' : 'left', fontSize:10, fontWeight:800,
                            color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em',
                            whiteSpace:'nowrap', background:'var(--bg2)',
                            cursor: clickable ? 'pointer' : 'default',
                            userSelect: clickable ? 'none' : 'auto' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4, justifyContent: rightAlign ? 'flex-end' : 'flex-start' }}>
                              {h}
                              {clickable && <ActiveIcon size={11} style={{ color: isActive ? (h==='Student' ? '#4f6ef7' : '#a855f7') : 'var(--text3)' }}/>}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(s=>(
                      <tr key={s.id} style={{ borderBottom:'1px solid var(--border)', cursor:'pointer', transition:'background 0.15s' }}
                        onClick={()=>{ setSelected(s); setEditFields(null); setFieldError(''); }}
                        onMouseEnter={e=>(e.currentTarget.style.background='var(--bg2)')}
                        onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                        <td style={{ padding:'12px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            {s.photo_path
                              ? <img src={s.photo_path} style={{ width:36, height:36, borderRadius:9, objectFit:'cover', flexShrink:0, border:'1.5px solid rgba(79,110,247,0.3)' }} alt=""/>
                              : <div style={{ width:36, height:36, borderRadius:9, flexShrink:0, background:'rgba(79,110,247,0.1)', border:'1px solid rgba(79,110,247,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}><User size={16} style={{ color:'#4f6ef7' }}/></div>}
                            <div>
                              <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', textTransform:'uppercase' }}>
                                {s.first_name&&s.last_name ? `${s.first_name} ${s.last_name}` : <span style={{color:'var(--text3)',fontStyle:'italic',textTransform:'none'}}>Not filled</span>}
                              </p>
                              <p style={{ fontSize:10, color:'var(--text3)', fontFamily:'monospace' }}>{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:'12px 14px' }}>
                          {s.grade_level
                            ? <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, background:'rgba(79,110,247,0.1)', color:'#4f6ef7', fontWeight:600, textTransform:'uppercase' }}>G{s.grade_level}{s.section_name?` – ${s.section_name}`:''}</span>
                            : <span style={{color:'var(--text3)',fontSize:12}}>—</span>}
                        </td>
                        <td style={{ padding:'12px 20px', textAlign:'right' }}><StatusPill status={s.status}/></td>
                        <td style={{ padding:'12px 20px' }}>
                          <div style={{ display:'flex', gap:6, justifyContent:'flex-end' }} onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>{ setSelected(s); setEditFields(null); setFieldError(''); }} style={{ width:30, height:30, borderRadius:8, border:'1px solid rgba(79,110,247,0.2)', background:'rgba(79,110,247,0.08)', cursor:'pointer', color:'#4f6ef7', display:'flex', alignItems:'center', justifyContent:'center' }}><Eye size={13}/></button>
                            {s.status!=='approved' && <button onClick={()=>handleApproveClick(s)} disabled={!!actionLoading} style={{ width:30, height:30, borderRadius:8, border:'1px solid rgba(34,197,94,0.2)', background:'rgba(34,197,94,0.08)', cursor:'pointer', color:'#22c55e', display:'flex', alignItems:'center', justifyContent:'center', opacity:actionLoading?0.5:1 }}><Check size={13}/></button>}
                            {s.status==='pending' && <button onClick={()=>handleRejectClick(s)} disabled={!!actionLoading} style={{ width:30, height:30, borderRadius:8, border:'1px solid rgba(239,68,68,0.2)', background:'rgba(239,68,68,0.08)', cursor:'pointer', color:'#ef4444', display:'flex', alignItems:'center', justifyContent:'center', opacity:actionLoading?0.5:1 }}><X size={13}/></button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {totalPages>1 && (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:'1px solid var(--border)' }}>
                    <p style={{ fontSize:12, color:'var(--text3)' }}>Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length}</p>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{ width:30,height:30,borderRadius:8,border:'1px solid var(--border2)',background:'var(--input-bg)',cursor:page===1?'not-allowed':'pointer',color:'var(--text2)',display:'flex',alignItems:'center',justifyContent:'center',opacity:page===1?0.4:1 }}><ChevronLeft size={14}/></button>
                      {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>Math.abs(p-page)<=2).map(p=>(
                        <button key={p} onClick={()=>setPage(p)} style={{ width:30,height:30,borderRadius:8,fontSize:12,fontWeight:700,border:p===page?'1.5px solid rgba(79,110,247,0.5)':'1px solid var(--border2)',background:p===page?'rgba(79,110,247,0.12)':'var(--input-bg)',color:p===page?'#4f6ef7':'var(--text2)',cursor:'pointer' }}>{p}</button>
                      ))}
                      <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} style={{ width:30,height:30,borderRadius:8,border:'1px solid var(--border2)',background:'var(--input-bg)',cursor:page===totalPages?'not-allowed':'pointer',color:'var(--text2)',display:'flex',alignItems:'center',justifyContent:'center',opacity:page===totalPages?0.4:1 }}><ChevronRight size={14}/></button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Detail panel */}
          <AnimatePresence>
            {selected && (
              <motion.div initial={{ opacity:0, x:24 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:24 }}
                style={{ borderRadius:18, border:'1px solid var(--border)', background:'var(--card)',
                  backdropFilter:'blur(16px)', overflow:'hidden', height:'fit-content', position:'sticky', top:80 }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)',
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  background:'linear-gradient(135deg,rgba(79,110,247,0.06),transparent)' }}>
                  <p style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>Student Detail</p>
                  <button onClick={()=>setSelected(null)} style={{ width:28,height:28,borderRadius:7,border:'1px solid var(--border2)',background:'var(--input-bg)',cursor:'pointer',color:'var(--text2)',display:'flex',alignItems:'center',justifyContent:'center' }}><X size={13}/></button>
                </div>
                <div style={{ padding:18 }}>
                  <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
                    {selected.photo_path
                      ? <img src={selected.photo_path} style={{ width:110,height:140,borderRadius:14,objectFit:'cover',border:'2px solid rgba(79,110,247,0.4)',boxShadow:'0 8px 32px rgba(79,110,247,0.2)' }} alt=""/>
                      : <div style={{ width:110,height:140,borderRadius:14,background:'rgba(79,110,247,0.08)',border:'2px dashed rgba(79,110,247,0.3)',display:'flex',alignItems:'center',justifyContent:'center' }}><User size={40} style={{ color:'rgba(79,110,247,0.4)' }}/></div>}
                  </div>
                  <p style={{ textAlign:'center', fontSize:16, fontWeight:800, color:'var(--text)', marginBottom:2, textTransform:'uppercase' }}>{selected.first_name&&selected.last_name?`${selected.first_name} ${selected.last_name}`:'(Name not filled)'}</p>
                  <p style={{ textAlign:'center', fontSize:11, color:'#4f6ef7', fontFamily:'monospace', marginBottom:12 }}>{selected.student_number}</p>
                  <div style={{ marginBottom:14 }}><StatusPill status={selected.status}/></div>

                  {selected.status==='rejected' && selected.rejection_reason && (
                    <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:12,
                      background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)' }}>
                      <p style={{ fontSize:10, fontWeight:700, color:'#ef4444', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>Rejection Reason</p>
                      <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6, wordBreak:'break-word', whiteSpace:'pre-line' }}>{selected.rejection_reason}</p>
                    </div>
                  )}

                  {editFields && editFields !== null ? (
                    <div style={{ marginBottom:14, padding:'12px 14px', borderRadius:12,
                      background:'rgba(79,110,247,0.06)', border:'1px solid rgba(79,110,247,0.2)' }}>
                      <p style={{ fontSize:11, fontWeight:700, color:'#4f6ef7', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em' }}>Edit LRN</p>
                      {fieldError && <p style={{ fontSize:11, color:'#ef4444', marginBottom:8 }}>{fieldError}</p>}
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        <div>
                          <label style={{ fontSize:10, color:'var(--text3)', fontWeight:600, display:'block', marginBottom:4 }}>LRN (up to 12 digits)</label>
                          <input value={editFields.lrn} maxLength={12}
                            onChange={e=>setEditFields(p=>p?({...p,lrn:e.target.value.replace(/\D/g,'')}):p)}
                            placeholder="Enter LRN"
                            style={{ width:'100%', padding:'9px 12px', background:'var(--input-bg)', color:'var(--text)',
                              border:'1px solid var(--border2)', borderRadius:9, fontSize:13, outline:'none', fontFamily:'monospace' }} />
                        </div>
                        <div style={{ display:'flex', gap:8, marginTop:4 }}>
                          <button onClick={()=>{ setEditFields(null); setFieldError(''); }}
                            style={{ flex:1, padding:'8px', borderRadius:8, border:'1px solid var(--border)', background:'var(--input-bg)',
                              color:'var(--text2)', fontSize:12, fontWeight:600, cursor:'pointer' }}>Cancel</button>
                          <button onClick={()=>saveAdminFields(selected.id)} disabled={fieldSaving}
                            style={{ flex:2, padding:'8px', borderRadius:8, border:'none',
                              background:'linear-gradient(135deg,#4f6ef7,#3b5bdb)',
                              color:'#fff', fontSize:12, fontWeight:700, cursor:fieldSaving?'not-allowed':'pointer',
                              opacity:fieldSaving?0.7:1 }}>
                            {fieldSaving ? 'Saving…' : 'Save Changes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button onClick={()=>setEditFields({lrn:selected.lrn||''})}
                      style={{ width:'100%', marginBottom:10, padding:'8px 12px', borderRadius:10, fontSize:12, fontWeight:700,
                        background:'rgba(79,110,247,0.08)', border:'1px solid rgba(79,110,247,0.2)',
                        color:'#4f6ef7', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                      ✏️ Edit LRN
                    </button>
                  )}

                  {[
                    { icon:Mail,      label:'Email',         val:selected.email },
                    { icon:BookOpen,  label:'Grade & Section',   val:selected.grade_level?` ${selected.grade_level}${selected.section_name?` |  ${selected.section_name}`:''}` : '—' },
                    { icon:BookOpen,  label:'LRN',           val:selected.lrn||'—' },
                    { icon:Phone,     label:'EMERGENCY NUMBER',val:selected.contact_number||'—' },
                    { icon:User,      label:'Guardian',      val:selected.guardian_name?`${selected.guardian_name} (${selected.guardian_relation})` : '—' },
                    { icon:MapPin,    label:'Address',       val:selected.address||'—' },
                  ].map(({icon:Icon,label,val})=>(
                    <div key={label} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)', alignItems:'flex-start' }}>
                      <Icon size={13} style={{ color:'var(--text3)', flexShrink:0, marginTop:2 }}/>
                      <div>
                        <p style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
                        <p style={{ fontSize:12, color:'var(--text)', wordBreak:'break-word', textTransform:'uppercase' }}>{val}</p>
                      </div>
                    </div>
                  ))}
                  <div style={{ display:'flex', gap:8, marginTop:16 }}>
                    {selected.status!=='approved' && <button onClick={()=>handleApproveClick(selected)} style={{ flex:1,padding:'10px',borderRadius:10,fontSize:13,fontWeight:700,background:'linear-gradient(135deg,#22c55e,#16a34a)',color:'#fff',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}><Check size={14}/>Approve</button>}
                    {selected.status==='pending' && <button onClick={()=>handleRejectClick(selected)} style={{ flex:1,padding:'10px',borderRadius:10,fontSize:13,fontWeight:700,background:'rgba(239,68,68,0.1)',color:'#ef4444',border:'1px solid rgba(239,68,68,0.25)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6 }}><X size={14}/>Reject</button>}
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Approve-with-LRN modal */}
      <AnimatePresence>
        {approveTarget && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)',
              display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}
            onClick={()=>{ if(!approveSaving){ setApproveTarget(null); } }}>
            <motion.div initial={{ opacity:0, scale:0.95, y:10 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.95, y:10 }}
              onClick={e=>e.stopPropagation()}
              style={{ width:380, borderRadius:18, background:'var(--card)', border:'1px solid var(--border)',
                boxShadow:'0 20px 60px rgba(0,0,0,0.4)', overflow:'hidden' }}>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)',
                background:'linear-gradient(135deg,rgba(34,197,94,0.08),transparent)' }}>
                <p style={{ fontSize:14, fontWeight:800, color:'var(--text)' }}>LRN Required Before Approval</p>
                <p style={{ fontSize:12, color:'var(--text2)', marginTop:4 }}>
                  {approveTarget.first_name && approveTarget.last_name
                    ? <span style={{ textTransform:'uppercase' }}>{approveTarget.first_name} {approveTarget.last_name}</span>
                    : 'This student'} doesn't have an LRN on file yet. Enter and confirm it to proceed.
                </p>
              </div>
              <div style={{ padding:20 }}>
                {approveError && <p style={{ fontSize:12, color:'#ef4444', marginBottom:10 }}>{approveError}</p>}
                <div style={{ marginBottom:12 }}>
                  <label style={{ fontSize:10, color:'var(--text3)', fontWeight:600, display:'block', marginBottom:4 }}>LRN</label>
                  <input value={approveLrn} maxLength={12} autoFocus
                    onChange={e=>setApproveLrn(e.target.value.replace(/\D/g,''))}
                    placeholder="Enter LRN"
                    style={{ width:'100%', padding:'10px 12px', background:'var(--input-bg)', color:'var(--text)',
                      border:'1px solid var(--border2)', borderRadius:9, fontSize:14, outline:'none', fontFamily:'monospace' }} />
                </div>
                <div style={{ marginBottom:16 }}>
                  <label style={{ fontSize:10, color:'var(--text3)', fontWeight:600, display:'block', marginBottom:4 }}>Confirm LRN</label>
                  <input value={approveLrnConfirm} maxLength={12}
                    onChange={e=>setApproveLrnConfirm(e.target.value.replace(/\D/g,''))}
                    placeholder="Re-enter LRN"
                    onKeyDown={e=>{ if(e.key==='Enter') confirmApproveWithLrn(); }}
                    style={{ width:'100%', padding:'10px 12px', background:'var(--input-bg)', color:'var(--text)',
                      border:'1px solid var(--border2)', borderRadius:9, fontSize:14, outline:'none', fontFamily:'monospace' }} />
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={()=>setApproveTarget(null)} disabled={approveSaving}
                    style={{ flex:1, padding:'10px', borderRadius:9, border:'1px solid var(--border)', background:'var(--input-bg)',
                      color:'var(--text2)', fontSize:13, fontWeight:600, cursor:approveSaving?'not-allowed':'pointer' }}>Cancel</button>
                  <button onClick={confirmApproveWithLrn} disabled={approveSaving}
                    style={{ flex:2, padding:'10px', borderRadius:9, border:'none',
                      background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', fontSize:13, fontWeight:700,
                      cursor:approveSaving?'not-allowed':'pointer', opacity:approveSaving?0.7:1,
                      display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    {approveSaving ? 'Approving…' : <><Check size={14}/>Confirm &amp; Approve</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Reject-with-reason modal — LEFT: student info preview (caps),
           RIGHT: pick-a-field + note builder ──────────────────────── */}
      <AnimatePresence>
        {rejectTarget && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)',
              display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 }}
            onClick={()=>{ if(!rejectSaving){ setRejectTarget(null); } }}>
            <motion.div initial={{ opacity:0, scale:0.96, y:10 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.96, y:10 }}
              onClick={e=>e.stopPropagation()}
              style={{ width:'100%', maxWidth:880, maxHeight:'88vh', borderRadius:20, background:'var(--card)', border:'1px solid var(--border)',
                boxShadow:'0 24px 70px rgba(0,0,0,0.45)', overflow:'hidden', display:'flex', flexDirection:'column' }}>

              <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)',
                background:'linear-gradient(135deg,rgba(239,68,68,0.08),transparent)', flexShrink:0 }}>
                <p style={{ fontSize:15, fontWeight:800, color:'var(--text)' }}>Reject Submission</p>
                <p style={{ fontSize:12, color:'var(--text2)', marginTop:3 }}>
                  Check the info on the left, then flag exactly what's wrong on the right —
                  {' '}<span style={{ textTransform:'uppercase' }}>{rejectTarget.first_name && rejectTarget.last_name ? `${rejectTarget.first_name} ${rejectTarget.last_name}` : 'the student'}</span> will
                  see this so they know what to fix.
                </p>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'300px 1fr', flex:1, overflow:'hidden' }}>

                {/* LEFT — read-only preview of what the student filled up, all caps */}
                <div style={{ borderRight:'1px solid var(--border)', overflowY:'auto', padding:18,
                  background:'var(--bg2)' }}>
                  <div style={{ display:'flex', justifyContent:'center', marginBottom:14 }}>
                    {rejectTarget.photo_path
                      ? <img src={rejectTarget.photo_path} style={{ width:96, height:122, borderRadius:12, objectFit:'cover', border:'2px solid rgba(79,110,247,0.4)' }} alt=""/>
                      : <div style={{ width:96, height:122, borderRadius:12, background:'rgba(79,110,247,0.08)', border:'2px dashed rgba(79,110,247,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}><User size={30} style={{ color:'rgba(79,110,247,0.4)' }}/></div>}
                  </div>
                  <p style={{ textAlign:'center', fontSize:14, fontWeight:800, color:'var(--text)', marginBottom:2, textTransform:'uppercase' }}>
                    {rejectTarget.first_name && rejectTarget.last_name ? `${rejectTarget.first_name} ${rejectTarget.last_name}` : '(Name not filled)'}
                  </p>
                  <p style={{ textAlign:'center', fontSize:10, color:'#4f6ef7', fontFamily:'monospace', marginBottom:14 }}>{rejectTarget.student_number}</p>

                  {[
                    { icon:Mail,     label:'Email',           val:rejectTarget.email || '—' },
                    { icon:BookOpen, label:'Grade & Section', val:rejectTarget.grade_level ? `Grade ${rejectTarget.grade_level}${rejectTarget.section_name ? ` · ${rejectTarget.section_name}` : ''}` : '—' },
              
                    { icon:Phone,    label:'Contact Number',  val:rejectTarget.contact_number || '—' },
                    { icon:User,     label:'Guardian',        val:rejectTarget.guardian_name ? `${rejectTarget.guardian_name} (${rejectTarget.guardian_relation||'—'})` : '—' },
                    { icon:MapPin,   label:'Address',         val:rejectTarget.address || '—' },
                  ].map(({icon:Icon,label,val})=>(
                    <div key={label} style={{ display:'flex', gap:8, padding:'8px 0', borderBottom:'1px solid var(--border)', alignItems:'flex-start' }}>
                      <Icon size={12} style={{ color:'var(--text3)', flexShrink:0, marginTop:2 }}/>
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
                        <p style={{ fontSize:12, color:'var(--text)', wordBreak:'break-word', textTransform:'uppercase' }}>{val}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* RIGHT — build the rejection notes */}
                <div style={{ display:'flex', flexDirection:'column', overflow:'hidden' }}>
                  <div style={{ flex:1, overflowY:'auto', padding:20, display:'flex', flexDirection:'column', gap:16 }}>

                    {rejectError && (
                      <p style={{ fontSize:12, color:'#ef4444', display:'flex', alignItems:'center', gap:6 }}>
                        <AlertCircle size={13}/> {rejectError}
                      </p>
                    )}

                    {/* Issue builder */}
                    <div style={{ padding:14, borderRadius:14, border:'1px solid var(--border)', background:'var(--input-bg)' }}>
                      <p style={{ fontSize:11, fontWeight:800, color:'var(--text2)', textTransform:'uppercase',
                        letterSpacing:'0.06em', marginBottom:10 }}>What's wrong?</p>

                      <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                        <div style={{ position:'relative', flex:1 }}>
                          <select value={newIssueField}
                            onChange={e=>setNewIssueField(e.target.value)}
                            style={{ width:'100%', padding:'9px 32px 9px 12px', borderRadius:9, fontSize:13,
                              background:'var(--card)', border:'1px solid var(--border2)', color:'var(--text)',
                              appearance:'none', cursor:'pointer', outline:'none', fontFamily:'inherit', fontWeight:600 }}>
                            {REJECTION_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                          </select>
                          <ChevronDown size={13} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }} />
                        </div>
                      </div>

                      {currentFieldConfig.suggestions.length > 0 && (
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
                          {currentFieldConfig.suggestions.map(s => (
                            <button key={s} onClick={()=>setNewIssueNote(s)}
                              style={{ padding:'5px 10px', borderRadius:20, fontSize:11, fontWeight:600,
                                background: newIssueNote===s ? 'rgba(239,68,68,0.14)' : 'var(--card)',
                                border: newIssueNote===s ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border2)',
                                color: newIssueNote===s ? '#ef4444' : 'var(--text2)', cursor:'pointer' }}>
                              {s}
                            </button>
                          ))}
                        </div>
                      )}

                      <div style={{ display:'flex', gap:8 }}>
                        <input value={newIssueNote}
                          onChange={e=>setNewIssueNote(e.target.value)}
                          onKeyDown={e=>{ if(e.key==='Enter') addIssue(); }}
                          placeholder={`Note for ${currentFieldConfig.label.toLowerCase()}…`}
                          style={{ flex:1, padding:'9px 12px', background:'var(--card)', color:'var(--text)',
                            border:'1px solid var(--border2)', borderRadius:9, fontSize:13, outline:'none', fontFamily:'inherit' }} />
                        <button onClick={addIssue}
                          style={{ padding:'9px 14px', borderRadius:9, border:'none', cursor:'pointer',
                            background:'linear-gradient(135deg,#4f6ef7,#3b5bdb)', color:'#fff', fontSize:12, fontWeight:700,
                            display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
                          <Plus size={14}/> Add
                        </button>
                      </div>
                    </div>

                    {/* Added issues list */}
                    {rejectIssues.length > 0 && (
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        <p style={{ fontSize:11, fontWeight:800, color:'var(--text2)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                          Flagged issues ({rejectIssues.length})
                        </p>
                        {rejectIssues.map(issue => {
                          const label = REJECTION_FIELDS.find(f=>f.key===issue.field)?.label || issue.field;
                          return (
                            <div key={issue.id} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'10px 12px',
                              borderRadius:11, background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.2)' }}>
                              <div style={{ flex:1, minWidth:0 }}>
                                <p style={{ fontSize:10, fontWeight:800, color:'#ef4444', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:2 }}>{label}</p>
                                <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.5, wordBreak:'break-word' }}>{issue.note}</p>
                              </div>
                              <button onClick={()=>removeIssue(issue.id)}
                                style={{ width:24, height:24, borderRadius:7, border:'none', background:'rgba(239,68,68,0.12)',
                                  color:'#ef4444', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                <Trash2 size={12}/>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* General note */}
                    <div>
                      <label style={{ fontSize:11, fontWeight:800, color:'var(--text2)', textTransform:'uppercase',
                        letterSpacing:'0.06em', display:'block', marginBottom:8 }}>General notes (optional)</label>
                      <textarea value={generalNote} rows={2}
                        onChange={e=>setGeneralNote(e.target.value)}
                        placeholder="Any additional instructions for the student…"
                        style={{ width:'100%', padding:'10px 12px', background:'var(--input-bg)', color:'var(--text)',
                          border:'1px solid var(--border2)', borderRadius:9, fontSize:13, outline:'none', fontFamily:'inherit', resize:'vertical' }} />
                    </div>

                    {/* Live preview of what the student will see */}
                    {rejectPreview && (
                      <div>
                        <p style={{ fontSize:11, fontWeight:800, color:'var(--text2)', textTransform:'uppercase',
                          letterSpacing:'0.06em', marginBottom:8 }}>Preview — what the student will see</p>
                        <div style={{ padding:'12px 14px', borderRadius:11, background:'var(--bg2)', border:'1px solid var(--border)' }}>
                          <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.7, whiteSpace:'pre-line' }}>{rejectPreview}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ padding:16, borderTop:'1px solid var(--border)', display:'flex', gap:10, flexShrink:0 }}>
                    <button onClick={()=>setRejectTarget(null)} disabled={rejectSaving}
                      style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid var(--border)', background:'var(--input-bg)',
                        color:'var(--text2)', fontSize:13, fontWeight:600, cursor:rejectSaving?'not-allowed':'pointer' }}>Cancel</button>
                    <button onClick={confirmReject} disabled={rejectSaving || rejectIssues.length===0}
                      style={{ flex:2, padding:'11px', borderRadius:10, border:'none',
                        background: rejectIssues.length===0 ? 'linear-gradient(135deg,#ef444470,#dc262670)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                        color:'#fff', fontSize:13, fontWeight:700,
                        cursor:(rejectSaving||rejectIssues.length===0)?'not-allowed':'pointer', opacity:rejectSaving?0.7:1,
                        display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                      {rejectSaving ? 'Rejecting…' : <><X size={14}/>Confirm &amp; Reject{rejectIssues.length>0?` (${rejectIssues.length})`:''}</>}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}