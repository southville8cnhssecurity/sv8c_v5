'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import { GraduationCap, Search, Eye, Check, X, User, ChevronLeft, ChevronRight, Trash2, Phone, MapPin, Mail } from 'lucide-react';

const font = 'Inter, Plus Jakarta Sans, system-ui, sans-serif';
const PAGE_SIZE = 15;
type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

function StatusPill({ status }: { status: string }) {
  const m: Record<string,any> = {
    approved:{ bg:'rgba(34,197,94,0.12)',  color:'#22c55e' },
    rejected:{ bg:'rgba(239,68,68,0.12)',  color:'#ef4444' },
    pending: { bg:'rgba(249,115,22,0.12)', color:'#f97316' },
  };
  const s = m[status] || m.pending;
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px',
      borderRadius:20, fontSize:11, fontWeight:700, background:s.bg, color:s.color }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:s.color }} />
      {status.charAt(0).toUpperCase()+status.slice(1)}
    </span>
  );
}

export default function FacultySubmitPage() {
  const [faculty, setFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState<FilterTab>('all');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState('');

  async function load() {
    setLoading(true);
    const r = await fetch('/api/faculty');
    const d = await r.json();
    setFaculty(Array.isArray(d)?d:[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: number, status: string) {
    setActionLoading(`${id}-${status}`);
    await fetch(`/api/faculty/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status}) });
    await load();
    setSelected((prev: any) => prev?.id===id ? {...prev, status} : prev);
    setActionLoading('');
  }

  async function deleteFaculty(id: number) {
    if (!confirm('Delete this faculty record? This cannot be undone.')) return;
    await fetch(`/api/faculty/${id}`, { method:'DELETE' });
    setSelected(null);
    load();
  }

  const filtered = faculty
    .filter(f => filter === 'all' || f.status === filter)
    .filter(f => !search ||
      `${f.first_name} ${f.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      f.faculty_number?.toLowerCase().includes(search.toLowerCase()) ||
      f.email?.toLowerCase().includes(search.toLowerCase()));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const counts = {
    all: faculty.length,
    pending: faculty.filter(f=>f.status==='pending').length,
    approved: faculty.filter(f=>f.status==='approved').length,
    rejected: faculty.filter(f=>f.status==='rejected').length,
  };

  const tabColors: Record<FilterTab,string> = {
    all:'#f97316', pending:'#f59e0b', approved:'#22c55e', rejected:'#ef4444'
  };

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.3 }}
      style={{ fontFamily:font, minHeight:'100vh', background:'var(--bg)', transition:'background 0.35s' }}>
      <Header title="Faculty Submissions" subtitle="Review and approve faculty accounts" />
      <div style={{ padding:24 }}>

        {/* Filter tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', gap:6 }}>
            {(['all','pending','approved','rejected'] as FilterTab[]).map(t => {
              const active = filter===t;
              const color = tabColors[t];
              return (
                <motion.button key={t} whileTap={{ scale:0.96 }}
                  onClick={()=>{ setFilter(t); setPage(1); }}
                  style={{ padding:'8px 14px', borderRadius:10, fontSize:12, fontWeight:700,
                    background: active ? `${color}18` : 'var(--card)',
                    border: active ? `1.5px solid ${color}50` : '1px solid var(--border)',
                    color: active ? color : 'var(--text2)',
                    cursor:'pointer', transition:'all 0.2s',
                    boxShadow: active ? `0 0 16px ${color}20` : 'none' }}>
                  {t.charAt(0).toUpperCase()+t.slice(1)} <span style={{ marginLeft:4, opacity:0.7 }}>({counts[t]})</span>
                </motion.button>
              );
            })}
          </div>
          <div style={{ position:'relative', minWidth:220 }}>
            <Search size={14} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }} />
            <input value={search} onChange={e=>{ setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, ID, email…"
              style={{ width:'100%', padding:'10px 14px 10px 34px', background:'var(--input-bg)',
                color:'var(--text)', border:'1px solid var(--border2)', borderRadius:10,
                fontSize:13, outline:'none', fontFamily:'inherit' }} />
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap:20 }}>
          {/* Table */}
          <div style={{ borderRadius:18, overflow:'hidden', border:'1px solid var(--border)', background:'var(--card)', backdropFilter:'blur(12px)' }}>
            {loading ? (
              <div style={{ padding:20, display:'flex', flexDirection:'column', gap:10 }}>
                {[1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{ height:52, borderRadius:10 }} />)}
              </div>
            ) : paginated.length === 0 ? (
              <div style={{ padding:60, textAlign:'center' }}>
                <GraduationCap size={40} style={{ color:'var(--text3)', margin:'0 auto 14px', display:'block' }} />
                <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:6 }}>No submissions</p>
                <p style={{ fontSize:13, color:'var(--text2)' }}>No {filter!=='all'?filter:''} faculty found{search?` matching "${search}"`:''}</p>
              </div>
            ) : (
              <>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--border)' }}>
                      {['Faculty','ID Number','Department','Subject','Contact','Status','Actions'].map(h=>(
                        <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:10,
                          fontWeight:800, color:'var(--text3)', textTransform:'uppercase',
                          letterSpacing:'0.08em', whiteSpace:'nowrap', background:'var(--bg2)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(f => (
                      <tr key={f.id} style={{ borderBottom:'1px solid var(--border)', transition:'background 0.15s', cursor:'pointer' }}
                        onClick={()=>setSelected(f)}
                        onMouseEnter={e=>(e.currentTarget.style.background='var(--bg2)')}
                        onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                        <td style={{ padding:'12px 16px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            {f.photo_path ? (
                              <img src={f.photo_path} style={{ width:36, height:36, borderRadius:9, objectFit:'cover',
                                border:'1.5px solid rgba(79,110,247,0.3)', flexShrink:0 }} alt="" />
                            ) : (
                              <div style={{ width:36, height:36, borderRadius:9, flexShrink:0, background:'rgba(79,110,247,0.1)',
                                border:'1px solid rgba(79,110,247,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <User size={16} style={{ color:'#4f6ef7' }} />
                              </div>
                            )}
                            <div>
                              <p style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>
                                {f.first_name&&f.last_name?`${f.first_name} ${f.last_name}`:<span style={{color:'var(--text3)',fontStyle:'italic'}}>Not filled</span>}
                              </p>
                              <p style={{ fontSize:10, color:'var(--text3)', fontFamily:'monospace' }}>{f.email}</p>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:'12px 16px', fontSize:11, color:'#4f6ef7', fontFamily:'monospace', fontWeight:600 }}>{f.faculty_number}</td>
                        <td style={{ padding:'12px 16px' }}>
                          {f.department ? (
                            <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, background:'rgba(79,110,247,0.1)', color:'#4f6ef7', fontWeight:600 }}>{f.department}</span>
                          ) : <span style={{color:'var(--text3)',fontSize:12}}>—</span>}
                        </td>
                        <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text2)' }}>{f.subject||'—'}</td>
                        <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text3)' }}>{f.contact_number||'—'}</td>
                        <td style={{ padding:'12px 16px' }}><StatusPill status={f.status} /></td>
                        <td style={{ padding:'12px 16px' }}>
                          <div style={{ display:'flex', gap:6 }} onClick={e=>e.stopPropagation()}>
                            <button onClick={()=>setSelected(f)}
                              style={{ width:30, height:30, borderRadius:8, border:'1px solid rgba(79,110,247,0.2)',
                                background:'rgba(79,110,247,0.08)', cursor:'pointer', color:'#4f6ef7',
                                display:'flex', alignItems:'center', justifyContent:'center' }}><Eye size={13}/></button>
                            {f.status!=='approved' && (
                              <button onClick={()=>updateStatus(f.id,'approved')} disabled={!!actionLoading}
                                style={{ width:30, height:30, borderRadius:8, border:'1px solid rgba(34,197,94,0.2)',
                                  background:'rgba(34,197,94,0.08)', cursor:'pointer', color:'#22c55e',
                                  display:'flex', alignItems:'center', justifyContent:'center', opacity:actionLoading?0.5:1 }}><Check size={13}/></button>
                            )}
                            {f.status!=='rejected' && (
                              <button onClick={()=>updateStatus(f.id,'rejected')} disabled={!!actionLoading}
                                style={{ width:30, height:30, borderRadius:8, border:'1px solid rgba(239,68,68,0.2)',
                                  background:'rgba(239,68,68,0.08)', cursor:'pointer', color:'#ef4444',
                                  display:'flex', alignItems:'center', justifyContent:'center', opacity:actionLoading?0.5:1 }}><X size={13}/></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderTop:'1px solid var(--border)' }}>
                    <p style={{ fontSize:12, color:'var(--text3)' }}>
                      Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE,filtered.length)} of {filtered.length}
                    </p>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                        style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border2)',
                          background:'var(--input-bg)', cursor:page===1?'not-allowed':'pointer', color:'var(--text2)',
                          display:'flex', alignItems:'center', justifyContent:'center', opacity:page===1?0.4:1 }}>
                        <ChevronLeft size={14}/>
                      </button>
                      {Array.from({length:totalPages},(_,i)=>i+1).filter(p=>Math.abs(p-page)<=2).map(p=>(
                        <button key={p} onClick={()=>setPage(p)}
                          style={{ width:30, height:30, borderRadius:8, fontSize:12, fontWeight:700,
                            border: p===page?'1.5px solid rgba(79,110,247,0.5)':'1px solid var(--border2)',
                            background: p===page?'rgba(79,110,247,0.12)':'var(--input-bg)',
                            color: p===page?'#4f6ef7':'var(--text2)', cursor:'pointer' }}>{p}</button>
                      ))}
                      <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                        style={{ width:30, height:30, borderRadius:8, border:'1px solid var(--border2)',
                          background:'var(--input-bg)', cursor:page===totalPages?'not-allowed':'pointer', color:'var(--text2)',
                          display:'flex', alignItems:'center', justifyContent:'center', opacity:page===totalPages?0.4:1 }}>
                        <ChevronRight size={14}/>
                      </button>
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
                  <p style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>Faculty Detail</p>
                  <button onClick={()=>setSelected(null)}
                    style={{ width:28, height:28, borderRadius:7, border:'1px solid var(--border2)',
                      background:'var(--input-bg)', cursor:'pointer', color:'var(--text2)',
                      display:'flex', alignItems:'center', justifyContent:'center' }}><X size={13}/></button>
                </div>
                <div style={{ padding:18 }}>
                  {/* Large photo */}
                  <div style={{ display:'flex', justifyContent:'center', marginBottom:16 }}>
                    {selected.photo_path ? (
                      <img src={selected.photo_path} style={{ width:110, height:140, borderRadius:14, objectFit:'cover',
                        border:'2px solid rgba(79,110,247,0.4)', boxShadow:'0 8px 32px rgba(79,110,247,0.2)' }} alt="" />
                    ) : (
                      <div style={{ width:110, height:140, borderRadius:14, background:'rgba(79,110,247,0.08)',
                        border:'2px dashed rgba(79,110,247,0.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <User size={40} style={{ color:'rgba(79,110,247,0.4)' }} />
                      </div>
                    )}
                  </div>
                  <p style={{ textAlign:'center', fontSize:16, fontWeight:800, color:'var(--text)', marginBottom:2 }}>
                    {selected.first_name&&selected.last_name?`${selected.first_name} ${selected.last_name}`:'(Name not filled)'}
                  </p>
                  <p style={{ textAlign:'center', fontSize:11, color:'#4f6ef7', fontFamily:'monospace', marginBottom:12 }}>{selected.faculty_number}</p>
                  <div style={{ marginBottom:14 }}><StatusPill status={selected.status} /></div>

                  {[
                    { icon:Mail,  label:'Email',      val:selected.email },
                    { icon:GraduationCap, label:'Department', val:selected.department },
                    { icon:GraduationCap, label:'Subject',    val:selected.subject||'—' },
                    { icon:Phone, label:'Contact',    val:selected.contact_number||'—' },
                    { icon:MapPin, label:'Address',   val:selected.address||'—' },
                  ].map(({icon:Icon,label,val})=>(
                    <div key={label} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)', alignItems:'flex-start' }}>
                      <Icon size={13} style={{ color:'var(--text3)', flexShrink:0, marginTop:2 }} />
                      <div>
                        <p style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</p>
                        <p style={{ fontSize:12, color:'var(--text)', wordBreak:'break-word' }}>{val}</p>
                      </div>
                    </div>
                  ))}

                  <div style={{ display:'flex', gap:8, marginTop:16 }}>
                    {selected.status!=='approved' && (
                      <button onClick={()=>updateStatus(selected.id,'approved')}
                        style={{ flex:1, padding:'10px', borderRadius:10, fontSize:13, fontWeight:700,
                          background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff',
                          border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                        <Check size={14}/> Approve
                      </button>
                    )}
                    {selected.status!=='rejected' && (
                      <button onClick={()=>updateStatus(selected.id,'rejected')}
                        style={{ flex:1, padding:'10px', borderRadius:10, fontSize:13, fontWeight:700,
                          background:'rgba(239,68,68,0.1)', color:'#ef4444',
                          border:'1px solid rgba(239,68,68,0.25)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                        <X size={14}/> Reject
                      </button>
                    )}
                  </div>
                  <button onClick={()=>deleteFaculty(selected.id)}
                    style={{ width:'100%', marginTop:8, padding:'9px', borderRadius:10, fontSize:12, fontWeight:600,
                      background:'transparent', color:'var(--text3)', border:'1px solid var(--border)',
                      cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <Trash2 size={13}/> Delete Record
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
