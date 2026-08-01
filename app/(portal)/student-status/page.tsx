'use client';
import { useEffect, useRef, useState } from 'react';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/lib/theme';
import PhotoUploadCrop from '@/components/ui/PhotoUploadCrop';
import {
  User, Save, LogOut, CheckCircle, Clock, XCircle,
  Bell, Sun, Moon, BellOff, ChevronDown, Check, X, AlertCircle, Lock,
  BookOpen, Eye, EyeOff, ClipboardList, ArrowRight,
} from 'lucide-react';

const font = 'Inter, Plus Jakarta Sans, system-ui, sans-serif';
type Tab = 'profile' | 'notifications';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block',
        marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
      {children}
    </div>
  );
}

function makeIStyle(focused: string, accent: string, locked: boolean) {
  return (key: string, extra?: React.CSSProperties): React.CSSProperties => ({
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
  });
}

function validate11Digits(val: string) {
  return /^\d{11}$/.test((val || '').replace(/\s/g, ''));
}

type ParsedIssue = { label: string; note: string };
type ParsedRejection = { issues: ParsedIssue[]; generalNote: string };

const WRAPPER_BOILERPLATE = [
  /^hello\s/i,
  /needs some corrections/i,
  /please log in/i,
  /account submission has been reviewed/i,
  /not approved at this time/i,
  /contact your adviser/i,
];

function parseRejectionReason(reason: string | null | undefined): ParsedRejection {
  if (!reason || typeof reason !== 'string') return { issues: [], generalNote: '' };
  const lines = reason.split('\n').map(l => l.trim()).filter(Boolean);
  const issues: ParsedIssue[] = [];
  let generalNote = '';
  for (const line of lines) {
    if (line.startsWith('•')) {
      const rest = line.replace(/^•\s*/, '');
      const sepIdx = rest.indexOf(':');
      if (sepIdx > -1) {
        issues.push({ label: rest.slice(0, sepIdx).trim(), note: rest.slice(sepIdx + 1).trim() });
      } else {
        issues.push({ label: 'Issue', note: rest });
      }
    } else if (/^note:/i.test(line)) {
      generalNote = line.replace(/^note:\s*/i, '').trim();
    } else if (!WRAPPER_BOILERPLATE.some(re => re.test(line))) {
      generalNote = generalNote ? `${generalNote} ${line}` : line;
    }
  }
  return { issues, generalNote };
}

const ISSUE_FIELD_MAP: { match: RegExp; key: string; icon: any }[] = [
  { match: /photo/i, key: 'photo', icon: User },
  { match: /name/i, key: 'name', icon: User },
  { match: /grade|section/i, key: 'grade_section', icon: BookOpen },
  { match: /contact|number|phone/i, key: 'contact', icon: AlertCircle },
  { match: /guardian/i, key: 'guardian', icon: User },
  { match: /address/i, key: 'address', icon: AlertCircle },
];
function iconForLabel(label: string) {
  const found = ISSUE_FIELD_MAP.find(m => m.match.test(label));
  return found?.icon || AlertCircle;
}

function matchFormFieldKeys(label: string): string[] {
  if (/photo/i.test(label)) return ['photo'];
  if (/name/i.test(label)) return ['first_name', 'last_name'];
  if (/grade|section/i.test(label)) return ['grade_level', 'section_id'];
  if (/contact|number|phone/i.test(label)) return ['contact_number'];
  if (/guardian/i.test(label)) return ['guardian_name', 'guardian_relation'];
  if (/address/i.test(label)) return ['address'];
  return [];
}

type ValidationItem = {
  key: string;
  label: string;
  getValue: (form: any, pendingPhoto: File | null, profile: any) => string;
  isValid: (form: any, pendingPhoto: File | null, profile: any) => boolean;
  errorHint: string;
};

