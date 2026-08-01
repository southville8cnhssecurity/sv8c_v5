'use client';
import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/layout/Header';
import PrincipalSettings from '@/components/ids/PrincipalSettings';
import {
  Palette, Shield, Database, Bell, Check, Sun, Moon, Lock,
  School, Brush, GraduationCap, CreditCard, Type, Info,
  Users, BookOpen, Eye, LayoutGrid, UserCheck, KeyRound, Copy,
} from 'lucide-react';
import { useTheme } from '@/lib/theme';

const font = 'Inter, Plus Jakarta Sans, system-ui, sans-serif';

// ── Only these 3 hardcoded admin accounts may view/edit Settings
// (this includes the Principal Name / ID Card Settings section below,
// since it lives on this same page). Section-adviser accounts, even
// though they log in through the same Admin form, are blocked here. ──
const ALLOWED_ADMIN_IDS = ['superadmin', 'admin1', 'admin2'];

const PRESET_ACCENTS = [
  { hex:'#f97316', label:'Orange (Default)' },
  { hex:'#4f6ef7', label:'Royal Blue' },
  { hex:'#14b8a6', label:'Teal' },
  { hex:'#a855f7', label:'Purple' },
  { hex:'#ec4899', label:'Pink' },
  { hex:'#22c55e', label:'Green' },
  { hex:'#ef4444', label:'Red' },
  { hex:'#eab308', label:'Gold' },
];

const ID_LAYOUT_OPTIONS = [
  { id:'portrait', label:'Portrait', desc:'54mm × 86mm · Vertical', icon:'▯' },
  { id:'landscape', label:'Landscape', desc:'86mm × 54mm · Horizontal', icon:'▭' },
];

function Section({ children, title, subtitle, icon: Icon, color, gradient }:
  { children: React.ReactNode; title: string; subtitle?: string; icon: any; color: string; gradient: string }) {
  return (
    <div style={{ borderRadius:18, border:'1px solid var(--border)', background:'var(--card)',
      backdropFilter:'blur(16px)', overflow:'hidden', marginBottom:20 }}>
      <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)',
        display:'flex', alignItems:'center', gap:12,
        background:`linear-gradient(135deg,${gradient},transparent)` }}>
        <div style={{ width:38, height:38, borderRadius:11, background:color,
          display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:`0 4px 14px ${color.replace(')',',0.35)').replace('(','a(')}` }}>
          <Icon size={17} style={{ color:'#fff' }} />
        </div>
        <div>
          <h3 style={{ fontSize:14, fontWeight:800, color:'var(--text)' }}>{title}</h3>
          {subtitle && <p style={{ fontSize:11, color:'var(--text3)' }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ padding:22 }}>{children}</div>
    </div>
  );
}

// ── Section + Adviser are added together now — one section can never exist
// without an adviser attached, which is what lets the fillup form auto-fill
// the adviser safely once a section is picked. Adding/renaming either one
// also (re)generates that adviser's login account on the server — this
// form just collects plain text, no forced casing here. ──
function SectionAddInput({
  grade,
  onRequestAdd,
}: {
  grade: number;
  onRequestAdd: (grade: number, name: string, adviser: string) => void;
}) {
  const [name, setName] = React.useState('');
  const [adviser, setAdviser] = React.useState('');

  function submit() {
    const n = name.trim();
    const a = adviser.trim();
    if (!n || !a) return;
    onRequestAdd(grade, n, a);
    setName('');
    setAdviser('');
  }

  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
      <input value={name} onChange={e=>setName(e.target.value)}
        onKeyDown={e=>{ if(e.key==='Enter') submit(); }} placeholder="Section name"
        style={{ width:130, padding:'6px 10px', background:'var(--input-bg)', color:'var(--text)',
          border:'1px solid var(--border2)', borderRadius:8, fontSize:12,
          outline:'none', fontFamily:'inherit' }} />
      <input value={adviser} onChange={e=>setAdviser(e.target.value)}
        onKeyDown={e=>{ if(e.key==='Enter') submit(); }} placeholder="Adviser full name"
        style={{ width:170, padding:'6px 10px', background:'var(--input-bg)', color:'var(--text)',
          border:'1px solid var(--border2)', borderRadius:8, fontSize:12,
          outline:'none', fontFamily:'inherit' }} />
      <button onClick={submit} disabled={!name.trim() || !adviser.trim()}
        style={{ padding:'6px 12px', borderRadius:8, fontSize:12, fontWeight:700,
          background:'rgba(168,85,247,0.1)', border:'1px solid rgba(168,85,247,0.25)',
          color:'#a855f7', cursor: (!name.trim() || !adviser.trim()) ? 'not-allowed' : 'pointer',
          opacity: (!name.trim() || !adviser.trim()) ? 0.5 : 1 }}>
        + Add Section
      </button>
    </div>
  );
}

