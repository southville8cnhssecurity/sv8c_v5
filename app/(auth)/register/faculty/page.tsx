'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, Upload, CheckCircle, ArrowLeft, Mail, Lock, Check, X } from 'lucide-react';

const DEPARTMENTS = ['MAPEH','Science','Math','English','Filipino','TLE','ICT','AP','Values Education'];
const font = 'Plus Jakarta Sans, Inter, system-ui, sans-serif';

export default function FacultyRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name:'', last_name:'', middle_name:'',
    subject:'', department:'', contact_number:'', address:'',
    email:'', password:'', confirm_password:'',
  });
  const [photo, setPhoto] = useState<File|null>(null);
  const [signature, setSignature] = useState<File|null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [sigPreview, setSigPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmChecks, setConfirmChecks] = useState([false, false, false, false]);

  const inputStyle = {
    width:'100%', padding:'10px 13px', border:'1.5px solid #F0E6D8',
    borderRadius:9, fontSize:13, outline:'none', fontFamily:font,
    background:'#fff', color:'#1C1917', transition:'all 0.2s',
  };
  const focusBlue = (e: any) => { e.target.style.borderColor='#2563EB'; e.target.style.boxShadow='0 0 0 3px rgba(37,99,235,0.1)'; };
  const blurReset = (e: any) => { e.target.style.borderColor='#F0E6D8'; e.target.style.boxShadow='none'; };

  function openConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm_password) { setError('Passwords do not match.'); return; }
    if (!form.email.endsWith('@gmail.com')) { setError('Please use a valid Gmail address (@gmail.com).'); return; }
    setError('');
    setConfirmChecks([false, false, false, false]);
    setShowConfirm(true);
  }

  async function handleSubmit() {
    setShowConfirm(false);
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k,v]) => k !== 'confirm_password' && fd.append(k, v));
      if (photo) fd.append('photo', photo);
      if (signature) fd.append('signature', signature);
      const res = await fetch('/api/faculty/register', { method:'POST', body:fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setDone(true);
    } catch(e:any) { setError(e.message); setLoading(false); }
  }

  if (done) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#FFF6F0', fontFamily:font }}>
      <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }}
        style={{ textAlign:'center', padding:40, background:'#fff', borderRadius:20,
          boxShadow:'0 8px 40px rgba(0,0,0,0.08)', maxWidth:400, width:'100%', margin:16 }}>
        <div style={{ width:64, height:64, borderRadius:'50%', background:'#EFF6FF',
          display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
          <CheckCircle size={32} style={{ color:'#2563EB' }} />
        </div>
        <h2 style={{ fontSize:20, fontWeight:800, color:'#1C1917', marginBottom:8 }}>Submitted Successfully!</h2>
        <p style={{ fontSize:13, color:'#78716C', lineHeight:1.6, marginBottom:8 }}>
          Your information has been submitted.
        </p>
        <p style={{ fontSize:13, color:'#F97316', fontWeight:600, marginBottom:24 }}>
          Please wait for the Admin to generate your ID card.
        </p>
        <button onClick={() => router.push('/login')}
          style={{ padding:'11px 24px', background:'linear-gradient(135deg, #2563EB, #1D4ED8)',
            color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:font }}>
          Back to Login
        </button>
      </motion.div>
    </div>
  );

  const allChecked = confirmChecks.every(Boolean);

  return (
    <div style={{ minHeight:'100vh', background:'#FFF6F0', fontFamily:font, padding:24 }}>
      <div style={{ maxWidth:660, margin:'0 auto' }}>
        <button onClick={() => router.push('/login')}
          style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none',
            cursor:'pointer', color:'#78716C', fontSize:13, marginBottom:20 }}>
          <ArrowLeft size={15} /> Back to Login
        </button>

        <div style={{ background:'#fff', borderRadius:20, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,0.06)' }}>
          {/* Header */}
          <div style={{ background:'linear-gradient(135deg, #0F172A, #1E3A5F)',
            padding:'20px 28px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:12,
              background:'linear-gradient(135deg, #2563EB, #1D4ED8)',
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <GraduationCap size={22} style={{ color:'#fff' }} />
            </div>
            <div>
              <h1 style={{ color:'#F8FAFC', fontSize:18, fontWeight:800 }}>Faculty Registration</h1>
              <p style={{ color:'#94A3B8', fontSize:12 }}>South Ville 8C National High School</p>
            </div>
          </div>

          <form onSubmit={openConfirm} style={{ padding:28 }}>
            {error && (
              <div style={{ background:'#FEF2F2', border:'1px solid #FECACA', borderRadius:10,
                padding:'10px 14px', marginBottom:20, color:'#DC2626', fontSize:13 }}>{error}</div>
            )}

            {/* Section 1: Personal Info */}
            <p style={{ fontSize:11, fontWeight:800, color:'#57534E', textTransform:'uppercase',
              letterSpacing:'0.07em', marginBottom:14 }}>Personal Information</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              {[['First Name','first_name',true],['Last Name','last_name',true],
                ['Middle Name','middle_name',false],['Subject','subject',true]].map(([label,key,req]) => (
                <div key={key as string}>
                  <label style={{ fontSize:11, fontWeight:600, color:'#57534E', display:'block', marginBottom:5 }}>
                    {label as string}{req ? ' *' : ''}
                  </label>
                  <input value={form[key as keyof typeof form]}
                    onChange={e=>setForm(p=>({...p,[key as string]:e.target.value}))}
                    required={req as boolean} style={inputStyle} onFocus={focusBlue} onBlur={blurReset} />
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'#57534E', display:'block', marginBottom:5 }}>Department *</label>
                <select value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}
                  required style={{ ...inputStyle, cursor:'pointer' }}>
                  <option value="">Select department...</option>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, fontWeight:600, color:'#57534E', display:'block', marginBottom:5 }}>Contact Number</label>
                <input value={form.contact_number} onChange={e=>setForm(p=>({...p,contact_number:e.target.value}))}
                  placeholder="09XXXXXXXXX" style={inputStyle} onFocus={focusBlue} onBlur={blurReset} />
              </div>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:600, color:'#57534E', display:'block', marginBottom:5 }}>Address</label>
              <textarea value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))}
                rows={2} placeholder="Complete address"
                style={{ ...inputStyle, resize:'vertical' }} onFocus={focusBlue} onBlur={blurReset} />
            </div>

            {/* Photo + Signature */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:20 }}>
              {[['Profile Photo','photo'],[' Signature','sig']].map(([label,key]) => (
                <div key={key}>
                  <label style={{ fontSize:11, fontWeight:600, color:'#57534E', display:'block', marginBottom:8 }}>{label}</label>
                  <label style={{ display:'block', cursor:'pointer' }}>
                    <div style={{ border:'2px dashed #D1D5DB', borderRadius:10, overflow:'hidden',
                      height:100, display:'flex', alignItems:'center', justifyContent:'center', background:'#F9FAFB',
                      transition:'all 0.2s' }}>
                      {(key==='photo'?photoPreview:sigPreview) ? (
                        <img src={key==='photo'?photoPreview:sigPreview}
                          style={{ width:'100%', height:'100%', objectFit:key==='photo'?'cover':'contain', padding:key==='sig'?8:0 }} />
                      ) : (
                        <div style={{ textAlign:'center' }}>
                          <Upload size={20} style={{ color:'#9CA3AF', margin:'0 auto 4px' }} />
                          <p style={{ fontSize:11, color:'#9CA3AF' }}>Click to upload</p>
                        </div>
                      )}
                    </div>
                    <input type="file" accept="image/*" style={{ display:'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0]; if (!file) return;
                        if (key==='photo') { setPhoto(file); setPhotoPreview(URL.createObjectURL(file)); }
                        else { setSignature(file); setSigPreview(URL.createObjectURL(file)); }
                      }} />
                  </label>
                </div>
              ))}
            </div>

            {/* Section 2: Gmail Account */}
            <div style={{ padding:'16px', background:'#EFF6FF', borderRadius:12,
              border:'1px solid #BFDBFE', marginBottom:20 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <Mail size={15} style={{ color:'#2563EB' }} />
                <p style={{ fontSize:11, fontWeight:800, color:'#1E40AF', textTransform:'uppercase', letterSpacing:'0.07em' }}>
                  Gmail Login Credentials
                </p>
              </div>
              <p style={{ fontSize:11, color:'#3B82F6', marginBottom:14 }}>
                Use your Gmail address. This will be your login email.
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:14 }}>
                <div>
                  <label style={{ fontSize:11, fontWeight:600, color:'#1E40AF', display:'block', marginBottom:5 }}>Gmail Address *</label>
                  <div style={{ position:'relative' }}>
                    <Mail size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#93C5FD' }} />
                    <input type="email" value={form.email}
                      onChange={e=>setForm(p=>({...p,email:e.target.value}))}
                      required placeholder="yourname@gmail.com"
                      style={{ ...inputStyle, paddingLeft:32, border:'1.5px solid #BFDBFE' }}
                      onFocus={e=>{e.target.style.borderColor='#2563EB';e.target.style.boxShadow='0 0 0 3px rgba(37,99,235,0.12)';}}
                      onBlur={blurReset} />
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                  {[['Password *','password','password'],['Confirm Password *','confirm_password','password']].map(([label,key,type]) => (
                    <div key={key}>
                      <label style={{ fontSize:11, fontWeight:600, color:'#1E40AF', display:'block', marginBottom:5 }}>{label}</label>
                      <div style={{ position:'relative' }}>
                        <Lock size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#93C5FD' }} />
                        <input type={type} value={form[key as keyof typeof form]}
                          onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}
                          required style={{ ...inputStyle, paddingLeft:32, border:'1.5px solid #BFDBFE' }}
                          onFocus={e=>{e.target.style.borderColor='#2563EB';e.target.style.boxShadow='0 0 0 3px rgba(37,99,235,0.12)';}}
                          onBlur={blurReset} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <motion.button type="submit" disabled={loading}
              whileHover={!loading?{scale:1.01}:{}} whileTap={!loading?{scale:0.99}:{}}
              style={{ width:'100%', padding:'13px',
                background:loading?'#CBD5E1':'linear-gradient(135deg, #2563EB, #1D4ED8)',
                color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700,
                cursor:loading?'not-allowed':'pointer', fontFamily:font,
                boxShadow:loading?'none':'0 4px 16px rgba(37,99,235,0.35)' }}>
              {loading ? 'Submitting...' : 'Submit Faculty Information'}
            </motion.button>
          </form>
        </div>
      </div>

      {/* ── CONFIRMATION MODAL ── */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.65)',
              display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
          >
            <motion.div
              initial={{ scale:0.9, y:16 }} animate={{ scale:1, y:0 }} exit={{ scale:0.94, y:8 }}
              transition={{ type:'spring', stiffness:420, damping:30 }}
              style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:22,
                width:'100%', maxWidth:440, overflow:'hidden',
                boxShadow:'0 40px 80px rgba(0,0,0,0.3)' }}
            >
              {/* Header */}
              <div style={{ padding:'18px 20px 16px', borderBottom:'1px solid #F1F5F9',
                background:'linear-gradient(135deg, rgba(37,99,235,0.07), transparent)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
                  <div style={{ width:32, height:32, borderRadius:9,
                    background:'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    boxShadow:'0 4px 12px rgba(37,99,235,0.4)' }}>
                    <Check size={16} style={{ color:'#fff' }} />
                  </div>
                  <p style={{ fontSize:16, fontWeight:800, color:'#1C1917' }}>I-double check ang impormasyon</p>
                </div>
                <p style={{ fontSize:12, color:'#78716C', lineHeight:1.5 }}>
                  I-check ang bawat item para kumpirmahin na tama ang lahat bago i-submit.
                </p>
              </div>

              {/* Checklist */}
              <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  {
                    label: 'Full Name',
                    value: [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ') || '—',
                  },
                  {
                    label: 'Subject & Department',
                    value: [form.subject, form.department].filter(Boolean).join(' · ') || 'Not entered',
                  },
                  {
                    label: 'Contact & Address',
                    value: `${form.contact_number || 'No number'} · ${form.address || 'No address'}`,
                  },
                  {
                    label: 'Gmail Address',
                    value: form.email || 'Not entered',
                  },
                ].map((item, i) => {
                  const checked = confirmChecks[i];
                  return (
                    <div key={i}
                      onClick={()=>setConfirmChecks(prev=>prev.map((v,idx)=>idx===i?!v:v))}
                      style={{ display:'flex', alignItems:'flex-start', gap:10,
                        padding:'11px 13px', borderRadius:12, cursor:'pointer',
                        border:`1.5px solid ${checked ? '#2563EB70' : '#E2E8F0'}`,
                        background: checked ? 'rgba(37,99,235,0.05)' : '#F8FAFC',
                        transition:'all 0.15s',
                        boxShadow: checked ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none' }}>
                      <div style={{ width:20, height:20, borderRadius:6, flexShrink:0, marginTop:1,
                        border:`2px solid ${checked ? '#2563EB' : '#CBD5E1'}`,
                        background: checked ? '#2563EB' : 'transparent',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'all 0.15s', boxShadow: checked ? '0 2px 8px rgba(37,99,235,0.4)' : 'none' }}>
                        {checked && <Check size={11} style={{ color:'#fff' }} />}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:700, color:'#64748B',
                          textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:3 }}>{item.label}</p>
                        <p style={{ fontSize:13, color:'#1C1917', wordBreak:'break-word', lineHeight:1.5 }}>{item.value}</p>
                      </div>
                    </div>
                  );
                })}

                <motion.p
                  animate={{ color: allChecked ? '#2563EB' : '#78716C' }}
                  style={{ fontSize:12, textAlign:'center', marginTop:4, fontWeight:700, transition:'color 0.2s' }}>
                  {allChecked
                    ? '✓ Lahat ay na-check na. Pwede nang i-submit!'
                    : `${confirmChecks.filter(Boolean).length}/4 na-check — i-check ang lahat para ma-enable ang submit.`}
                </motion.p>
              </div>

              {/* Footer */}
              <div style={{ padding:'0 20px 20px', display:'flex', gap:10 }}>
                <button onClick={()=>setShowConfirm(false)}
                  style={{ flex:1, padding:12, borderRadius:12, fontSize:13, fontWeight:700,
                    background:'#F8FAFC', border:'1px solid #E2E8F0', cursor:'pointer',
                    color:'#64748B', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <X size={14}/> Go back
                </button>
                <motion.button
                  whileHover={allChecked?{scale:1.02,y:-1}:{}}
                  whileTap={allChecked?{scale:0.97}:{}}
                  onClick={handleSubmit}
                  disabled={!allChecked}
                  style={{ flex:2, padding:12, borderRadius:12, fontSize:13, fontWeight:700, border:'none',
                    cursor: allChecked ? 'pointer' : 'not-allowed',
                    background: allChecked ? 'linear-gradient(135deg, #2563EB, #1D4ED8)' : '#E2E8F0',
                    color: allChecked ? '#fff' : '#94A3B8',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                    transition:'all 0.2s',
                    boxShadow: allChecked ? '0 6px 20px rgba(37,99,235,0.4)' : 'none' }}>
                  <Check size={14}/> Confirm & Submit
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
