'use client';
import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/lib/theme';
import PhotoUploadCrop from '@/components/ui/PhotoUploadCrop';
import {
  User, Save, LogOut, CheckCircle, Clock, XCircle,
  Bell, Sun, Moon, BellOff, Check, X, AlertCircle, Lock, Eye, EyeOff, BookOpen,
} from 'lucide-react';

const font = 'Inter, Plus Jakarta Sans, system-ui, sans-serif';
const accent = '#14b8a6';
const glow   = 'rgba(20,184,166,0.3)';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block',
        marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {children}
    </div>
  );
}

function iStyle(focused: string, key: string, locked: boolean, extra?: React.CSSProperties): React.CSSProperties {
  return {
    width: '100%', padding: '11px 14px',
    background: locked ? 'var(--bg2)' : 'var(--input-bg)',
    color: locked ? 'var(--text2)' : 'var(--text)',
    border: `1.5px solid ${focused === key ? accent + 'AA' : 'var(--input-border)'}`,
    borderRadius: 11, fontSize: 14, outline: 'none', fontFamily: font,
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxShadow: focused === key ? `0 0 0 3px ${accent}18` : 'none',
    cursor: locked ? 'not-allowed' : 'auto',
    pointerEvents: locked ? 'none' : 'auto',
    ...extra,
  };
}

function validate11(v: string) { return /^\d{11}$/.test((v||'').replace(/\s/g,'')); }