const VALIDATION_ITEMS: ValidationItem[] = [
  {
    key: 'photo', label: 'ID Photo',
    getValue: (form, pendingPhoto, profile) =>
      pendingPhoto ? 'New photo ready' : profile?.photo_path ? 'Photo on file' : '',
    isValid: (form, pendingPhoto, profile) => !!pendingPhoto || !!profile?.photo_path,
    errorHint: 'Upload a clear photo.',
  },
  {
    key: 'name', label: 'Full Name',
    getValue: (form) => [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ') || '',
    isValid: (form) => !!(form.first_name?.trim() && form.last_name?.trim()),
    errorHint: 'First and last name are required.',
  },
  {
    key: 'grade_section', label: 'Grade & Section',
    getValue: (form) => form.grade_level
      ? `Grade ${form.grade_level}${form.section_name ? ` · ${form.section_name}` : ''}${form.class_adviser ? ` · ${form.class_adviser}` : ''}`
      : '',
    isValid: (form) => !!(form.grade_level && form.section_id),
    errorHint: 'Pick a grade and section.',
  },
  {
    key: 'address', label: 'Full Address',
    getValue: (form) => form.address?.trim() || '',
    isValid: (form) => !!(form.address?.trim()),
    errorHint: 'Enter your complete address.',
  },
  {
    key: 'contact', label: 'Contact Number',
    getValue: (form) => form.contact_number || '',
    isValid: (form) => validate11Digits(form.contact_number),
    errorHint: 'Must be exactly 11 digits.',
  },
  {
    key: 'guardian', label: 'Guardian',
    getValue: (form) => form.guardian_name ? form.guardian_name : '',
    isValid: (form) => !!(form.guardian_name?.trim()),
    errorHint: 'Guardian name is required.',
  },
];

function GuideCard() {
  const rows = [
    { label: 'FIRST NAME',    value: 'JUAN',                                             note: '' },
    { label: 'MIDDLE INITIAL', value: 'B. (OPTIONAL)',                   note: '' },
    { label: 'LAST NAME',     value: 'DELA CRUZ',                                        note: '' },
    { label: 'GRADE LEVEL',   value: 'Grade 7',                                          note: '' },
    { label: 'SECTION',       value: 'AMBER',                                            note: '' },
    { label: 'LRN',           value: 'SET BY SCHOOL',                      note: '📌' },
    { label: 'CLASS ADVISER', value: 'BETH A. MAGALANG',                                 note: '📌 auto-fill' },
    { label: 'CONTACT NO.',   value: '09123456789',                                      note: '11 digits' },
    { label: 'GUARDIAN NAME', value: 'PAPA G. DELA CRUZ',                                   note: '' },
    { label: 'FULL ADDRESS',  value: 'B1 L1, SOUTHVILLE 8C, PHASE 1N,\nSAN ISIDRO, RODRIGUEZ, RIZAL', note: 'UPPERCASE' },
  ];
  return (
    <div style={{ borderRadius: 16, overflow: 'hidden', border: '1.5px solid rgba(79,110,247,0.3)', background: 'var(--card)', backdropFilter: 'blur(12px)' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg,rgba(79,110,247,0.12),transparent)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: 'linear-gradient(135deg,#4f6ef7,#3b5bdb)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BookOpen size={13} style={{ color: '#fff' }} />
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text)' }}>GUIDE HOW TO FILL OUT THE FORM</p>
          <p style={{ fontSize: 10, color: 'var(--text3)' }}>GAGAYAHIN ITO KUNG HINDI ALAM ANG GAGWIN</p>
        </div>
      </div>
      <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map(({ label, value, note }) => (
          <div key={label} style={{ padding: '7px 10px', borderRadius: 8, background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
              {note && <span style={{ fontSize: 9, color: '#4f6ef7', fontWeight: 700 }}>{note}</span>}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'pre-line', lineHeight: 1.4 }}>{value}</span>
          </div>
        ))}
        <div style={{ marginTop: 4, padding: '8px 10px', borderRadius: 8, background: 'rgba(79,110,247,0.07)', border: '1px solid rgba(79,110,247,0.2)' }}>
          <p style={{ fontSize: 10, color: '#4f6ef7', fontWeight: 700, marginBottom: 2 }}>📸 ID Photo</p>
          <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>Upload a clear, solo photo — face visible, plain or light background. No selfie filters.</p>
        </div>
        <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <p style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, marginBottom: 2 }}>📌 Auto or Set-by-School fields</p>
          <p style={{ fontSize: 11, color: 'var(--text2)', lineHeight: 1.5 }}>
            <strong>LRN</strong> and <strong>Class Adviser</strong> are filled in by the school — you don't need to type these. Your adviser name will auto-fill once you pick your section.
          </p>
        </div>
      </div>
    </div>
  );
}