// ── Shows the generated adviser username/password ONCE, right after a
// section is created or renamed. The password is never shown again after
// this closes — copy it now and give it to the adviser. ──
function CredentialsRevealModal({
  username, password, onClose,
}: { username: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  function copyAll() {
    navigator.clipboard.writeText(`Username: ${username}\nPassword: ${password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:400,
        display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <motion.div initial={{ scale:0.94, y:14 }} animate={{ scale:1, y:0 }}
        style={{ background:'var(--card-solid)', borderRadius:18, padding:26, maxWidth:380, width:'100%',
          boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#4f6ef7,#3b5bdb)',
            display:'flex', alignItems:'center', justifyContent:'center' }}>
            <KeyRound size={17} style={{ color:'#fff' }} />
          </div>
          <h2 style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>Adviser Login Ready</h2>
        </div>
        <p style={{ fontSize:12, color:'var(--text3)', marginBottom:16 }}>
          Copy these and give them to the adviser now — this password will not be shown again after you close this window.
        </p>

        <div style={{ background:'var(--input-bg)', borderRadius:12, padding:14, marginBottom:16, fontFamily:'monospace' }}>
          <p style={{ fontSize:11, color:'var(--text3)', marginBottom:2 }}>USERNAME</p>
          <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:10, wordBreak:'break-word' }}>{username}</p>
          <p style={{ fontSize:11, color:'var(--text3)', marginBottom:2 }}>PASSWORD</p>
          <p style={{ fontSize:14, fontWeight:700, color:'var(--accent)' }}>{password}</p>
        </div>

        <p style={{ fontSize:11, color:'var(--text3)', marginBottom:16 }}>
          They log in through the same <strong>Admin</strong> sign-in form, using these credentials.
          Access is automatically limited to this section only.
        </p>

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={copyAll}
            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'11px',
              borderRadius:10, border:'1px solid var(--border2)', background:'var(--card)', color:'var(--text)',
              fontWeight:700, fontSize:13, cursor:'pointer' }}>
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Both</>}
          </button>
          <button onClick={onClose}
            style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background:'var(--royal)',
              color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // ── Access gate: only superadmin / admin1 / admin2 may view this page.
  // Anyone else (e.g. a section adviser account) gets bounced immediately. ──
  const currentId = (session?.user as any)?.username || (session?.user as any)?.id;
  const isAllowed = status === 'authenticated' && ALLOWED_ADMIN_IDS.includes(currentId);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    } else if (status === 'authenticated' && !isAllowed) {
      router.replace('/dashboard');
    }
  }, [status, isAllowed, router]);

  const {
    theme, setTheme,
    schoolName, setSchoolName,
    accentColor, setAccentColor,
    headerTitle: ctxHeaderTitle, setHeaderTitle: ctxSetHeaderTitle,
    facultyColor: ctxFacultyColor, setFacultyColor: ctxSetFacultyColor,
    staffColor: ctxStaffColor, setStaffColor: ctxSetStaffColor,
    studentColor: ctxStudentColor, setStudentColor: ctxSetStudentColor,
  } = useTheme();
  const [saved, setSaved] = useState(false);
  const [sections, setSections] = useState<Record<number,any[]>>({7:[],8:[],9:[],10:[]});
  const [sectionError, setSectionError] = useState('');
  const [editingSection, setEditingSection] = useState<{id:number; name:string; adviser:string}|null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [notifs, setNotifs] = useState(true);

  const [pendingSection, setPendingSection] = useState<{ grade: number; name: string; adviser: string } | null>(null);
  const [addingSection, setAddingSection] = useState(false);
  const [justAdded, setJustAdded] = useState<{ grade: number; name: string; adviser: string } | null>(null);

  // ── Generated adviser credentials, shown once right after a section is
  // created or renamed/re-advised. ──
  const [revealCreds, setRevealCreds] = useState<{ username: string; password: string } | null>(null);

  useEffect(() => {
    loadSections();
  }, []);

  async function loadSections() {
    const r = await fetch('/api/sections');
    setSections(await r.json());
  }

  function requestAddSection(gradeLevel: number, name: string, adviser: string) {
    setSectionError('');
    setPendingSection({ grade: gradeLevel, name, adviser });
  }

  async function confirmAddSection() {
    if (!pendingSection) return;
    const { grade, name, adviser } = pendingSection;
    setAddingSection(true);
    setSectionError('');
    try {
      const r = await fetch('/api/sections',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ grade_level:grade, name, class_adviser: adviser })
      });
      const d = await r.json();
      if (!r.ok) { setSectionError(d.error||'Failed to add section.'); setAddingSection(false); return; }
      await loadSections();
      setJustAdded({ grade, name, adviser });
      setTimeout(() => setJustAdded(null), 4500);
      setPendingSection(null);
      // ── Show the generated adviser username/password ONCE ──
      if (d.username && d.password) {
        setRevealCreds({ username: d.username, password: d.password });
      }
    } catch {
      setSectionError('Failed to add section. Please try again.');
    } finally {
      setAddingSection(false);
    }
  }

  async function saveSectionEdit() {
    if (!editingSection) return;
    const name = editingSection.name.trim();
    const adviser = editingSection.adviser.trim();
    if (!name || !adviser) {
      setSectionError('Section name and adviser cannot be empty.');
      return;
    }
    setSavingEdit(true);
    setSectionError('');
    try {
      const r = await fetch(`/api/sections/${editingSection.id}`,{
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ name, class_adviser: adviser })
      });
      const d = await r.json();
      if (!r.ok) { setSectionError(d.error||'Failed to save changes.'); setSavingEdit(false); return; }
      setEditingSection(null);
      await loadSections();
      // ── Renaming the section and/or adviser regenerates credentials —
      // show whichever came back (could be just username, just password,
      // or both, depending on what was changed). ──
      if (d.username || d.password) {
        setRevealCreds({
          username: d.username || editingSection.adviser.toUpperCase(),
          password: d.password || name.toUpperCase(),
        });
      }
    } catch {
      setSectionError('Failed to save changes. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteSection(id:number, name:string) {
    if (!confirm(`Delete section "${name}"? Any students currently assigned to it will have their section cleared.`)) return;
    const r = await fetch(`/api/sections/${id}`,{ method:'DELETE' });
    const d = await r.json();
    if (!r.ok) { setSectionError(d.error||'This section cannot be deleted.'); return; }
    loadSections();
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // ── Block rendering entirely until we've confirmed the logged-in
  // account is superadmin / admin1 / admin2. Prevents any flash of
  // settings content (including Principal Name) for other accounts. ──
  if (status === 'loading' || status === 'unauthenticated' || !isAllowed) {
    return (
      <div style={{ fontFamily:font, minHeight:'100vh', background:'var(--bg)',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ textAlign:'center' }}>
          <Lock size={32} style={{ color:'var(--text3)', margin:'0 auto 12px', display:'block' }} />
          <p style={{ fontSize:13, color:'var(--text3)', fontWeight:600 }}>
            {status === 'loading' ? 'Checking access…' : 'Restricted — redirecting…'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.3 }}
      style={{ fontFamily:font, minHeight:'100vh', background:'var(--bg)', transition:'background 0.35s' }}>
      <Header title="Settings" subtitle="System preferences, ID customization, and configuration" />
      <div style={{ padding:24, maxWidth:760 }}>

        {/* ── Appearance ── */}
        <Section title="Appearance" subtitle="Theme mode"
          icon={Palette} color="linear-gradient(135deg,#f97316,#ea580c)" gradient="rgba(249,115,22,0.08)">
          <p style={{ fontSize:11, fontWeight:700, color:'var(--text3)', textTransform:'uppercase',
            letterSpacing:'0.08em', marginBottom:12 }}>Theme Mode</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {[
              { v:'dark', lbl:'Dark Mode', icon:Moon, desc:'Easy on eyes (default)' },
              { v:'light', lbl:'Light Mode', icon:Sun, desc:'Clean and bright' },
            ].map(opt => {
              const active = theme === opt.v;
              return (
                <motion.button key={opt.v} whileHover={{ scale:1.02, y:-2 }} whileTap={{ scale:0.97 }}
                  onClick={()=>setTheme(opt.v as 'dark'|'light')}
                  style={{ padding:'20px 14px', borderRadius:16, cursor:'pointer', textAlign:'center',
                    background: active ? 'rgba(249,115,22,0.1)' : 'var(--input-bg)',
                    border: active ? '2px solid rgba(249,115,22,0.45)' : '1.5px solid var(--border)',
                    position:'relative', transition:'all 0.2s',
                    boxShadow: active ? '0 0 24px rgba(249,115,22,0.18)' : 'none' }}>
                  {active && (
                    <div style={{ position:'absolute', top:10, right:10, width:22, height:22, borderRadius:'50%',
                      background:'linear-gradient(135deg,var(--accent),#ea580c)',
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <Check size={12} style={{ color:'#fff' }} />
                    </div>
                  )}
                  <opt.icon size={28} style={{ color:active?'var(--accent)':'var(--text3)', margin:'0 auto 10px', display:'block' }} />
                  <p style={{ fontSize:14, fontWeight:700, color:active?'var(--text)':'var(--text3)' }}>{opt.lbl}</p>
                  <p style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>{opt.desc}</p>
                </motion.button>
              );
            })}
          </div>
        </Section>

        {/* ── Admin Accounts ── */}
        <Section title="Admin Accounts" subtitle="3 hardcoded accounts · All have equal full access"
          icon={Shield} color="linear-gradient(135deg,#4f6ef7,#3b5bdb)" gradient="rgba(79,110,247,0.08)">
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { id:'superadmin', name:'Principal', role:'Full Access' },
              { id:'admin1', name:'Administrator 1', role:'Full Access' },
              { id:'admin2', name:'Administrator 2', role:'Full Access' },
            ].map(a => (
              <motion.div key={a.id} whileHover={{ x:4 }}
                style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:13,
                  background:'var(--input-bg)', border:'1px solid var(--border)', transition:'all 0.2s' }}>
                <div style={{ width:40, height:40, borderRadius:11, flexShrink:0,
                  background:'linear-gradient(135deg,#4f6ef7,#3b5bdb)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:15, fontWeight:800, color:'#fff',
                  boxShadow:'0 4px 12px rgba(79,110,247,0.3)' }}>
                  {a.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>{a.name}</p>
                  <p style={{ fontSize:11, color:'var(--text3)', fontFamily:'monospace' }}>@{a.id}</p>
                </div>
                <span style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700,
                  background:'rgba(79,110,247,0.12)', color:'#4f6ef7',
                  border:'1px solid rgba(79,110,247,0.25)' }}>
                  {a.role}
                </span>
              </motion.div>
            ))}
          </div>
          <div style={{ marginTop:14, padding:'12px 14px', borderRadius:10,
            background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.15)',
            display:'flex', alignItems:'center', gap:8 }}>
            <Lock size={13} style={{ color:'#ef4444', flexShrink:0 }} />
            <p style={{ fontSize:11, color:'var(--text3)' }}>Admin passwords are confidential and stored securely in <code>.env.local</code>.</p>
          </div>
        </Section>

        {/* ── Notifications ── */}
        <div style={{ borderRadius:18, border:'1px solid var(--border)', background:'var(--card)',
          backdropFilter:'blur(16px)', overflow:'hidden', marginBottom:20 }}>
          <div style={{ padding:'16px 22px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,#f59e0b,#d97706)',
                display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Bell size={17} style={{ color:'#fff' }} />
              </div>
              <div>
                <p style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>Notifications</p>
                <p style={{ fontSize:11, color:'var(--text3)' }}>ID ready + approval alerts to faculty/staff/students</p>
              </div>
            </div>
            <motion.button whileTap={{ scale:0.9 }} onClick={()=>setNotifs(!notifs)}
              style={{ width:50, height:28, borderRadius:14, border:'none', cursor:'pointer',
                background: notifs ? 'linear-gradient(135deg,var(--accent),#ea580c)' : 'var(--input-bg)',
                position:'relative', transition:'all 0.3s', flexShrink:0,
                boxShadow: notifs ? '0 4px 12px var(--glow-accent)' : 'none',
                outline: notifs ? 'none' : '1px solid var(--border2)' } as React.CSSProperties}>
              <motion.div animate={{ x: notifs ? 22 : 2 }} transition={{ type:'spring', stiffness:500, damping:30 }}
                style={{ position:'absolute', top:3, width:22, height:22, borderRadius:'50%',
                  background:'#fff', boxShadow:'0 2px 6px rgba(0,0,0,0.3)' }} />
            </motion.button>
          </div>
        </div>

        {/* ── Sections & Advisers ── */}
        <div style={{ borderRadius:18, border:'1px solid var(--border)', background:'var(--card)',
          backdropFilter:'blur(16px)', overflow:'hidden', marginBottom:20 }}>
          <div style={{ padding:'16px 22px', borderBottom:'1px solid var(--border)',
            display:'flex', alignItems:'center', gap:12,
            background:'linear-gradient(135deg,rgba(168,85,247,0.08),transparent)' }}>
            <div style={{ width:38, height:38, borderRadius:11, background:'linear-gradient(135deg,#a855f7,#9333ea)',
              display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(168,85,247,0.35)' }}>
              <GraduationCap size={17} style={{ color:'#fff' }} />
            </div>
            <div>
              <h3 style={{ fontSize:14, fontWeight:800, color:'var(--text)' }}>Grade, Section & Adviser Management</h3>
              <p style={{ fontSize:11, color:'var(--text3)' }}>
                Every section must have exactly one adviser. Adding or renaming either one creates or
                updates that adviser's own login automatically — they sign in through the same Admin
                form and only ever see this section.
              </p>
            </div>
          </div>
          <div style={{ padding:22 }}>
            {sectionError && (
              <div style={{ marginBottom:14, padding:'10px 14px', borderRadius:10,
                background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
                fontSize:12, color:'#ef4444' }}>{sectionError}</div>
            )}

            <AnimatePresence>
              {justAdded && (
                <motion.div
                  initial={{ opacity:0, height:0, marginBottom:0 }}
                  animate={{ opacity:1, height:'auto', marginBottom:14 }}
                  exit={{ opacity:0, height:0, marginBottom:0 }}
                  style={{ padding:'10px 14px', borderRadius:10,
                    background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.25)',
                    fontSize:12, color:'#15803d', display:'flex', alignItems:'center', gap:8, overflow:'hidden' }}>
                  <Check size={14} style={{ flexShrink:0 }} />
                  <span>
                    <strong>Section "{justAdded.name}"</strong> was added to <strong>Grade {justAdded.grade}</strong> with{' '}
                    <strong>{justAdded.adviser}</strong> as adviser.
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {[7,8,9,10].map(grade => (
              <div key={grade} style={{ marginBottom:grade<10?20:0 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                  <p style={{ fontSize:12, fontWeight:800, color:'var(--text)' }}>Grade {grade}</p>
                  <span style={{ fontSize:10, color:'var(--text3)', fontWeight:600 }}>
                    {(sections[grade]||[]).length} section{(sections[grade]||[]).length!==1?'s':''} saved
                  </span>
                </div>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginTop:6 }}>
                  {(sections[grade]||[]).map((sec:any) => (
                    <div key={sec.id} style={{ display:'flex', flexDirection:'column', gap:4, padding:'8px 10px',
                      borderRadius:10, background:'rgba(168,85,247,0.1)', border:'1.5px solid rgba(168,85,247,0.25)',
                      minWidth: editingSection?.id===sec.id ? 220 : undefined }}>
                      {editingSection && editingSection.id===sec.id ? (
                        <>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontSize:10, color:'var(--text3)', width:46 }}>Section</span>
                            <input autoFocus value={editingSection.name}
                              onChange={e=>setEditingSection({...editingSection, name:e.target.value})}
                              onKeyDown={e=>{ if(e.key==='Enter') saveSectionEdit(); if(e.key==='Escape') setEditingSection(null); }}
                              style={{ flex:1, padding:'2px 6px', fontSize:12, fontWeight:700, background:'var(--input-bg)',
                                color:'var(--text)', border:'1px solid rgba(168,85,247,0.5)', borderRadius:6, outline:'none',
                                fontFamily:'inherit' }}/>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontSize:10, color:'var(--text3)', width:46 }}>Adviser</span>
                            <input value={editingSection.adviser}
                              onChange={e=>setEditingSection({...editingSection, adviser:e.target.value})}
                              onKeyDown={e=>{ if(e.key==='Enter') saveSectionEdit(); if(e.key==='Escape') setEditingSection(null); }}
                              style={{ flex:1, padding:'2px 6px', fontSize:12, fontWeight:600, background:'var(--input-bg)',
                                color:'var(--text)', border:'1px solid rgba(168,85,247,0.5)', borderRadius:6, outline:'none',
                                fontFamily:'inherit' }}/>
                          </div>
                          <div style={{ display:'flex', gap:6, justifyContent:'flex-end', marginTop:2 }}>
                            <button onClick={()=>setEditingSection(null)} disabled={savingEdit}
                              style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', fontSize:11, fontWeight:700 }}>
                              Cancel
                            </button>
                            <button onClick={saveSectionEdit} disabled={savingEdit}
                              style={{ background:'none', border:'none', cursor:'pointer', color:'#22c55e', fontSize:11, fontWeight:700 }}>
                              {savingEdit ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span style={{ fontSize:13, fontWeight:700, color:'#a855f7' }}>{sec.name}</span>
                            <button onClick={()=>setEditingSection({id:sec.id, name:sec.name, adviser:sec.class_adviser||''})}
                              style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(168,85,247,0.6)', padding:0, fontSize:11 }}>✎</button>
                            <button onClick={()=>deleteSection(sec.id,sec.name)}
                              style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(239,68,68,0.5)', padding:0, fontSize:12, lineHeight:1 }}>×</button>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                            <UserCheck size={10} style={{ color:'var(--text3)', flexShrink:0 }} />
                            <span style={{ fontSize:10.5, color:'var(--text3)' }}>
                              {sec.class_adviser ? sec.class_adviser : <em>No adviser set</em>}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  <SectionAddInput grade={grade} onRequestAdd={requestAddSection} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── ID Card Settings (Principal Name, School Year) ── */}
        <Section title="ID Card Settings" subtitle="Principal name and school year shown on printed ID cards"
          icon={CreditCard} color="linear-gradient(135deg,#1a3a6b,#2563EB)" gradient="rgba(26,58,107,0.08)">
          <PrincipalSettings />
        </Section>

        {/* ── System Info ── */}
        <Section title="System Information" icon={Database}
          color="linear-gradient(135deg,#14b8a6,#0d9488)" gradient="rgba(20,184,166,0.08)">
          <div>
            {[
              ['System','SV8C ID Management System v2.0'],
              ['Version','v2.0.0'],
              ['Stack','Next.js 15 · TypeScript · MySQL (XAMPP)'],
              ['Auth','Gmail login · NextAuth.js · bcrypt'],
              ['QR Format','SV8CNHS-{FAC/STF/STU}-{000000}'],
              ['UID Format','12-char alphanumeric'],
              ['Print Layout','8 IDs per A4 (4 persons × front+back)'],
              ['Access PIN','Required before login portal'],
            ].map(([lbl,val],i,arr) => (
              <div key={lbl} style={{ display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 0', borderBottom:i<arr.length-1?'1px solid var(--border)':'none' }}>
                <p style={{ fontSize:12, color:'var(--text3)', fontWeight:500 }}>{lbl}</p>
                <p style={{ fontSize:12, color:'var(--text)', fontWeight:700, textAlign:'right', maxWidth:320,
                  fontFamily:['QR Format','UID Format','Version'].includes(lbl)?'monospace':'inherit' }}>{val}</p>
              </div>
            ))}
          </div>
        </Section>

      </div>

      {/* Save button */}
      <div style={{ position:'sticky', bottom:0, zIndex:20, padding:'12px 24px 20px',
        background:'linear-gradient(to top, var(--bg) 75%, transparent)',
        borderTop:'1px solid var(--border)' }}>
        <motion.button whileHover={{ scale:1.01, y:-1 }} whileTap={{ scale:0.98 }}
          onClick={handleSave}
          style={{ width:'100%', maxWidth:760, margin:'0 auto', display:'flex',
            padding:'15px', border:'none', borderRadius:14, fontSize:15, fontWeight:700,
            cursor:'pointer', alignItems:'center', justifyContent:'center', gap:8,
            background: saved ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,var(--accent),#ea580c)',
            color:'#fff', transition:'all 0.3s',
            boxShadow: saved ? '0 6px 24px rgba(34,197,94,0.35)' : '0 6px 24px var(--glow-accent)' }}>
          {saved ? <><Check size={17}/> All Settings Saved!</> : <>💾 Save All Settings</>}
        </motion.button>
      </div>

      {/* ── Confirm-before-add modal for Section + Adviser ── */}
      <AnimatePresence>
        {pendingSection && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={()=>!addingSection && setPendingSection(null)}
            style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(0,0,0,0.55)',
              display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <motion.div
              initial={{ scale:0.92, y:14 }} animate={{ scale:1, y:0 }} exit={{ scale:0.94, y:8 }}
              transition={{ type:'spring', stiffness:420, damping:30 }}
              onClick={e=>e.stopPropagation()}
              style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16,
                padding:'22px 24px', maxWidth:380, width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.4)' }}>
              <h4 style={{ margin:'0 0 6px', fontSize:15, fontWeight:800, color:'var(--text)' }}>
                Confirm New Section & Adviser
              </h4>
              <p style={{ margin:'0 0 16px', fontSize:12.5, color:'var(--text3)', lineHeight:1.5 }}>
                This will save the Section + Adviser pair AND create that adviser's own login —
                you'll see the username and password right after confirming.
              </p>
              <div style={{ background:'var(--input-bg)', border:'1px solid var(--border)', borderRadius:10,
                padding:'12px 14px', marginBottom:18, fontSize:13 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ color:'var(--text3)' }}>Grade Level:</span>
                  <strong style={{ color:'var(--text)' }}>Grade {pendingSection.grade}</strong>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ color:'var(--text3)' }}>Section:</span>
                  <strong style={{ color:'#a855f7' }}>{pendingSection.name}</strong>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ color:'var(--text3)' }}>Adviser:</span>
                  <strong style={{ color:'var(--text)' }}>{pendingSection.adviser}</strong>
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={()=>setPendingSection(null)} disabled={addingSection}
                  style={{ flex:1, padding:'10px', borderRadius:9, border:'1px solid var(--border)',
                    background:'var(--input-bg)', color:'var(--text2)', fontSize:13, fontWeight:600,
                    cursor:addingSection?'not-allowed':'pointer' }}>
                  Cancel
                </button>
                <button onClick={confirmAddSection} disabled={addingSection}
                  style={{ flex:1, padding:'10px', borderRadius:9, border:'none',
                    background: addingSection ? 'var(--border)' : 'linear-gradient(135deg,#a855f7,#9333ea)',
                    color:'#fff', fontSize:13, fontWeight:700,
                    cursor:addingSection?'not-allowed':'pointer' }}>
                  {addingSection ? 'Adding…' : 'Confirm & Add'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Generated adviser username/password — shown once ── */}
      <AnimatePresence>
        {revealCreds && (
          <CredentialsRevealModal
            username={revealCreds.username}
            password={revealCreds.password}
            onClose={() => setRevealCreds(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}