// ── Guide card ────────────────────────────────────────────────────────────────
function GuideCard() {
  const rows = [
    { label:'FIRST NAME',    value:'JUAN',                                         note:'' },
    { label:'MIDDLE NAME',   value:'BATUNGBAKAL (optional)',                        note:'' },
    { label:'LAST NAME',     value:'DELA CRUZ',                                    note:'' },
    { label:'POSITION',      value:'HELPER / JANITOR / GUARD…',                    note:'' },
  
    { label:'CONTACT NO.',   value:'09123456789',                                  note:'11 digits' },
    { label:'FULL ADDRESS',  value:'B1 L1, SOUTHVILLE 8C, PHASE 1N,\nSAN ISIDRO, RODRIGUEZ, RIZAL', note:'UPPERCASE' },
  ];
  return (
    <div style={{ borderRadius:16, overflow:'hidden', border:`1.5px solid ${accent}50`,
      background:'var(--card)', backdropFilter:'blur(12px)' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)',
        background:`linear-gradient(135deg,${accent}12,transparent)`,
        display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
          background:`linear-gradient(135deg,${accent},#0d9488)`,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <BookOpen size={13} style={{ color:'#fff' }} />
        </div>
        <div>
          <p style={{ fontSize:12, fontWeight:800, color:'var(--text)' }}>Sample Guide</p>
          <p style={{ fontSize:10, color:'var(--text3)' }}>How to fill the form</p>
        </div>
      </div>
      <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:6 }}>
        {rows.map(({ label, value, note }) => (
          <div key={label} style={{ padding:'7px 10px', borderRadius:8,
            background:'var(--input-bg)', border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:2 }}>
              <span style={{ fontSize:9, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.06em' }}>{label}</span>
              {note && <span style={{ fontSize:9, color:accent, fontWeight:700 }}>{note}</span>}
            </div>
            <span style={{ fontSize:12, fontWeight:700, color:'var(--text)', whiteSpace:'pre-line', lineHeight:1.4 }}>{value}</span>
          </div>
        ))}
        <div style={{ padding:'8px 10px', borderRadius:8,
          background:`${accent}07`, border:`1px solid ${accent}20` }}>
          <p style={{ fontSize:10, color:accent, fontWeight:700, marginBottom:2 }}>📸 ID Photo</p>
          <p style={{ fontSize:11, color:'var(--text2)', lineHeight:1.5 }}>
            Clear solo photo, face visible, plain background. No filters.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StaffStatusPage() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  const [profile, setProfile]           = useState<any>(null);
  const [notifs, setNotifs]             = useState<any[]>([]);
  const [tab, setTab]                   = useState<'profile'|'notifications'>('profile');
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [pendingPhoto, setPendingPhoto] = useState<File|null>(null);
  const [form, setForm]                 = useState<any>({});
  const [focused, setFocused]           = useState('');
  const [showGuide, setShowGuide]       = useState(true);
  const [modal, setModal]               = useState<null|'warning'|'review'|'editRequest'>(null);
  const [triedConfirm, setTriedConfirm] = useState(false);
  const [editFields, setEditFields]     = useState<string[]>([]);
  const [editNote, setEditNote]         = useState('');
  const [sendingEdit, setSendingEdit]   = useState(false);

  const isLocked      = profile?.submitted === 1 || profile?.submitted === true;
  const editRequested = profile?.edit_requested === 1 || profile?.edit_requested === true;
  const unread   = notifs.filter(n => !n.is_read).length;

  useEffect(() => {
    fetch('/api/me').then(r=>r.json()).then(d=>{ setProfile(d); setForm(d||{}); });
    fetch('/api/notifications').then(r=>r.json()).then(d=>setNotifs(Array.isArray(d)?d:[]));
  }, []);

  async function saveProfile() {
    setSaving(true);
    if (pendingPhoto) {
      const fd = new FormData(); fd.append('photo', pendingPhoto);
      await fetch('/api/me/photo', { method:'POST', body:fd });
      setPendingPhoto(null);
    }
    await fetch('/api/me', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...form, submitted:1 }),
    });
    const updated = await fetch('/api/me').then(r=>r.json());
    setProfile(updated); setForm(updated);
    setSaving(false); setSaved(true);
    setTimeout(()=>setSaved(false), 2500);
  }

  async function sendEditRequest() {
    if (editFields.length === 0) return;
    setSendingEdit(true);
    await fetch('/api/me', {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ editRequest:true, requestedFields:editFields, editNote }),
    });
    const updated = await fetch('/api/me').then(r=>r.json());
    setProfile(updated); setForm(updated);
    setSendingEdit(false); setModal(null); setEditFields([]); setEditNote('');
  }

  async function markAllRead() {
    setNotifs(p=>p.map(n=>({...n,is_read:1})));
    await fetch('/api/notifications',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({markAll:true}) });
  }
  async function markRead(id:number) {
    setNotifs(p=>p.map(n=>n.id===id?{...n,is_read:1}:n));
    await fetch('/api/notifications',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id}) });
  }

  // Validation
  const fullName = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ');
  const validItems = [
    { key:'photo',   label:'ID Photo',       valid: !!pendingPhoto || !!profile?.photo_path,          hint:'Upload a clear photo.',        value: (pendingPhoto || profile?.photo_path) ? 'Photo attached' : '' },
    { key:'name',    label:'Full Name',       valid: !!(form.first_name?.trim()&&form.last_name?.trim()), hint:'First and last name required.', value: fullName },
    { key:'pos',     label:'Position',        valid: !!(form.position?.trim()),                          hint:'Enter your position.',          value: form.position||'' },
    { key:'contact', label:'Contact Number',  valid: validate11(form.contact_number),                    hint:'Must be exactly 11 digits.',    value: form.contact_number||'' },
    { key:'address', label:'Full Address',    valid: !!(form.address?.trim()),                           hint:'Enter your complete address.',  value: form.address||'' },
  ];
  const allValid    = validItems.every(v=>v.valid);
  const invalidCount = validItems.filter(v=>!v.valid).length;

  const STATUS: Record<string,any> = {
    approved:{ color:'#22c55e', bg:'rgba(34,197,94,0.1)',  icon:CheckCircle, label:'Approved',       msg:'Your account is approved. Your ID will be ready soon.' },
    pending: { color:'#f97316', bg:'rgba(249,115,22,0.1)', icon:Clock,       label:'Pending Review', msg:'Your info is being reviewed. Check back for updates.' },
    rejected:{ color:'#ef4444', bg:'rgba(239,68,68,0.1)',  icon:XCircle,     label:'Rejected',       msg:'Not approved. Contact the school admin.' },
  };
  const sc = STATUS[profile?.status||'pending']||STATUS.pending;
  const StatusIcon = sc.icon;

  return (
    <div suppressHydrationWarning style={{ fontFamily:font, minHeight:'100vh', background:'var(--bg)', transition:'background 0.35s' }}>
      {/* NAV */}
      <nav style={{ position:'sticky', top:0, zIndex:40, minHeight:58,
        background:'var(--header-bg)', backdropFilter:'blur(20px)',
        borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 20px', gap:12, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0 }}>
          <img src="https://cdn.phototourl.com/free/2026-05-30-cddc7547-fc18-4888-841d-b8acd54ea907.png"
            style={{ width:'clamp(36px,6vw,48px)', height:'clamp(36px,6vw,48px)', objectFit:'contain', flexShrink:0 }}
            alt="Southville 8C NHS logo" />
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:'clamp(13px,2.4vw,18px)', fontWeight:800, color:'var(--text)',
              letterSpacing:'-0.02em', lineHeight:1.15, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              SOUTHVILLE 8C NATIONAL HIGH SCHOOL
            </p>
            <p style={{ fontSize:'clamp(9px,1.4vw,11px)', color:accent, fontWeight:700, letterSpacing:'0.1em' }}>STAFF PORTAL</p>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <motion.button whileTap={{ scale:0.92 }} onClick={()=>setTab('notifications')}
            style={{ width:34, height:34, borderRadius:9,
              border:`1px solid ${unread>0?accent+'50':'var(--border2)'}`,
              background:unread>0?`${accent}12`:'var(--input-bg)', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
            <Bell size={15} style={{ color:unread>0?accent:'var(--text3)' }} />
            {unread>0&&<span style={{ position:'absolute', top:-4, right:-4, width:16, height:16,
              borderRadius:'50%', background:accent, display:'flex', alignItems:'center',
              justifyContent:'center', fontSize:9, fontWeight:800, color:'#fff',
              border:'2px solid var(--bg)' }}>{unread}</span>}
          </motion.button>
          <motion.button whileTap={{ scale:0.92 }} onClick={toggleTheme}
            style={{ width:34, height:34, borderRadius:9, border:'1px solid var(--border2)',
              background:'var(--input-bg)', cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text2)' }}>
            {isLight ? <Moon size={14}/> : <Sun size={14}/>}
          </motion.button>
          <motion.button whileTap={{ scale:0.95 }} onClick={()=>signOut({callbackUrl:'/login'})}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:9,
              background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
              cursor:'pointer', color:'#ef4444', fontSize:12, fontWeight:700 }}>
            <LogOut size={13}/> Sign Out
          </motion.button>
        </div>
      </nav>

      <div className="page-wrap" style={{ maxWidth:1100, margin:'0 auto', padding:24 }}>
        {/* STATUS BANNER */}
        <motion.div className="status-banner" initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}
          style={{ borderRadius:16, padding:'14px 18px', marginBottom:16,
            display:'flex', alignItems:'center', gap:12, flexWrap:'wrap',
            background:sc.bg, border:`1px solid ${sc.color}30` }}>
          <div style={{ width:38, height:38, borderRadius:11, flexShrink:0,
            background:sc.color, display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:`0 4px 14px ${sc.color}50` }}>
            <StatusIcon size={20} style={{ color:'#fff' }} />
          </div>
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:13, fontWeight:800, color:sc.color }}>{sc.label}</p>
            <p style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>{sc.msg}</p>
          </div>
          {profile?.staff_number&&(
            <div className="staff-no" style={{ marginLeft:'auto', textAlign:'right' }}>
              <p style={{ fontSize:10, color:'var(--text3)' }}>Staff No.</p>
              <p style={{ fontSize:13, fontWeight:800, color:'var(--text)', fontFamily:'monospace' }}>{profile.staff_number}</p>
            </div>
          )}
        </motion.div>

        {isLocked&&(
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }}
            style={{ borderRadius:14, padding:'13px 18px', marginBottom:16,
              display:'flex', alignItems:'center', gap:12,
              background:`${accent}08`, border:`1px solid ${accent}30` }}>
            <Lock size={18} style={{ color:accent, flexShrink:0 }} />
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:accent }}>Profile locked</p>
              <p style={{ fontSize:12, color:'var(--text2)', marginTop:2 }}>
                Your info has been submitted. Wait for a notification when your ID is ready.
              </p>
            </div>
          </motion.div>
        )}

        {/* TAB BAR */}
        <div className="tab-bar" style={{ display:'flex', gap:6, marginBottom:20,
          background:'var(--card)', border:'1px solid var(--border)', borderRadius:14, padding:4 }}>
          {([
            { id:'profile', icon:User, label:'My Profile' },
            { id:'notifications', icon:Bell, label:`Notifications${unread>0?` (${unread})`:''}`},
          ] as const).map(t=>{
            const active = tab===t.id;
            return (
              <motion.button key={t.id} whileTap={{ scale:0.97 }} onClick={()=>setTab(t.id)}
                className="tab-btn"
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                  padding:'9px 12px', borderRadius:10, fontSize:13, minWidth:0, whiteSpace:'nowrap', overflow:'hidden',
                  fontWeight:active?700:400,
                  background:active?`${accent}15`:'transparent',
                  border:active?`1px solid ${accent}40`:'1px solid transparent',
                  color:active?accent:'var(--text2)', cursor:'pointer', transition:'all 0.2s' }}>
                <t.icon size={14} style={{ flexShrink:0 }}/><span className="tab-btn-label" style={{ overflow:'hidden', textOverflow:'ellipsis' }}>{t.label}</span>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {tab==='profile'&&(
            <motion.div key="profile" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              {/* Guide toggle */}
              <div style={{ marginBottom:14, display:'flex', justifyContent:'flex-end' }}>
                <motion.button whileTap={{ scale:0.95 }} onClick={()=>setShowGuide(v=>!v)}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 14px',
                    borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer',
                    background:showGuide?`${accent}12`:'var(--card)',
                    border:`1px solid ${showGuide?accent+'40':'var(--border)'}`,
                    color:showGuide?accent:'var(--text2)', transition:'all 0.2s' }}>
                  {showGuide?<EyeOff size={13}/>:<Eye size={13}/>}
                  {showGuide?'Hide Guide':'Show Guide'}
                </motion.button>
              </div>

              <div style={{ display:'grid',
                gridTemplateColumns:showGuide?'clamp(260px,30%,320px) 1fr':'1fr',
                gap:20, alignItems:'start' }}
                className="fillup-grid">
                <AnimatePresence>
                  {showGuide&&(
                    <motion.div key="guide" className="guide-wrap" initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }}
                      style={{ position:'sticky', top:72 }}>
                      <GuideCard/>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={{ display:'flex', flexDirection:'column', gap:20, minWidth:0 }}>
                  {/* Photo */}
                  <div className="card-pad" style={{ background:'var(--card)', border:'1px solid var(--border)',
                    borderRadius:18, padding:20, backdropFilter:'blur(12px)', position:'relative' }}>
                    {isLocked&&(
                      <div style={{ position:'absolute', inset:0, borderRadius:18, zIndex:10,
                        background:'rgba(0,0,0,0.35)', display:'flex', alignItems:'center',
                        justifyContent:'center', backdropFilter:'blur(2px)' }}>
                        <Lock size={22} style={{ color:'#fff' }} />
                      </div>
                    )}
                    <p style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase',
                      letterSpacing:'0.07em', marginBottom:14, textAlign:'center' }}>ID Photo</p>
                    <PhotoUploadCrop
                      currentPhoto={profile?.photo_path}
                      accent={accent}
                      onComplete={(dataUrl, file)=>{ if(isLocked)return; setForm((p:any)=>({...p,photo_path:dataUrl})); setPendingPhoto(file); }}
                    />
                    <div style={{ marginTop:14, padding:'8px 12px', borderRadius:10,
                      background:`${accent}07`, border:`1px solid ${accent}15` }}>
                      <p style={{ fontSize:10, color:'var(--text3)', textAlign:'center', lineHeight:1.6 }}>
                        Upload a clear photo<br/>for your ID card
                      </p>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="card-pad" style={{ background:'var(--card)', border:'1px solid var(--border)',
                    borderRadius:18, padding:24, backdropFilter:'blur(12px)',
                    display:'flex', flexDirection:'column', gap:16 }}>

                    <div className="name-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      <Field label="First Name">
                        <input value={form.first_name||''} readOnly={isLocked}
                          onChange={e=>setForm((p:any)=>({...p,first_name:e.target.value}))}
                          onFocus={()=>!isLocked&&setFocused('first_name')} onBlur={()=>setFocused('')}
                          placeholder="JUAN" style={iStyle(focused,'first_name',isLocked,{textTransform:'uppercase'})} />
                      </Field>
                      <Field label="Last Name">
                        <input value={form.last_name||''} readOnly={isLocked}
                          onChange={e=>setForm((p:any)=>({...p,last_name:e.target.value}))}
                          onFocus={()=>!isLocked&&setFocused('last_name')} onBlur={()=>setFocused('')}
                          placeholder="DELA CRUZ" style={iStyle(focused,'last_name',isLocked,{textTransform:'uppercase'})} />
                      </Field>
                    </div>

                    <Field label="Middle Name (Optional)">
                      <input value={form.middle_name||''} readOnly={isLocked}
                        onChange={e=>{
                          const raw=e.target.value.toUpperCase().replace(/[^A-Z.]/g,'');
                          const cur=form.middle_name||'';
                          if(raw.length<cur.length){setForm((p:any)=>({...p,middle_name:raw}));return;}
                          if(cur.includes('.'))return;
                          const letter=raw.replace(/\./g,'');
                          if(letter.length===1){setForm((p:any)=>({...p,middle_name:letter+'.'}));return;}
                        }}
                        onFocus={()=>!isLocked&&setFocused('middle_name')} onBlur={()=>setFocused('')}
                        placeholder="B." style={iStyle(focused,'middle_name',isLocked)} />
                    </Field>

                    <Field label="Position">
                      <input value={form.position||''} readOnly={isLocked}
                        onChange={e=>setForm((p:any)=>({...p,position:e.target.value}))}
                        onFocus={()=>!isLocked&&setFocused('position')} onBlur={()=>setFocused('')}
                        placeholder="HELPER / JANITOR / GUARD" style={iStyle(focused,'position',isLocked,{textTransform:'uppercase'})} />
                    </Field>

                 

                    <Field label="Contact Number">
                      <input value={form.contact_number||''} readOnly={isLocked}
                        onChange={e=>setForm((p:any)=>({...p,contact_number:e.target.value}))}
                        onFocus={()=>!isLocked&&setFocused('contact_number')} onBlur={()=>setFocused('')}
                        placeholder="09XXXXXXXXX" maxLength={11} style={iStyle(focused,'contact_number',isLocked)} />
                      {form.contact_number&&!validate11(form.contact_number)&&(
                        <p style={{ fontSize:10, color:'#ef4444', marginTop:5 }}>Must be exactly 11 digits.</p>
                      )}
                    </Field>

                    <Field label="Full Address">
                      <textarea value={form.address||''} readOnly={isLocked}
                        onChange={e=>setForm((p:any)=>({...p,address:e.target.value.toUpperCase()}))}
                        onFocus={()=>!isLocked&&setFocused('address')} onBlur={()=>setFocused('')}
                        placeholder="B1 L1, SOUTHVILLE 8C, PHASE 1N, SAN ISIDRO, RODRIGUEZ, RIZAL"
                        rows={2} style={{ ...iStyle(focused,'address',isLocked), resize:'vertical', minHeight:70, textTransform:'uppercase' }} />
                    </Field>

                    {!isLocked&&(
                      <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                        onClick={()=>{ setTriedConfirm(false); setModal('warning'); }}
                        disabled={saving}
                        style={{ padding:'13px', border:'none', borderRadius:13, fontSize:14, fontWeight:700,
                          cursor:saving?'not-allowed':'pointer',
                          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                          transition:'all 0.2s',
                          background:saved?'linear-gradient(135deg,#22c55e,#16a34a)':`linear-gradient(135deg,${accent},#0d9488)`,
                          color:'#fff', boxShadow:saved?'0 6px 24px rgba(34,197,94,0.35)':`0 6px 24px ${glow}` }}>
                        {saving
                          ? <><motion.div animate={{ rotate:360 }} transition={{ duration:0.7,repeat:Infinity,ease:'linear' }}
                              style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%' }}/> Saving…</>
                          : saved ? <><CheckCircle size={16}/> Saved!</>
                          : <><Save size={16}/> Submit Profile</>}
                      </motion.button>
                    )}
                    {isLocked&&(
                      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        <div style={{ padding:'13px', borderRadius:13, fontSize:14, fontWeight:700,
                          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                          background:'var(--bg2)', border:'1.5px solid var(--border)', color:'var(--text3)' }}>
                          <Lock size={15}/> Profile Submitted — Waiting for ID
                        </div>
                        {editRequested ? (
                          <div style={{ padding:'11px 14px', borderRadius:12, fontSize:12, fontWeight:600,
                            background:`${accent}0c`, border:`1px solid ${accent}30`, color:accent,
                            display:'flex', alignItems:'center', gap:8, textAlign:'center', justifyContent:'center' }}>
                            <Clock size={14}/> Edit request sent — waiting for admin approval
                          </div>
                        ) : (
                          <button onClick={()=>{ setEditFields([]); setEditNote(''); setModal('editRequest'); }}
                            style={{ padding:'11px', borderRadius:12, fontSize:12.5, fontWeight:700, cursor:'pointer',
                              background:'transparent', border:'1.5px dashed var(--border2)', color:'var(--text2)' }}>
                            Need to correct something? Request an edit
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {tab==='notifications'&&(
            <motion.div key="notifs" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}>
              <div style={{ borderRadius:18, border:'1px solid var(--border)', background:'var(--card)',
                backdropFilter:'blur(12px)', overflow:'hidden' }}>
                <div className="notif-header" style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)',
                  display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, flexWrap:'wrap' }}>
                  <p style={{ fontSize:14, fontWeight:800, color:'var(--text)' }}>Notifications</p>
                  {unread>0&&<button onClick={markAllRead}
                    style={{ fontSize:12, fontWeight:700, color:accent, background:`${accent}10`,
                      border:'none', borderRadius:8, padding:'5px 12px', cursor:'pointer' }}>
                    Mark all as read
                  </button>}
                </div>
                {notifs.length===0?(
                  <div style={{ padding:48, textAlign:'center' }}>
                    <BellOff size={32} style={{ color:'var(--text3)', margin:'0 auto 12px', display:'block' }} />
                    <p style={{ color:'var(--text2)', fontSize:14, fontWeight:600 }}>No notifications yet</p>
                    <p style={{ color:'var(--text3)', fontSize:12, marginTop:4 }}>You'll be notified when your ID is ready.</p>
                  </div>
                ):notifs.map(n=>(
                  <motion.div key={n.id} whileHover={{ backgroundColor:'var(--bg2)' }}
                    onClick={()=>!n.is_read&&markRead(n.id)}
                    style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', cursor:'pointer',
                      background:n.is_read?'transparent':`${accent}06`, transition:'background 0.15s',
                      borderLeft:n.is_read?'none':`3px solid ${accent}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <p style={{ fontSize:13, fontWeight:n.is_read?400:700, color:'var(--text)' }}>{n.title||'Notification'}</p>
                      <span style={{ fontSize:10, color:'var(--text3)', whiteSpace:'nowrap', marginLeft:12 }}>
                        {new Date(n.created_at).toLocaleDateString('en-PH')}
                      </span>
                    </div>
                    <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>{n.message}</p>
                    {!n.is_read&&<span style={{ fontSize:10, fontWeight:700, color:accent, marginTop:4, display:'block' }}>Tap to mark as read</span>}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {modal&&(
          <motion.div className="modal-overlay" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.72)',
              display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>

            {modal==='warning'&&(
              <motion.div className="modal-card" initial={{ scale:0.9, y:16 }} animate={{ scale:1, y:0 }} exit={{ scale:0.94, opacity:0 }}
                transition={{ type:'spring', stiffness:420, damping:30 }}
                style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:22,
                  width:'100%', maxWidth:420, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 40px 80px rgba(0,0,0,0.5)' }}>
                <div className="modal-head" style={{ padding:'28px 24px 20px', textAlign:'center',
                  background:'linear-gradient(180deg,rgba(239,68,68,0.06) 0%,transparent 100%)' }}>
                  <div style={{ width:56, height:56, borderRadius:18, margin:'0 auto 16px',
                    background:'linear-gradient(135deg,#ef4444,#dc2626)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow:'0 8px 24px rgba(239,68,68,0.4)' }}>
                    <AlertCircle size={26} style={{ color:'#fff' }} />
                  </div>
                  <p style={{ fontSize:18, fontWeight:800, color:'var(--text)', marginBottom:10 }}>Read this before submitting</p>
                  <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>
                    Once submitted, <strong style={{ color:'var(--text)' }}>you can no longer edit your info.</strong><br/>
                    Details will be printed on your school ID for the whole year.
                  </p>
                </div>
                <div className="modal-body" style={{ padding:'0 24px 20px', display:'flex', flexDirection:'column', gap:8 }}>
                  {['Your full name is spelled correctly','Your photo is clear and presentable',
                    'Your position is correct','Your address is complete and in UPPERCASE',
                    'Your contact number is correct (11 digits)'].map((item,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:10,
                      background:'rgba(239,68,68,0.05)', border:'1px solid rgba(239,68,68,0.15)' }}>
                      <div style={{ width:20, height:20, borderRadius:6, flexShrink:0,
                        background:'rgba(239,68,68,0.12)', border:'1.5px solid rgba(239,68,68,0.3)',
                        display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <span style={{ fontSize:10, fontWeight:800, color:'#ef4444' }}>!</span>
                      </div>
                      <p style={{ fontSize:13, color:'var(--text)', lineHeight:1.4 }}>{item}</p>
                    </div>
                  ))}
                </div>
                <div className="modal-actions" style={{ padding:'0 24px 24px', display:'flex', gap:10 }}>
                  <button onClick={()=>setModal(null)}
                    style={{ flex:1, padding:12, borderRadius:12, fontSize:13, fontWeight:700,
                      background:'var(--input-bg)', border:'1px solid var(--border)', cursor:'pointer',
                      color:'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <X size={14}/> Go Back
                  </button>
                  <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                    onClick={()=>{ setTriedConfirm(false); setModal('review'); }}
                    style={{ flex:2, padding:12, borderRadius:12, fontSize:13, fontWeight:700,
                      border:'none', cursor:'pointer', background:`linear-gradient(135deg,${accent},#0d9488)`,
                      color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                      boxShadow:`0 6px 20px ${accent}40` }}>
                    <Check size={14}/> I understand, continue
                  </motion.button>
                </div>
              </motion.div>
            )}

            {modal==='review'&&(
              <motion.div className="modal-card" initial={{ scale:0.9, y:16 }} animate={{ scale:1, y:0 }} exit={{ scale:0.94, opacity:0 }}
                transition={{ type:'spring', stiffness:420, damping:30 }}
                style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:22,
                  width:'100%', maxWidth:460, overflow:'hidden', boxShadow:'0 40px 80px rgba(0,0,0,0.5)',
                  maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
                <div className="modal-head" style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--border)',
                  background:`linear-gradient(135deg,${accent}10,transparent)`, flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                    <div style={{ width:32, height:32, borderRadius:9,
                      background:`linear-gradient(135deg,${accent},#0d9488)`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      boxShadow:`0 4px 12px ${accent}40` }}>
                      <Check size={16} style={{ color:'#fff' }} />
                    </div>
                    <p style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>Review your info</p>
                  </div>
                  <p style={{ fontSize:12, color:'var(--text3)' }}>
                    Make sure everything is correct.{' '}
                    {triedConfirm&&!allValid&&<span style={{ color:'#ef4444', fontWeight:700 }}>Fix the red items first.</span>}
                  </p>
                </div>
                <div className="modal-body" style={{ padding:'14px 20px', display:'flex', flexDirection:'column', gap:8, overflowY:'auto' }}>
                  {validItems.map(item=>{
                    const showErr = triedConfirm&&!item.valid;
                    return (
                      <motion.div key={item.key}
                        animate={showErr?{x:[0,-6,6,-4,4,0]}:{}} transition={{ duration:0.35 }}
                        style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'11px 13px', borderRadius:12,
                          border:`1.5px solid ${showErr?'#ef4444':item.valid?'#22c55e60':'var(--border2)'}`,
                          background:showErr?'rgba(239,68,68,0.07)':item.valid?'rgba(34,197,94,0.05)':'var(--input-bg)',
                          transition:'all 0.2s' }}>
                        <div style={{ width:20, height:20, borderRadius:6, flexShrink:0, marginTop:2,
                          background:showErr?'#ef4444':item.valid?'#22c55e':'var(--border2)',
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {showErr?<X size={11} style={{ color:'#fff' }}/>:item.valid?<Check size={11} style={{ color:'#fff' }}/>:null}
                        </div>
                        <div style={{ minWidth:0, flex:1 }}>
                          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:2,
                            color:showErr?'#ef4444':'var(--text2)' }}>{item.label}</p>
                          <p style={{ fontSize:13, color:item.valid?'var(--text)':showErr?'#ef4444':'var(--text3)',
                            fontStyle:item.valid?'normal':'italic', wordBreak:'break-word' }}>
                            {item.valid ? (item.value || '✓ Filled in') : showErr?`⚠ ${item.hint}`:'Not filled in yet'}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div style={{ padding:'9px 12px', borderRadius:10, textAlign:'center',
                    background:allValid?'rgba(34,197,94,0.08)':triedConfirm?'rgba(239,68,68,0.07)':'var(--input-bg)',
                    border:`1px solid ${allValid?'#22c55e40':triedConfirm?'#ef444430':'var(--border2)'}`,
                    transition:'all 0.25s' }}>
                    <p style={{ fontSize:12, fontWeight:700,
                      color:allValid?'#22c55e':triedConfirm?'#ef4444':'var(--text3)' }}>
                      {allValid?'✓ All complete — ready to submit!':triedConfirm?`${invalidCount} item${invalidCount>1?'s':''} missing`:`${validItems.filter(v=>v.valid).length} / ${validItems.length} complete`}
                    </p>
                  </div>
                </div>
                <div className="modal-actions" style={{ padding:'0 20px 20px', display:'flex', gap:10, flexShrink:0 }}>
                  <button onClick={()=>!saving&&setModal('warning')} disabled={saving}
                    style={{ flex:1, padding:12, borderRadius:12, fontSize:13, fontWeight:700,
                      background:'var(--input-bg)', border:'1px solid var(--border)', cursor:saving?'not-allowed':'pointer',
                      opacity:saving?0.5:1,
                      color:'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <X size={14}/> Go Back
                  </button>
                  <motion.button
                    whileHover={allValid&&!saving?{scale:1.02,y:-1}:{}}
                    whileTap={allValid&&!saving?{scale:0.97}:{}}
                    disabled={saving}
                    onClick={async()=>{ if(saving)return; if(!allValid){setTriedConfirm(true);return;} await saveProfile(); setModal(null); }}
                    style={{ flex:2, padding:12, borderRadius:12, fontSize:13, fontWeight:700,
                      border:'none', cursor:saving?'not-allowed':'pointer', transition:'all 0.2s',
                      opacity:saving?0.75:1,
                      background:allValid?`linear-gradient(135deg,${accent},#0d9488)`:triedConfirm?'linear-gradient(135deg,#ef4444,#dc2626)':`linear-gradient(135deg,${accent}70,#0d948870)`,
                      color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                      boxShadow:allValid?`0 6px 20px ${accent}40`:triedConfirm?'0 6px 20px rgba(239,68,68,0.3)':'none' }}>
                    {saving
                      ? <><motion.div animate={{ rotate:360 }} transition={{ duration:0.7,repeat:Infinity,ease:'linear' }}
                          style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%' }}/> Submitting…</>
                      : allValid?<><Check size={14}/> Submit Now</>:triedConfirm?<><AlertCircle size={14}/> Fix missing fields</>:<><Check size={14}/> Confirm &amp; Submit</>}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {modal==='editRequest'&&(
              <motion.div className="modal-card" initial={{ scale:0.9, y:16 }} animate={{ scale:1, y:0 }} exit={{ scale:0.94, opacity:0 }}
                transition={{ type:'spring', stiffness:420, damping:30 }}
                style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:22,
                  width:'100%', maxWidth:460, overflow:'hidden', boxShadow:'0 40px 80px rgba(0,0,0,0.5)',
                  maxHeight:'90vh', display:'flex', flexDirection:'column' }}>
                <div className="modal-head" style={{ padding:'18px 20px 14px', borderBottom:'1px solid var(--border)',
                  background:`linear-gradient(135deg,${accent}10,transparent)`, flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
                    <div style={{ width:32, height:32, borderRadius:9,
                      background:`linear-gradient(135deg,${accent},#0d9488)`,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      boxShadow:`0 4px 12px ${accent}40` }}>
                      <AlertCircle size={16} style={{ color:'#fff' }} />
                    </div>
                    <p style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>Request an edit</p>
                  </div>
                  <p style={{ fontSize:12, color:'var(--text3)' }}>
                    Your submitted info is shown below. Tick only the field(s) that need correction — the admin will unlock just those.
                  </p>
                </div>
                <div className="modal-body" style={{ padding:'14px 20px', display:'flex', flexDirection:'column', gap:8, overflowY:'auto' }}>
                  {validItems.filter(i=>i.key!=='photo').map(item=>{
                    const checked = editFields.includes(item.key);
                    return (
                      <label key={item.key} onClick={()=>setEditFields(p=>checked?p.filter(k=>k!==item.key):[...p,item.key])}
                        style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'11px 13px', borderRadius:12, cursor:'pointer',
                          border:`1.5px solid ${checked?accent:'var(--border2)'}`,
                          background:checked?`${accent}0c`:'var(--input-bg)', transition:'all 0.2s' }}>
                        <div style={{ width:20, height:20, borderRadius:6, flexShrink:0, marginTop:1,
                          background:checked?accent:'transparent', border:`1.5px solid ${checked?accent:'var(--border2)'}`,
                          display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {checked&&<Check size={12} style={{ color:'#fff' }}/>}
                        </div>
                        <div style={{ minWidth:0, flex:1 }}>
                          <p style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em',
                            marginBottom:2, color:'var(--text2)' }}>{item.label}</p>
                          <p style={{ fontSize:13, color:'var(--text)', wordBreak:'break-word' }}>{item.value || '—'}</p>
                        </div>
                      </label>
                    );
                  })}
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--text3)', display:'block',
                      marginBottom:7, textTransform:'uppercase', letterSpacing:'0.06em' }}>What should it be? (optional note)</label>
                    <textarea value={editNote} onChange={e=>setEditNote(e.target.value)}
                      placeholder="e.g. Position should be COOK, not JANITOR"
                      rows={2} style={iStyle('', '', false, { resize:'vertical', minHeight:60 })} />
                  </div>
                </div>
                <div className="modal-actions" style={{ padding:'0 20px 20px', display:'flex', gap:10, flexShrink:0 }}>
                  <button onClick={()=>!sendingEdit&&setModal(null)} disabled={sendingEdit}
                    style={{ flex:1, padding:12, borderRadius:12, fontSize:13, fontWeight:700,
                      background:'var(--input-bg)', border:'1px solid var(--border)', cursor:sendingEdit?'not-allowed':'pointer',
                      opacity:sendingEdit?0.5:1,
                      color:'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <X size={14}/> Cancel
                  </button>
                  <motion.button
                    whileHover={editFields.length&&!sendingEdit?{scale:1.02,y:-1}:{}}
                    whileTap={editFields.length&&!sendingEdit?{scale:0.97}:{}}
                    disabled={sendingEdit||editFields.length===0}
                    onClick={sendEditRequest}
                    style={{ flex:2, padding:12, borderRadius:12, fontSize:13, fontWeight:700,
                      border:'none', cursor:(sendingEdit||editFields.length===0)?'not-allowed':'pointer', transition:'all 0.2s',
                      opacity:editFields.length===0?0.6:1,
                      background:`linear-gradient(135deg,${accent},#0d9488)`,
                      color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                      boxShadow:`0 6px 20px ${accent}40` }}>
                    {sendingEdit
                      ? <><motion.div animate={{ rotate:360 }} transition={{ duration:0.7,repeat:Infinity,ease:'linear' }}
                          style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%' }}/> Sending…</>
                      : <><Check size={14}/> Send Request{editFields.length>0?` (${editFields.length})`:''}</>}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 640px) {
          .fillup-grid { grid-template-columns: 1fr !important; }
          .guide-wrap { position: static !important; margin-bottom: 4px; }
          .page-wrap { padding: 14px !important; }
          .status-banner { padding: 12px 14px !important; }
          .staff-no { margin-left: 0 !important; text-align: left !important; width: 100%; }
          .tab-btn { flex-direction: column; gap: 3px !important; font-size: 10px !important; padding: 8px 4px !important; }
          .tab-btn-label { max-width: 100%; }
          .card-pad { padding: 14px !important; }
          .name-grid { grid-template-columns: 1fr !important; }
          .notif-header { padding: 12px 14px !important; }
          .modal-overlay { align-items: flex-end !important; padding: 0 !important; }
          .modal-card { max-width: 100% !important; width: 100% !important; border-radius: 20px 20px 0 0 !important; max-height: 85vh !important; }
          .modal-head { padding: 18px 16px 12px !important; }
          .modal-body { padding: 0 16px 14px !important; }
          .modal-actions { padding: 0 16px 16px !important; }
        }
        @media (max-width: 380px) {
          .tab-btn { font-size: 9px !important; }
        }
      `}</style>
    </div>
  );
}