function FillupForm({
  form, setForm, isLocked, focused, setFocused, sections, profile,
  saving, saved, accent, glow, iStyle, noAdviserForSection, onSubmitClick, isRejected, onLockClick, flagNotes,
}: {
  form: any; setForm: React.Dispatch<React.SetStateAction<any>>; isLocked: boolean;
  focused: string; setFocused: (key: string) => void; sections: any[]; profile: any;
  saving: boolean; saved: boolean; accent: string; glow: string;
  iStyle: (key: string, extra?: React.CSSProperties) => React.CSSProperties;
  noAdviserForSection: boolean; onSubmitClick: () => void; isRejected: boolean; onLockClick: () => void;
  flagNotes: Record<string, string>;
}) {
  const flaggedStyle = (key: string, extra?: React.CSSProperties) =>
    flagNotes[key]
      ? iStyle(key, { border: '1.5px solid #ef4444', boxShadow: '0 0 0 3px rgba(239,68,68,0.12)', ...extra })
      : iStyle(key, extra);

  function FlagNote({ fieldKey }: { fieldKey: string }) {
    if (!flagNotes[fieldKey]) return null;
    return (
      <p style={{ fontSize: 10.5, color: '#ef4444', marginTop: 5, display: 'flex', alignItems: 'flex-start', gap: 4, fontWeight: 600 }}>
        <AlertCircle size={11} style={{ flexShrink: 0, marginTop: 1 }} /> {flagNotes[fieldKey]}
      </p>
    );
  }

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 18, padding: 24, backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
      {isLocked && (
        <div onClick={onLockClick} style={{ position: 'absolute', inset: 0, zIndex: 20, borderRadius: 18, cursor: 'not-allowed', background: 'transparent' }} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="First Name">
          <input value={form.first_name || ''} readOnly={isLocked}
            onChange={e => setForm((p: any) => ({ ...p, first_name: e.target.value }))}
            onFocus={() => !isLocked && setFocused('first_name')} onBlur={() => setFocused('')}
            placeholder="JUAN" style={flaggedStyle('first_name', { textTransform: 'uppercase' })} />
          <FlagNote fieldKey="first_name" />
        </Field>
        <Field label="Last Name">
          <input value={form.last_name || ''} readOnly={isLocked}
            onChange={e => setForm((p: any) => ({ ...p, last_name: e.target.value }))}
            onFocus={() => !isLocked && setFocused('last_name')} onBlur={() => setFocused('')}
            placeholder="DELA CRUZ" style={flaggedStyle('last_name', { textTransform: 'uppercase' })} />
          <FlagNote fieldKey="last_name" />
        </Field>
      </div>

      <Field label="Middle Initial ( WAG SAGUTAN KUNG WALA )">
        <input value={form.middle_name || ''} readOnly={isLocked}
          onKeyDown={e => {
            if (e.key === 'Backspace' || e.key === 'Delete') { e.preventDefault(); setForm((p: any) => ({ ...p, middle_name: '' })); }
          }}
          onChange={e => {
            const letterOnly = e.target.value.replace(/[^a-zA-Z]/g, '');
            if (letterOnly === '') { setForm((p: any) => ({ ...p, middle_name: '' })); return; }
            const letter = letterOnly.slice(-1).toUpperCase();
            setForm((p: any) => ({ ...p, middle_name: `${letter}.` }));
          }}
          onFocus={() => !isLocked && setFocused('middle_name')} onBlur={() => setFocused('')}
          placeholder="B." maxLength={2}
          style={iStyle('middle_name', { textTransform: 'uppercase', textAlign: 'center', maxWidth: 80 })} />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Grade Level">
          <div style={{ position: 'relative' }}>
            <select value={form.grade_level || ''} disabled={isLocked}
              onChange={e => setForm((p: any) => ({ ...p, grade_level: e.target.value, section_id: '', section_name: '', class_adviser: '' }))}
              onFocus={() => setFocused('grade_level')} onBlur={() => setFocused('')}
              style={{ ...flaggedStyle('grade_level'), paddingRight: 36, appearance: 'none', cursor: isLocked ? 'not-allowed' : 'pointer' }}>
              <option value="">SELECT GRADE</option>
              {[7, 8, 9, 10].map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          </div>
          <FlagNote fieldKey="grade_level" />
        </Field>
        <Field label="Section">
          <div style={{ position: 'relative' }}>
            <select value={form.section_id || ''} disabled={!form.grade_level || isLocked}
              onChange={e => {
                const sec = sections.find(s => s.id === Number(e.target.value));
                setForm((p: any) => ({ ...p, section_id: e.target.value, section_name: sec?.name || '', class_adviser: sec?.class_adviser || '' }));
              }}
              onFocus={() => setFocused('section_id')} onBlur={() => setFocused('')}
              style={{ ...flaggedStyle('section_id'), paddingRight: 36, appearance: 'none', cursor: (!form.grade_level || isLocked) ? 'not-allowed' : 'pointer', opacity: form.grade_level ? 1 : 0.5 }}>
              <option value="">SELECT SECTION</option>
              {sections.filter(s => s.grade_level === Number(form.grade_level)).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
          </div>
          {form.grade_level && sections.filter(s => s.grade_level === Number(form.grade_level)).length === 0 && (
            <p style={{ fontSize: 10, color: '#ef4444', marginTop: 5 }}>No sections for Grade {form.grade_level}. Ask admin to add one.</p>
          )}
          <FlagNote fieldKey="section_id" />
        </Field>
      </div>

      <Field label="LRN">
        <div style={{ padding: '11px 14px', background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 11, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.05em' }}>{profile?.lrn || '—'}</span>
          <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>Set by school</span>
        </div>
      </Field>

      <Field label="Class Adviser">
        <div style={{ padding: '11px 14px', background: 'var(--bg2)', border: '1.5px solid var(--border)', borderRadius: 11, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, color: form.class_adviser ? 'var(--text)' : 'var(--text3)' }}>
            {form.class_adviser ? form.class_adviser.toUpperCase() : 'Select a section first'}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>Auto-filled</span>
        </div>
        {noAdviserForSection && <p style={{ fontSize: 10, color: '#ef4444', marginTop: 5 }}>This section has no adviser yet. Ask admin to set one.</p>}
      </Field>

      <Field label="Contact Number">
        <input value={form.contact_number || ''} readOnly={isLocked}
          onChange={e => setForm((p: any) => ({ ...p, contact_number: e.target.value }))}
          onFocus={() => !isLocked && setFocused('contact_number')} onBlur={() => setFocused('')}
          placeholder="09XXXXXXXXX" maxLength={11} inputMode="numeric"
          style={flaggedStyle('contact_number')} />
        {form.contact_number && !validate11Digits(form.contact_number) && (
          <p style={{ fontSize: 10, color: '#ef4444', marginTop: 5 }}>Must be exactly 11 digits.</p>
        )}
        <FlagNote fieldKey="contact_number" />
      </Field>

<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
  <Field label="Guardian First Name">
    <input
      value={form.guardian_first || ''}
      readOnly={isLocked}
      onChange={e =>
        setForm((p: any) => ({
          ...p,
          guardian_first: e.target.value,
          guardian_name: `${e.target.value} ${p.guardian_middle || ''} ${p.guardian_last || ''}`.replace(/\s+/g, ' ').trim(),
        }))
      }
      onFocus={() => !isLocked && setFocused('guardian_name')}
      onBlur={() => setFocused('')}
      placeholder="JUAN"
      style={flaggedStyle('guardian_name', { textTransform: 'uppercase' })}
    />
  </Field>

  <Field label="Guardian Last Name">
    <input
      value={form.guardian_last || ''}
      readOnly={isLocked}
      onChange={e =>
        setForm((p: any) => ({
          ...p,
          guardian_last: e.target.value,
          guardian_name: `${p.guardian_first || ''} ${p.guardian_middle || ''} ${e.target.value}`.replace(/\s+/g, ' ').trim(),
        }))
      }
      onFocus={() => !isLocked && setFocused('guardian_name')}
      onBlur={() => setFocused('')}
      placeholder="DELA CRUZ"
      style={flaggedStyle('guardian_name', { textTransform: 'uppercase' })}
    />
    <FlagNote fieldKey="guardian_name" />
  </Field>
</div>

<Field label="Middle Initial ( WAG SAGUTAN KUNG WALA )">
  <input
    value={form.guardian_middle || ''}
    readOnly={isLocked}
    onKeyDown={e => {
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        setForm((p: any) => ({
          ...p,
          guardian_middle: '',
          guardian_name: `${p.guardian_first || ''} ${p.guardian_last || ''}`.replace(/\s+/g, ' ').trim(),
        }));
      }
    }}
    onChange={e => {
      const letterOnly = e.target.value.replace(/[^a-zA-Z]/g, '');

      if (letterOnly === '') {
        setForm((p: any) => ({
          ...p,
          guardian_middle: '',
          guardian_name: `${p.guardian_first || ''} ${p.guardian_last || ''}`.replace(/\s+/g, ' ').trim(),
        }));
        return;
      }

      const letter = letterOnly.slice(-1).toUpperCase();

      setForm((p: any) => ({
        ...p,
        guardian_middle: `${letter}.`,
        guardian_name: `${p.guardian_first || ''} ${letter}. ${p.guardian_last || ''}`.replace(/\s+/g, ' ').trim(),
      }));
    }}
    onFocus={() => !isLocked && setFocused('guardian_name')}
    onBlur={() => setFocused('')}
    placeholder="B."
    maxLength={2}
    style={iStyle('guardian_middle', {
      textTransform: 'uppercase',
      textAlign: 'center',
      maxWidth: 80,
    })}
  />
</Field>

      <Field label="Full Address 📌( EXAMPLE: B1 L1, SOUTHVILLE 8C, PHASE 1N, DOUBLE L, SAN ISIDRO, RODRIGUEZ, RIZAL )">
        <textarea value={form.address || ''} readOnly={isLocked}
          onChange={e => setForm((p: any) => ({ ...p, address: e.target.value.toUpperCase() }))}
          onFocus={() => !isLocked && setFocused('address')} onBlur={() => setFocused('')}
          placeholder="B1 L1, SOUTHVILLE 8C, PHASE 1N, SAN ISIDRO, RODRIGUEZ, RIZAL" rows={2}
          style={{ ...flaggedStyle('address'), resize: 'vertical', minHeight: 70, textTransform: 'uppercase' }} />
        <FlagNote fieldKey="address" />
      </Field>

      {!isLocked && (
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={onSubmitClick} disabled={saving}
          style={{ padding: '13px', border: 'none', borderRadius: 13, fontSize: 14, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s',
            background: saved ? 'linear-gradient(135deg,#22c55e,#16a34a)' : isRejected ? 'linear-gradient(135deg,#ef4444,#dc2626)' : `linear-gradient(135deg,${accent},#3b5bdb)`,
            color: '#fff',
            boxShadow: saved ? '0 6px 24px rgba(34,197,94,0.35)' : isRejected ? '0 6px 24px rgba(239,68,68,0.35)' : `0 6px 24px ${glow}` }}>
          {saving
            ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />Saving…</>
            : saved ? <><CheckCircle size={16} /> Saved!</>
            : isRejected ? <><Save size={16} /> Fix &amp; Resubmit</>
            : <><Save size={16} /> Submit Profile</>}
        </motion.button>
      )}

      {isLocked && (
        <div style={{ padding: '13px', borderRadius: 13, fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--bg2)', border: '1.5px solid var(--border)', color: 'var(--text3)' }}>
          <Lock size={15} /> Profile Submitted — Waiting for ID
        </div>
      )}
    </div>
  );
}

export default function StudentStatusPage() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  const accent = '#4f6ef7';
  const glow = 'rgba(79,110,247,0.3)';

  const [tab, setTab]                   = useState<Tab>('profile');
  const [profile, setProfile]           = useState<any>(null);
  const [sections, setSections]         = useState<any[]>([]);
  const [notifs, setNotifs]             = useState<any[]>([]);
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [saveError, setSaveError]       = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [form, setForm]                 = useState<any>({});
  const [focused, setFocused]           = useState('');
  const [showGuide, setShowGuide]       = useState(true);
  const [modal, setModal]               = useState<null | 'warning' | 'review' | 'locked' | 'success' | 'error' | 'resubmitGuide' | 'logoutConfirm'>(null);
  const [triedConfirm, setTriedConfirm] = useState(false);
  const [activeRejection, setActiveRejection] = useState<ParsedRejection | null>(null);

  const formSectionRef = useRef<HTMLDivElement>(null);

  const isSubmitted = profile?.submitted === 1 || profile?.submitted === true;
  const isRejected  = profile?.status === 'rejected';
  const isLocked    = isSubmitted && !isRejected;
  const iStyle = makeIStyle(focused, accent, isLocked);
  const unread = notifs.filter(n => !n.is_read).length;

  function isRejectionNotif(n: any) {
    return /reject/i.test(n?.title || '') || /^•/m.test(n?.message || '');
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/me', { signal: controller.signal }).then(r => r.json()).then(d => { setProfile(d); setForm(d || {}); }).catch(() => {});
    fetch('/api/sections', { signal: controller.signal }).then(r => r.json()).then(d => {
      const all: any[] = [];
      Object.values(d || {}).forEach((arr: any) => { if (Array.isArray(arr)) all.push(...arr); });
      setSections(all);
    }).catch(() => {});
    fetch('/api/notifications', { signal: controller.signal }).then(r => r.json()).then(d => setNotifs(Array.isArray(d) ? d : [])).catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!modal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setModal(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modal]);

  async function saveProfile() {
    setSaving(true);
    setSaveError('');

    if (pendingPhoto) {
      const fd = new FormData(); fd.append('photo', pendingPhoto);
      const photoRes = await fetch('/api/me/photo', { method: 'POST', body: fd });
      if (!photoRes.ok) {
        setSaving(false);
        setSaveError('Failed to upload your photo. Please try again.');
        setModal('error');
        return;
      }
      setPendingPhoto(null);
    }

    const { photo_path: _localPhotoPreview, ...profilePayload } = form;

    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...profilePayload, submitted: 1, status: 'pending', rejection_reason: null }),
    });

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setSaving(false);
      setSaveError(d.error || 'Something went wrong while submitting. Please try again.');
      setModal('error');
      return;
    }

    const updated = await fetch('/api/me').then(r => r.json());
    setProfile(updated); setForm(updated);
    setSaving(false); setSaved(true);
    setActiveRejection(null);
    setModal('success');
    setTimeout(() => setSaved(false), 2500);
  }

  async function markAllAsRead() {
    setNotifs(prev => prev.map(n => ({ ...n, is_read: 1 })));
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAll: true }) });
  }
  async function markRead(id: number) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
  }

  function openResubmitGuide(n: any) {
    if (!n.is_read) markRead(n.id);
    const parsed = parseRejectionReason(profile?.rejection_reason || n.message || '');
    setActiveRejection(parsed);
    setTab('profile');
    setModal('resubmitGuide');
  }

  function scrollToForm() {
    setModal(null);
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  const STATUS: Record<string, any> = {
    approved: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  icon: CheckCircle, label: 'Approved',       msg: 'Approved! Your ID will be ready soon.' },
    pending:  { color: '#f97316', bg: 'rgba(249,115,22,0.1)', icon: Clock,       label: 'Pending Review', msg: 'Your info is being reviewed.' },
    rejected: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  icon: XCircle,     label: 'Rejected',       msg: 'Not approved. Please review and resubmit.' },
  };
  const sc = STATUS[profile?.status || 'pending'] || STATUS.pending;
  const StatusIcon = sc.icon;
  const noAdviserForSection = !!form.section_id && !form.class_adviser;

  const validationResults = VALIDATION_ITEMS.map(item => ({
    ...item,
    value: item.getValue(form, pendingPhoto, profile),
    valid: item.isValid(form, pendingPhoto, profile),
  }));
  const allValid = validationResults.every(r => r.valid);
  const invalidCount = validationResults.filter(r => !r.valid).length;

  const currentRejectionParsed = activeRejection ?? parseRejectionReason(profile?.rejection_reason);

  const flagNotes: Record<string, string> = {};
  const unmatchedIssues = isRejected
    ? currentRejectionParsed.issues.filter(issue => {
        const keys = matchFormFieldKeys(issue.label);
        if (keys.length === 0) return true;
        keys.forEach(k => { flagNotes[k] = flagNotes[k] ? `${flagNotes[k]} ${issue.note}` : issue.note; });
        return false;
      })
    : [];

  return (
    <div suppressHydrationWarning style={{ fontFamily: font, minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.35s' }}>

      <nav className="top-nav" style={{ position: 'sticky', top: 0, zIndex: 40, height: 58, background: 'var(--header-bg)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
          <img src="https://cdn.phototourl.com/free/2026-05-30-cddc7547-fc18-4888-841d-b8acd54ea907.png"
            style={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }} alt="" />
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <p className="school-name" style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>SOUTHVILLE 8C NATIONAL HIGH SCHOOL</p>
            <p style={{ fontSize: 9, color: accent, fontWeight: 700, letterSpacing: '0.1em' }}>STUDENT PORTAL</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => setTab('notifications')}
            aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ''}`}
            style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${unread > 0 ? accent + '50' : 'var(--border2)'}`, background: unread > 0 ? `${accent}12` : 'var(--input-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Bell size={15} style={{ color: unread > 0 ? accent : 'var(--text3)' }} />
            {unread > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', border: '2px solid var(--bg)' }}>{unread}</span>
            )}
          </motion.button>
          <motion.button whileTap={{ scale: 0.92 }} onClick={toggleTheme} aria-label="Toggle theme"
            style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border2)', background: 'var(--input-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>
            {isLight ? <Moon size={14} /> : <Sun size={14} />}
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => setModal('logoutConfirm')}
            className="signout-btn"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', color: '#ef4444', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
            <LogOut size={13} /> <span className="signout-label">Sign Out</span>
          </motion.button>
        </div>
      </nav>
      <style>{`
        @media (max-width: 420px) { .school-name { font-size: 11px !important; } .signout-label { display: none; } .signout-btn { padding: 7px 9px !important; } }
      `}</style>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>

        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="status-banner" role="status" aria-live="polite"
          style={{ borderRadius: 16, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, background: sc.bg, border: `1px solid ${sc.color}30` }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, background: sc.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${sc.color}50` }}>
            <StatusIcon size={20} style={{ color: '#fff' }} />
          </div>
          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: sc.color, whiteSpace: 'nowrap' }}>{sc.label}</p>
            <p className="status-msg" style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isRejected && profile?.rejection_reason ? 'See the fix guide below for details.' : sc.msg}
            </p>
          </div>
          {profile?.student_number && (
            <div style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap' }}>Student No.</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{profile.student_number}</p>
            </div>
          )}
        </motion.div>
        <style>{`
          @media (max-width: 480px) { .status-banner { flex-wrap: wrap; padding: 12px 14px !important; } .status-banner .status-msg { font-size: 11px !important; } }
        `}</style>

        {isLocked && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ borderRadius: 14, padding: '13px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(79,110,247,0.08)', border: `1px solid ${accent}30` }}>
            <Lock size={18} style={{ color: accent, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: accent }}>Profile locked</p>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>Your info has been submitted. Wait for a notification when your ID is ready.</p>
            </div>
          </motion.div>
        )}

        {isRejected && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ borderRadius: 14, padding: '13px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <AlertCircle size={18} style={{ color: '#ef4444', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>Action needed — form unlocked for editing</p>
              <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                {profile?.rejection_reason ? 'The admin flagged specific fields to fix — open the guide to see exactly what to change.' : 'Your submission was not approved. Please review your details and resubmit.'}
              </p>
            </div>
            {profile?.rejection_reason && (
              <motion.button whileTap={{ scale: 0.96 }}
                onClick={() => { setActiveRejection(parseRejectionReason(profile.rejection_reason)); setModal('resubmitGuide'); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', whiteSpace: 'nowrap' }}>
                <ClipboardList size={13} /> View Fix Guide
              </motion.button>
            )}
          </motion.div>
        )}

        <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 4 }}>
          {([
            { id: 'profile', icon: User, label: 'My Profile' },
            { id: 'notifications', icon: Bell, label: `Notifications${unread > 0 ? ` (${unread})` : ''}` },
          ] as const).map(t => {
            const active = tab === t.id;
            return (
              <motion.button key={t.id} whileTap={{ scale: 0.97 }} onClick={() => setTab(t.id)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: active ? 700 : 400, background: active ? `${accent}15` : 'transparent', border: active ? `1px solid ${accent}40` : '1px solid transparent', color: active ? accent : 'var(--text2)', cursor: 'pointer', transition: 'all 0.2s' }}>
                <t.icon size={14} />{t.label}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {tab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'flex-end' }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowGuide(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: showGuide ? `${accent}12` : 'var(--card)', border: `1px solid ${showGuide ? accent + '40' : 'var(--border)'}`, color: showGuide ? accent : 'var(--text2)', transition: 'all 0.2s' }}>
                  {showGuide ? <EyeOff size={13} /> : <Eye size={13} />}
                  {showGuide ? 'Hide Guide' : 'Show Guide'}
                </motion.button>
              </div>

              <div ref={formSectionRef} style={{ display: 'grid', gridTemplateColumns: showGuide ? 'clamp(260px,30%,320px) 1fr' : '1fr', gap: 20, alignItems: 'start', scrollMarginTop: 72 }} className="fillup-grid">
                <AnimatePresence>
                  {showGuide && (
                    <motion.div key="guide" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="guide-sticky">
                      <GuideCard />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {isRejected && currentRejectionParsed.issues.length > 0 && (
                    <div style={{ borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <ClipboardList size={14} style={{ color: '#ef4444', flexShrink: 0 }} />
                      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                        <strong style={{ color: '#ef4444' }}>{currentRejectionParsed.issues.length} item{currentRejectionParsed.issues.length > 1 ? 's' : ''} flagged</strong> by the admin — the exact fields below are outlined in red with a note. No need to change anything else.
                      </p>
                    </div>
                  )}

                  {isRejected && (unmatchedIssues.length > 0 || currentRejectionParsed.generalNote) && (
                    <div style={{ borderRadius: 12, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                      {unmatchedIssues.map((issue, i) => (
                        <p key={i} style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                          <strong style={{ color: '#ef4444' }}>{issue.label}:</strong> {issue.note}
                        </p>
                      ))}
                      {currentRejectionParsed.generalNote && (
                        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                          <strong>Note:</strong> {currentRejectionParsed.generalNote}
                        </p>
                      )}
                    </div>
                  )}

                  <div style={{ background: 'var(--card)', border: `1px solid ${flagNotes.photo ? '#ef4444' : 'var(--border)'}`, borderRadius: 18, padding: 20, backdropFilter: 'blur(12px)', position: 'relative', boxShadow: flagNotes.photo ? '0 0 0 3px rgba(239,68,68,0.12)' : 'none' }}>
                    {isLocked && (
                      <div onClick={() => setModal('locked')} style={{ position: 'absolute', inset: 0, borderRadius: 18, zIndex: 10, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(2px)', cursor: 'not-allowed' }}>
                        <Lock size={22} style={{ color: '#fff' }} />
                      </div>
                    )}
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14, textAlign: 'center' }}>ID Photo</p>
                    <PhotoUploadCrop
                      currentPhoto={profile?.photo_path}
                      accent={accent}
                      onComplete={(dataUrl, file) => {
                        if (isLocked) return;
                        setForm((p: any) => ({ ...p, photo_path: dataUrl }));
                        setPendingPhoto(file);
                      }}
                    />
                    {flagNotes.photo ? (
                      <p style={{ fontSize: 10.5, color: '#ef4444', marginTop: 10, textAlign: 'center', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <AlertCircle size={11} /> {flagNotes.photo}
                      </p>
                    ) : (
                      <div style={{ marginTop: 14, padding: '8px 12px', borderRadius: 10, background: 'rgba(79,110,247,0.07)', border: '1px solid rgba(79,110,247,0.15)' }}>
                        <p style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'center', lineHeight: 1.6 }}>Upload a clear photo<br />for your ID card</p>
                      </div>
                    )}
                  </div>

                  <FillupForm
                    form={form} setForm={setForm} isLocked={isLocked} focused={focused} setFocused={setFocused}
                    sections={sections} profile={profile} saving={saving} saved={saved} accent={accent} glow={glow}
                    iStyle={iStyle} noAdviserForSection={noAdviserForSection} isRejected={isRejected} flagNotes={flagNotes}
                    onSubmitClick={() => { setTriedConfirm(false); setModal('warning'); }}
                    onLockClick={() => setModal('locked')}
                  />
                </div>
              </div>

              <style>{`
                .guide-sticky { position: sticky; top: 72px; }
                @media (max-width: 640px) { .fillup-grid { grid-template-columns: 1fr !important; } .guide-sticky { position: static !important; } }
              `}</style>
            </motion.div>
          )}

          {tab === 'notifications' && (
            <motion.div key="notifs" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ borderRadius: 18, border: '1px solid var(--border)', background: 'var(--card)', backdropFilter: 'blur(12px)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>Notifications</p>
                  {unread > 0 && (
                    <button onClick={markAllAsRead} style={{ fontSize: 12, fontWeight: 700, color: accent, background: `${accent}10`, border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer' }}>
                      Mark all as read
                    </button>
                  )}
                </div>
                {notifs.length === 0 ? (
                  <div style={{ padding: 48, textAlign: 'center' }}>
                    <BellOff size={32} style={{ color: 'var(--text3)', margin: '0 auto 12px', display: 'block' }} />
                    <p style={{ color: 'var(--text2)', fontSize: 14, fontWeight: 600 }}>No notifications yet</p>
                    <p style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>You'll be notified when your ID is ready.</p>
                  </div>
                ) : notifs.map(n => {
                  const rejection = isRejectionNotif(n);
                  return (
                    <motion.div key={n.id} whileHover={{ backgroundColor: 'var(--bg2)' }}
                      onClick={() => rejection ? openResubmitGuide(n) : (!n.is_read && markRead(n.id))}
                      style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: n.is_read ? 'transparent' : `${accent}06`, transition: 'background 0.15s', borderLeft: n.is_read ? 'none' : `3px solid ${rejection ? '#ef4444' : accent}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <p style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 700, color: 'var(--text)' }}>{n.title || 'Notification'}</p>
                        <span style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap', marginLeft: 12 }}>{new Date(n.created_at).toLocaleDateString('en-PH')}</span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{n.message}</p>
                      {rejection ? (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ClipboardList size={11} /> Tap to view fix guide &amp; resubmit <ArrowRight size={11} />
                        </span>
                      ) : !n.is_read && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: accent, marginTop: 4, display: 'block' }}>Tap to mark as read</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            role="dialog" aria-modal="true"
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: 16, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

            {modal === 'locked' && (
              <motion.div initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, width: '100%', maxWidth: 380, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', margin: '24px auto' }}>
                <div style={{ padding: '32px 24px 20px', textAlign: 'center', background: 'linear-gradient(180deg, rgba(79,110,247,0.08) 0%, transparent 100%)' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, margin: '0 auto 16px', background: 'linear-gradient(135deg, #4f6ef7, #3b5bdb)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(79,110,247,0.4)' }}>
                    <Lock size={26} style={{ color: '#fff' }} />
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>Profile Locked</p>
                  <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                    You already submitted your profile.<br />
                    <strong style={{ color: 'var(--text)' }}>Editing is disabled</strong> while it's under review.<br />
                    Wait for a notification about your ID.
                  </p>
                </div>
                <div style={{ padding: '0 24px 24px' }}>
                  <motion.button whileTap={{ scale: 0.97 }} autoFocus onClick={() => setModal(null)}
                    style={{ width: '100%', padding: 13, borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#4f6ef7,#3b5bdb)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 6px 20px rgba(79,110,247,0.35)' }}>
                    <Check size={14} /> Got it
                  </motion.button>
                </div>
              </motion.div>
            )}

            {modal === 'warning' && (
              <motion.div initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, width: '100%', maxWidth: 420, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', margin: '24px auto' }}>
                <div style={{ padding: '28px 24px 20px', textAlign: 'center', background: 'linear-gradient(180deg, rgba(239,68,68,0.06) 0%, transparent 100%)' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, margin: '0 auto 16px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(239,68,68,0.4)' }}>
                    <AlertCircle size={26} style={{ color: '#fff' }} />
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>READ THIS BEFORE SUBMITTING</p>
                  <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                    Once you submit, <strong style={{ color: 'var(--text)' }}>you can no longer edit your info</strong> unless it gets rejected.<br />
                    The details you enter here will be printed on your school ID for the whole year.
                  </p>
                </div>
                <div style={{ padding: '0 24px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    'Your full name is spelled correctly',
                    'Your photo is clear and presentable',
                    'Your grade and section are correct',
                    'Your address is complete and in UPPERCASE',
                    "Your guardian's name is correct",
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, background: 'rgba(239,68,68,0.12)', border: '1.5px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444' }}>!</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>{item}</p>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
                  <button onClick={() => setModal(null)} style={{ flex: 1, padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 700, background: 'var(--input-bg)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <X size={14} /> Go Back
                  </button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => { setTriedConfirm(false); setModal('review'); }}
                    style={{ flex: 2, padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${accent},#3b5bdb)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: `0 6px 20px ${accent}40` }}>
                    <Check size={14} /> I understand, continue
                  </motion.button>
                </div>
              </motion.div>
            )}

            {modal === 'review' && (
              <motion.div initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, width: '100%', maxWidth: 460, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', margin: '24px auto' }}>
                <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border)', background: `linear-gradient(135deg,${accent}10,transparent)`, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg,${accent},#3b5bdb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${accent}40` }}>
                      <Check size={16} style={{ color: '#fff' }} />
                    </div>
                    <p style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>REVIEW YOUR INFORMATION</p>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text3)' }}>
                    Make sure everything is correct.{' '}
                    {triedConfirm && !allValid && <span style={{ color: '#ef4444', fontWeight: 700 }}>Fix the red items first.</span>}
                  </p>
                </div>
                <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {validationResults.map(item => {
                    const showError = triedConfirm && !item.valid;
                    return (
                      <motion.div key={item.key}
                        animate={showError ? { x: [0, -6, 6, -4, 4, 0] } : {}} transition={{ duration: 0.35 }}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 13px', borderRadius: 12, border: `1.5px solid ${showError ? '#ef4444' : item.valid ? '#22c55e60' : 'var(--border2)'}`, background: showError ? 'rgba(239,68,68,0.07)' : item.valid ? 'rgba(34,197,94,0.05)' : 'var(--input-bg)', transition: 'all 0.2s' }}>
                        <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 2, background: showError ? '#ef4444' : item.valid ? '#22c55e' : 'var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                          {showError ? <X size={11} style={{ color: '#fff' }} /> : item.valid ? <Check size={11} style={{ color: '#fff' }} /> : null}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, color: showError ? '#ef4444' : 'var(--text2)' }}>{item.label}</p>
                          <p style={{ fontSize: 13, lineHeight: 1.5, wordBreak: 'break-word', color: item.valid ? 'var(--text)' : showError ? '#ef4444' : 'var(--text3)', fontStyle: item.valid ? 'normal' : 'italic' }}>
                            {item.valid ? item.value : showError ? `⚠ ${item.errorHint}` : 'Not filled in yet'}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div style={{ padding: '9px 12px', borderRadius: 10, textAlign: 'center', background: allValid ? 'rgba(34,197,94,0.08)' : triedConfirm ? 'rgba(239,68,68,0.07)' : 'var(--input-bg)', border: `1px solid ${allValid ? '#22c55e40' : triedConfirm ? '#ef444430' : 'var(--border2)'}`, transition: 'all 0.25s' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: allValid ? '#22c55e' : triedConfirm ? '#ef4444' : 'var(--text3)' }}>
                      {allValid ? '✓ All complete — ready to submit!' : triedConfirm ? `${invalidCount} item${invalidCount > 1 ? 's' : ''} missing` : `${validationResults.filter(r => r.valid).length} / ${validationResults.length} complete`}
                    </p>
                  </div>
                </div>
                <div style={{ padding: '0 20px 20px', display: 'flex', gap: 10, flexShrink: 0 }}>
                  <button onClick={() => setModal('warning')} style={{ flex: 1, padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 700, background: 'var(--input-bg)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <X size={14} /> Go Back
                  </button>
                  <motion.button
                    whileHover={allValid ? { scale: 1.02, y: -1 } : {}} whileTap={allValid ? { scale: 0.97 } : {}}
                    onClick={async () => {
                      if (!allValid) { setTriedConfirm(true); return; }
                      setModal(null);
                      await saveProfile();
                    }}
                    style={{ flex: 2, padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                      background: allValid ? `linear-gradient(135deg,${accent},#3b5bdb)` : triedConfirm ? 'linear-gradient(135deg,#ef4444,#dc2626)' : `linear-gradient(135deg,${accent}70,#3b5bdb70)`,
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      boxShadow: allValid ? `0 6px 20px ${accent}40` : triedConfirm ? '0 6px 20px rgba(239,68,68,0.3)' : 'none' }}>
                    {allValid ? <><Check size={14} /> Submit Now</> : triedConfirm ? <><AlertCircle size={14} /> Fix missing fields</> : <><Check size={14} /> Confirm &amp; Submit</>}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {modal === 'success' && (
              <motion.div initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, width: '100%', maxWidth: 380, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', margin: '24px auto' }}>
                <div style={{ padding: '32px 24px 20px', textAlign: 'center', background: 'linear-gradient(180deg, rgba(34,197,94,0.08) 0%, transparent 100%)' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, margin: '0 auto 16px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(34,197,94,0.4)' }}>
                    <CheckCircle size={26} style={{ color: '#fff' }} />
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>Profile Submitted!</p>
                  <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                    Your info has been <strong style={{ color: 'var(--text)' }}>sent to the admin for review</strong>.<br />
                    Your status is now <strong style={{ color: '#f97316' }}>Pending</strong> — you'll get a notification once it's checked.
                  </p>
                </div>
                <div style={{ padding: '0 24px 24px' }}>
                  <motion.button whileTap={{ scale: 0.97 }} autoFocus onClick={() => setModal(null)}
                    style={{ width: '100%', padding: 13, borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 6px 20px rgba(34,197,94,0.35)' }}>
                    <Check size={14} /> Okay
                  </motion.button>
                </div>
              </motion.div>
            )}

            {modal === 'error' && (
              <motion.div initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, width: '100%', maxWidth: 380, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', margin: '24px auto' }}>
                <div style={{ padding: '32px 24px 20px', textAlign: 'center', background: 'linear-gradient(180deg, rgba(239,68,68,0.08) 0%, transparent 100%)' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, margin: '0 auto 16px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(239,68,68,0.4)' }}>
                    <AlertCircle size={26} style={{ color: '#fff' }} />
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>Submission Failed</p>
                  <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                    {saveError || 'Something went wrong. Your profile was NOT sent to the admin. Please try again.'}
                  </p>
                </div>
                <div style={{ padding: '0 24px 24px' }}>
                  <motion.button whileTap={{ scale: 0.97 }} autoFocus onClick={() => setModal(null)}
                    style={{ width: '100%', padding: 13, borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 6px 20px rgba(239,68,68,0.35)' }}>
                    <X size={14} /> Close &amp; Try Again
                  </motion.button>
                </div>
              </motion.div>
            )}

            {modal === 'resubmitGuide' && (
              <motion.div initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, width: '100%', maxWidth: 460, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', margin: '24px auto' }}>
                <div style={{ padding: '24px 24px 16px', textAlign: 'center', background: 'linear-gradient(180deg, rgba(239,68,68,0.08) 0%, transparent 100%)', flexShrink: 0 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 16, margin: '0 auto 14px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(239,68,68,0.4)' }}>
                    <ClipboardList size={24} style={{ color: '#fff' }} />
                  </div>
                  <p style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>Here's what to fix</p>
                  <p style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.6 }}>
                    The admin reviewed your profile and flagged the items below. Your form is unlocked — fix these and resubmit.
                  </p>
                </div>
                <div style={{ padding: '4px 22px 6px', maxHeight: '40vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {currentRejectionParsed.issues.length === 0 && !currentRejectionParsed.generalNote && (
                    <p style={{ fontSize: 12.5, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>No specific details were provided — please review your whole profile.</p>
                  )}
                  {currentRejectionParsed.issues.map((issue, i) => {
                    const Icon = iconForLabel(issue.label);
                    return (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 11, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <Icon size={14} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{issue.label}</p>
                          <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, wordBreak: 'break-word' }}>{issue.note}</p>
                        </div>
                      </div>
                    );
                  })}
                  {currentRejectionParsed.generalNote && (
                    <div style={{ padding: '10px 12px', borderRadius: 11, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 2 }}>Additional note</p>
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{currentRejectionParsed.generalNote}</p>
                    </div>
                  )}
                </div>
                <div style={{ padding: '18px 22px 22px', display: 'flex', gap: 10, flexShrink: 0 }}>
                  <button onClick={() => setModal(null)} style={{ flex: 1, padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 700, background: 'var(--input-bg)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text2)' }}>
                    Close
                  </button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} autoFocus
                    onClick={scrollToForm}
                    style={{ flex: 2, padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 6px 20px rgba(239,68,68,0.35)' }}>
                    <Save size={14} /> Start Fixing <ArrowRight size={14} />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {modal === 'logoutConfirm' && (
              <motion.div initial={{ scale: 0.9, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 22, width: '100%', maxWidth: 380, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.5)', margin: '24px auto' }}>
                <div style={{ padding: '32px 24px 20px', textAlign: 'center', background: 'linear-gradient(180deg, rgba(239,68,68,0.08) 0%, transparent 100%)' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 18, margin: '0 auto 16px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(239,68,68,0.4)' }}>
                    <LogOut size={26} style={{ color: '#fff' }} />
                  </div>
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>Sign out?</p>
                  <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7 }}>
                    Are you sure you want to sign out of your account?
                  </p>
                </div>
                <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
                  <button onClick={() => setModal(null)} style={{ flex: 1, padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 700, background: 'var(--input-bg)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <X size={14} /> Cancel
                  </button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} autoFocus
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    style={{ flex: 1, padding: 12, borderRadius: 12, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: '0 6px 20px rgba(239,68,68,0.35)' }}>
                    <LogOut size={14} /> Sign Out
                  </motion.button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}