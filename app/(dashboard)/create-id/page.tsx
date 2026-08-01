'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { useTheme } from '@/lib/theme';
import { StudentIDFront, StudentIDBack } from '@/components/ids/StudentIDCard';
import { StaffIDFront, StaffIDBack } from '@/components/ids/StaffIDCard';
import {
  CreditCard, Download, GraduationCap, Users, Search,
  CheckCircle, User, X, Printer, Plus, AlertTriangle, BookOpen,
  ChevronRight, ChevronLeft, CheckCircle2,
  LogOut, Settings, Moon, Sun,
} from 'lucide-react';

const font = 'Inter, system-ui, sans-serif';
const PER_PAGE = 4; // cards per PDF page — NOT a selection cap anymore
const CARD_PX_W = 638;
const CARD_PX_H = 1013;

// ── Grade colors (fallback to gray for unknown grades) ────────────────────────
const GRADE_COLORS: Record<number, { bg: string; accent: string; light: string }> = {
  7:  { bg: '#4f6ef7', accent: '#3b5bdb', light: 'rgba(79,110,247,0.12)' },
  8:  { bg: '#14b8a6', accent: '#0d9488', light: 'rgba(20,184,166,0.12)' },
  9:  { bg: '#a855f7', accent: '#9333ea', light: 'rgba(168,85,247,0.12)' },
  10: { bg: '#f97316', accent: '#ea580c', light: 'rgba(249,115,22,0.12)' },
};

function getGradeColor(grade: number) {
  return GRADE_COLORS[grade] ?? { bg: '#6b7280', accent: '#4b5563', light: 'rgba(107,114,128,0.12)' };
}

// ── Filename-safe string helper ────────────────────────────────────────────
function sanitizeForFilename(str: string) {
  return (str || 'UNKNOWN')
    .toString()
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function CreateIDPage() {
  // ── principalName + schoolYear come from the global ThemeContext,
  // hydrated from /api/settings. These replace per-record p.principal_name /
  // p.school_year, which were never actually populated anywhere in the app.
  const { schoolName, principalName, schoolYear, theme, toggleTheme } = useTheme() as any;
  const { data: session } = useSession();
  const [tab, setTab]                     = useState<'staff'|'student'>('staff');
  const [list, setList]                   = useState<any[]>([]);
  const [search, setSearch]               = useState('');
  const [selected, setSelected]           = useState<any[]>([]);
  const [alreadyGenerated, setAlreadyGenerated] = useState<number[]>([]);
  const [loading, setLoading]             = useState(true);
  const [generating, setGenerating]       = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [renderReady, setRenderReady]     = useState(false);
  const [mounted, setMounted]             = useState(false);
  const renderRef = useRef<HTMLDivElement>(null);

  // ── themed modal state (replaces native alert()/confirm()) ───────────
  const [infoModal, setInfoModal]         = useState<string | null>(null);
  const [reprintConfirm, setReprintConfirm] = useState<{ names: string[]; onConfirm: () => void } | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  // ── alphabetical sort order for lists (A-Z / Z-A) ─────────────────────
  const [sortOrder, setSortOrder] = useState<'asc'|'desc'>('asc');

  // ── PDF generation progress (e.g. "Page 3 / 25") ──────────────────────
  const [pdfProgress, setPdfProgress] = useState<string | null>(null);

  // ── Tab counts ────────────────────────────────────────────────────────────
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({ staff: 0, student: 0 });

  // ── Student drill-down state ──────────────────────────────────────────────
  const [drillGrade, setDrillGrade]     = useState<number | null>(null);
  const [drillSection, setDrillSection] = useState<string | null>(null);
  // sections from /api/sections — shape: { [grade]: string[] }
  const [sectionsMap, setSectionsMap]   = useState<Record<number, string[]>>({});

  const accent = tab==='staff'?'#14b8a6':'#a855f7';
  const glow   = tab==='staff'?'rgba(20,184,166,0.25)':'rgba(168,85,247,0.25)';

  useEffect(() => { setMounted(true); }, []);

  // ── Load tab counts for both tabs ─────────────────────────────────────────
  useEffect(() => {
    async function loadCounts() {
      const [stf, stu] = await Promise.all([
        fetch('/api/staff?status=approved').then(r => r.json()),
        fetch('/api/students?status=approved').then(r => r.json()),
      ]);
      setTabCounts({
        staff:   Array.isArray(stf) ? stf.length : 0,
        student: Array.isArray(stu) ? stu.length : 0,
      });
    }
    loadCounts();
  }, []);

  // ── Load sections map for drill-down ─────────────────────────────────────
  // Reads from /api/sections (same API that Settings page writes to)
  // so whatever grades/sections admin configured will appear here.
  useEffect(() => {
    fetch('/api/sections').then(r => r.json()).then(d => {
      const map: Record<number, string[]> = {};
      Object.entries(d).forEach(([grade, arr]: [string, any]) => {
        map[Number(grade)] = Array.isArray(arr)
          ? arr.map((s: any) => s.name || s.section_name || s)
          : [];
      });
      setSectionsMap(map);
    }).catch(() => {});
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true); setSelected([]); setAlreadyGenerated([]);
    setDrillGrade(null); setDrillSection(null);
    const apiPath = tab === 'student' ? 'students' : tab;
    const r = await fetch(`/api/${apiPath}?status=approved`);
    const d = await r.json();
    const rows = Array.isArray(d) ? d : [];
    setList(rows);
    if (rows.length) {
      const ids = rows.map((p: any) => p.id).join(',');
      const gr  = await fetch(`/api/ids?ids=${ids}&type=${tab}`);
      const gd  = await gr.json();
      setAlreadyGenerated(Array.isArray(gd) ? gd : []);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { loadList(); }, [loadList]);

  // ── Derived lists ─────────────────────────────────────────────────────────
  const studentsByGradeSection = useCallback((grade: number, section: string) => {
    return list.filter(p =>
      String(p.grade_level) === String(grade) &&
      (p.section_name || '').toLowerCase() === section.toLowerCase()
    );
  }, [list]);

  // ── alphabetical sort helper (by last name, then first name) ─────────
  function sortByName<T extends { last_name?: string; first_name?: string }>(arr: T[]) {
    return [...arr].sort((a, b) => {
      const an = `${a.last_name || ''} ${a.first_name || ''}`.trim().toLowerCase();
      const bn = `${b.last_name || ''} ${b.first_name || ''}`.trim().toLowerCase();
      return sortOrder === 'asc' ? an.localeCompare(bn) : bn.localeCompare(an);
    });
  }

  const filteredNonStudent = sortByName(list.filter(p =>
    !search || `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
      || (p.uid || '').includes(search)
  ));

  const filteredDrillStudents = drillGrade !== null && drillSection !== null
    ? sortByName(studentsByGradeSection(drillGrade, drillSection).filter(p =>
        !search || `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())
          || (p.lrn || '').includes(search)
      ))
    : [];

  // ── Per-section ID completion ─────────────────────────────────────────────
  function isSectionComplete(grade: number, section: string) {
    const students = studentsByGradeSection(grade, section);
    return students.length > 0 && students.every(s => alreadyGenerated.includes(s.id));
  }

  function gradeAllComplete(grade: number) {
    const secs = sectionsMap[grade] || [];
    return secs.length > 0 && secs.every(sec => isSectionComplete(grade, sec));
  }

  function sectionStudentCount(grade: number, section: string) {
    return studentsByGradeSection(grade, section).length;
  }

  function sectionGeneratedCount(grade: number, section: string) {
    return studentsByGradeSection(grade, section).filter(s => alreadyGenerated.includes(s.id)).length;
  }

  // ── batch grouping helpers ────────────────────────────────────────────
  // Students are grouped by grade+section; staff are grouped by department.
  // A batch can hold any number of people, but only from ONE group at a time,
  // so a printed PDF never mixes people from different sections/grades/departments.
  function batchGroupKey(p: any) {
    if (tab === 'student') return `${p.grade_level}__${(p.section_name || '').toLowerCase()}`;
    return (p.department || '').toLowerCase();
  }
  function batchGroupLabel(p: any) {
    if (tab === 'student') return `Grade ${p.grade_level} - ${p.section_name}`;
    return p.department || 'No Department';
  }

  // ── Toggle select (no cap — only group-lock) ───────────────────────────────
  function toggleSelect(p: any) {
    const already = selected.find(s => s.id === p.id);
    if (already) {
      setSelected(prev => prev.filter(s => s.id !== p.id));
      return;
    }

    if (selected.length > 0) {
      const lockedKey = batchGroupKey(selected[0]);
      if (batchGroupKey(p) !== lockedKey) {
        setInfoModal(
          `Isang ${tab === 'student' ? 'section' : 'department'} lang ang pwedeng isabay sa isang batch.\n\n` +
          `Currently selecting: ${batchGroupLabel(selected[0])}\n\n` +
          `I-clear muna ang selection para makapili ka ng ibang ${tab === 'student' ? 'grade/section' : 'department'}.`
        );
        return;
      }
    }
    setSelected(prev => [...prev, p]);
  }

  // ── quick "select next unprinted" within the current view/group ──────
  // Adds ALL unprinted matches (no slot cap), still respects the group lock.
  function selectNextUnprinted(candidatePool: any[]) {
    let candidates = candidatePool.filter(
      s => !alreadyGenerated.includes(s.id) && !selected.some(sel => sel.id === s.id)
    );
    if (selected.length > 0) {
      const lockedKey = batchGroupKey(selected[0]);
      candidates = candidates.filter(s => batchGroupKey(s) === lockedKey);
    }
    if (candidates.length === 0) {
      setInfoModal('Walang natitirang unprinted dito, o naka-lock ka sa ibang section/department.');
      return;
    }
    setSelected(prev => [...prev, ...candidates]);
  }

  // ── select every match in the group (fully populated section/department) ──
  function selectAllInGroup(candidatePool: any[]) {
    if (candidatePool.length === 0) return;
    const lockedKey = selected.length > 0 ? batchGroupKey(selected[0]) : batchGroupKey(candidatePool[0]);
    const toAdd = candidatePool.filter(
      p => batchGroupKey(p) === lockedKey && !selected.some(s => s.id === p.id)
    );
    if (toAdd.length === 0) {
      setInfoModal('Wala nang madadagdag — kompleto na o naka-lock ka sa ibang grupo.');
      return;
    }
    setSelected(prev => [...prev, ...toAdd]);
  }

  // ── Generate PDF ──────────────────────────────────────────────────────────
  async function generateBatchPDF() {
    if (selected.length === 0) {
      setInfoModal('Pumili muna ng kahit isang tao bago mag-generate ng ID.');
      return;
    }
    const alreadyPrinted = selected.filter(p => alreadyGenerated.includes(p.id));
    if (alreadyPrinted.length > 0) {
      setReprintConfirm({
        names: alreadyPrinted.map(p => `${p.first_name} ${p.last_name}`),
        onConfirm: () => { setReprintConfirm(null); runGeneratePDF(); },
      });
      return;
    }
    await runGeneratePDF();
  }

async function runGeneratePDF() {
    setGenerating(true);
    setRenderReady(true);
    await new Promise(r => setTimeout(r, 1000));

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const container = renderRef.current;
      if (!container) throw new Error('Render container not found');

      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const pageW = 210, pageH = 297;
      const cardW = 54, cardH = 86, gap = 5;

      const chunks: any[][] = [];
      for (let i = 0; i < selected.length; i += PER_PAGE) {
        chunks.push(selected.slice(i, i + PER_PAGE));
      }

      for (let pageIdx = 0; pageIdx < chunks.length; pageIdx++) {
        const chunk = chunks[pageIdx];
        if (pageIdx > 0) doc.addPage();
        setPdfProgress(`Page ${pageIdx + 1} / ${chunks.length}`);

        const cols   = chunk.length;
        const totalW = cols * cardW + (cols - 1) * gap;
        const startX = (pageW - totalW) / 2;
        const frontY = 22;
        const backY  = frontY + cardH + 14;

        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pageW, pageH, 'F');
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 60);
        doc.text(schoolName, pageW / 2, 10, { align: 'center' });
        doc.setFontSize(7); doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 130);
        doc.text(
          `${tab === 'student' ? 'Student' : tab.charAt(0).toUpperCase() + tab.slice(1)} ID Cards · Page ${pageIdx + 1}/${chunks.length} · ${selected.length} total · ${new Date().toLocaleDateString('en-PH')}`,
          pageW / 2, 16, { align: 'center' }
        );
        doc.setFontSize(6); doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 110);
        doc.text('FRONT', startX - 6, frontY + cardH / 2, { angle: 90, align: 'center' });
        doc.text('BACK',  startX - 6, backY  + cardH / 2, { angle: 90, align: 'center' });

        for (let i = 0; i < chunk.length; i++) {
          const globalIndex = pageIdx * PER_PAGE + i;
          const x = startX + i * (cardW + gap);

          const frontEl = container.querySelector<HTMLElement>(`[data-card="front-${globalIndex}"]`);
          if (frontEl) {
            const canvas = await html2canvas(frontEl, { scale: 4, useCORS: true, allowTaint: true, backgroundColor: '#fafcfd', logging: false, width: CARD_PX_W, height: CARD_PX_H, windowWidth: CARD_PX_W, windowHeight: CARD_PX_H });
            doc.addImage(canvas.toDataURL('image/jpeg', 0.97), 'JPEG', x, frontY, cardW, cardH);
          }
          const backEl = container.querySelector<HTMLElement>(`[data-card="back-${globalIndex}"]`);
          if (backEl) {
            const canvas = await html2canvas(backEl, { scale: 4, useCORS: true, allowTaint: true, backgroundColor: '#fafcfd', logging: false, width: CARD_PX_W, height: CARD_PX_H, windowWidth: CARD_PX_W, windowHeight: CARD_PX_H });
            doc.addImage(canvas.toDataURL('image/jpeg', 0.97), 'JPEG', x, backY, cardW, cardH);
          }
        }

        doc.setDrawColor(160, 160, 190); doc.setLineWidth(0.2); doc.setLineDashPattern([1.5, 2], 0);
        for (let i = 0; i <= cols; i++) {
          const cx = startX + i * (cardW + gap) - (i > 0 ? gap / 2 : 0);
          doc.line(cx, frontY - 5, cx, backY + cardH + 5);
        }
        [frontY, frontY + cardH, backY, backY + cardH].forEach(ly => {
          doc.line(startX - 5, ly, startX + totalW + 5, ly);
        });
      }

      let groupLabel = '';
      if (tab === 'student') {
        const grade   = sanitizeForFilename(`G${selected[0]?.grade_level ?? ''}`);
        const section = sanitizeForFilename(selected[0]?.section_name);
        groupLabel = `${grade}-${section}`;
      } else {
        groupLabel = sanitizeForFilename(selected[0]?.department);
      }
      doc.save(`SV8CNHS-${tab.toUpperCase()}-ID-${groupLabel}-${new Date().toISOString().slice(0, 10)}.pdf`);

      // ── Save to DB with real success/failure tracking ──
      const results = await Promise.all(selected.map(async p => {
        try {
          const res = await fetch('/api/ids', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ person_id: p.id, person_type: tab }),
          });
          let data: any = null;
          try { data = await res.json(); } catch {}
          return { id: p.id, name: `${p.first_name} ${p.last_name}`, ok: res.ok, error: data?.error };
        } catch (err: any) {
          return { id: p.id, name: `${p.first_name} ${p.last_name}`, ok: false, error: err?.message };
        }
      }));

      const succeeded = results.filter(r => r.ok);
      const failed = results.filter(r => !r.ok);

      setAlreadyGenerated(prev => [...prev, ...succeeded.map(r => r.id)]);
      window.dispatchEvent(new Event('counts:refresh'));

      if (failed.length > 0) {
        setInfoModal(
          `Ang PDF ay na-download, pero ${failed.length} record ang HINDI na-save sa database:\n\n` +
          failed.map(f => `• ${f.name}${f.error ? ` — ${f.error}` : ''}`).join('\n') +
          `\n\nPakisubukan ulit i-generate ang mga ito para ma-save sa system.`
        );
      } else {
        setShowConfirm(true);
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      setInfoModal('Nabigo ang pag-generate ng PDF. I-check ang console para sa detalye.');
    } finally {
      setGenerating(false);
      setRenderReady(false);
      setPdfProgress(null);
    }
  }

  // ── Hidden render portal ──────────────────────────────────────────────────
  // principalName/school_year come from useTheme() (global settings) instead
  // of p.principal_name/p.school_year, which were never populated on
  // individual student/staff records.
  // NOTE: this maps over the FULL `selected` array (not chunked), so the
  // data-card index here always matches the globalIndex used in runGeneratePDF.
  const hiddenRender = mounted && renderReady ? createPortal(
    <div ref={renderRef} style={{ position:'fixed', top:-99999, left:-99999, width:CARD_PX_W, zIndex:-1, pointerEvents:'none' }}>
      {selected.map((p, i) => (
        <div key={`front-${p.id}`} data-card={`front-${i}`} style={{ width:CARD_PX_W, height:CARD_PX_H, overflow:'hidden', flexShrink:0, marginBottom:8 }}>
          {tab === 'student' ? (
            <StudentIDFront student={{ first_name:p.first_name||'', last_name:p.last_name||'', middle_name:p.middle_name||'', grade_level:p.grade_level?Number(p.grade_level):undefined, section_name:p.section_name||'', lrn:p.lrn||'', photo_path:p.photo_path||'', class_adviser:p.class_adviser||'', school_year:schoolYear }} principalName={principalName} schoolId="308135" />
          ) : (
            <StaffIDFront staff={{ first_name:p.first_name||'', last_name:p.last_name||'', middle_name:p.middle_name||'', position:p.position||'', staff_number:p.staff_number||'', photo_path:p.photo_path||'', school_year:schoolYear }} principalName={principalName} schoolName={schoolName} />
          )}
        </div>
      ))}
      {selected.map((p, i) => (
        <div key={`back-${p.id}`} data-card={`back-${i}`} style={{ width:CARD_PX_W, height:CARD_PX_H, overflow:'hidden', flexShrink:0, marginBottom:8 }}>
          {tab === 'student' ? (
            <StudentIDBack student={{ first_name:p.first_name||'', last_name:p.last_name||'', middle_name:p.middle_name||'', guardian_name:p.guardian_name||'', address:p.address||'', guardian_contact_number:p.guardian_contact_number||p.contact_number||'', school_year:schoolYear }} principalName={principalName} />
          ) : (
            <StaffIDBack staff={{ first_name:p.first_name||'', last_name:p.last_name||'', middle_name:p.middle_name||'', address:p.address||'', contact_number:p.contact_number||'', school_year:schoolYear }} principalName={principalName} schoolName={schoolName} />
          )}
        </div>
      ))}
    </div>,
    document.body
  ) : null;

  // ── Student left panel: grade/section drill-down ──────────────────────────
  function StudentDrillPanel() {

    // ── Level 0: grade list — fully dynamic from sectionsMap ─────────────
    if (drillGrade === null) {
      const availableGrades = Object.keys(sectionsMap).map(Number).sort((a, b) => a - b);
      return (
        <>
          <div style={{ padding:'12px 14px 10px', borderBottom:'1px solid var(--border)' }}>
            <p style={{ fontSize:10, fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
              Select Grade Level
            </p>
          </div>
          <div style={{ flex:1, overflowY:'auto', overscrollBehavior:'contain', padding:12, display:'flex', flexDirection:'column', gap:10 }}>
            {availableGrades.length === 0 ? (
              <div style={{ padding:'40px 20px', textAlign:'center' }}>
                <GraduationCap size={32} style={{ color:'var(--text3)', opacity:0.4, margin:'0 auto 12px', display:'block' }} />
                <p style={{ fontSize:13, color:'var(--text3)', lineHeight:1.6 }}>
                  No grades configured yet.<br/>Add sections in <strong>Settings</strong> first.
                </p>
              </div>
            ) : availableGrades.map(grade => {
              const gc     = getGradeColor(grade);
              const done   = gradeAllComplete(grade);
              const secs   = sectionsMap[grade] || [];
              const total  = secs.reduce((acc, sec) => acc + sectionStudentCount(grade, sec), 0);
              const genned = secs.reduce((acc, sec) => acc + sectionGeneratedCount(grade, sec), 0);
              const pct    = total > 0 ? Math.round((genned / total) * 100) : 0;
              return (
                <motion.div key={grade}
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setDrillGrade(grade)}
                  style={{
                    borderRadius: 14,
                    border: done ? '2px solid rgba(34,197,94,0.5)' : `1.5px solid ${gc.bg}30`,
                    background: done ? 'rgba(34,197,94,0.05)' : `${gc.bg}08`,
                    padding: '14px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    transition: 'all 0.18s',
                    boxShadow: done ? '0 2px 12px rgba(34,197,94,0.12)' : `0 2px 12px ${gc.bg}15`,
                  }}>
                  {/* Grade label + counts row */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div>
                      <p style={{ fontSize:15, fontWeight:800, color: done ? '#22c55e' : gc.bg, marginBottom:2 }}>
                        Grade {grade}
                      </p>
                      <p style={{ fontSize:11, color:'var(--text3)' }}>
                        {secs.length} section{secs.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <p style={{ fontSize:14, fontWeight:800, color:'var(--text)' }}>
                        {genned}
                        <span style={{ fontWeight:400, color:'var(--text3)', fontSize:12 }}>/{total}</span>
                      </p>
                      <p style={{ fontSize:10, color:'var(--text3)' }}>IDs generated</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div>
                    <div style={{ height:5, borderRadius:3, background:'var(--border2)', overflow:'hidden' }}>
                      <div style={{
                        height:'100%', borderRadius:3,
                        background: done ? '#22c55e' : gc.bg,
                        width: `${pct}%`,
                        transition: 'width 0.4s',
                      }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, alignItems:'center' }}>
                      {done ? (
                        <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, fontWeight:700, color:'#22c55e' }}>
                          <CheckCircle2 size={12} /> Complete
                        </span>
                      ) : (
                        <span style={{ fontSize:10, color:'var(--text3)' }}>{pct}%</span>
                      )}
                      <ChevronRight size={13} style={{ color: done ? '#22c55e' : gc.bg, opacity:0.7 }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      );
    }

    // ── Level 1: sections within a grade ─────────────────────────────────
    if (drillSection === null) {
      const gc          = getGradeColor(drillGrade);
      const secs        = sectionsMap[drillGrade] || [];
      const gradeTotal  = secs.reduce((acc, sec) => acc + sectionStudentCount(drillGrade, sec), 0);
      const gradeGenned = secs.reduce((acc, sec) => acc + sectionGeneratedCount(drillGrade, sec), 0);
      const gradePct    = gradeTotal > 0 ? Math.round((gradeGenned / gradeTotal) * 100) : 0;
      return (
        <>
          {/* Back + grade summary bar */}
          <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <button onClick={() => setDrillGrade(null)}
                style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--border2)', background:'var(--input-bg)',
                  cursor:'pointer', color:'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <ChevronLeft size={14} />
              </button>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:12, fontWeight:800, color:gc.bg }}>Grade {drillGrade}</p>
                <p style={{ fontSize:10, color:'var(--text3)' }}>Choose a section</p>
              </div>
            </div>
            {/* Grade-level summary card — no thumbnail */}
            <div style={{
              background:`${gc.bg}08`, border:`1px solid ${gc.bg}25`,
              borderRadius:12, padding:'10px 12px',
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 }}>
                <span style={{ fontSize:13, fontWeight:800, color:'var(--text)' }}>
                  {gradeGenned}{' '}
                  <span style={{ fontWeight:400, color:'var(--text3)', fontSize:12 }}>of {gradeTotal} done</span>
                </span>
                <span style={{ fontSize:11, fontWeight:700, color: gradeGenned === gradeTotal && gradeTotal > 0 ? '#22c55e' : gc.bg }}>
                  {gradePct}%
                </span>
              </div>
              <div style={{ height:6, borderRadius:3, background:'var(--border2)', overflow:'hidden' }}>
                <div style={{ height:'100%', borderRadius:3, background: gradeGenned === gradeTotal && gradeTotal > 0 ? '#22c55e' : gc.bg, width:`${gradePct}%`, transition:'width 0.4s' }} />
              </div>
              <p style={{ fontSize:10, color:'var(--text3)', marginTop:3 }}>
                {gradeTotal - gradeGenned} remaining · {secs.length} section{secs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Section list */}
          <div style={{ flex:1, overflowY:'auto', overscrollBehavior:'contain' }}>
            {secs.length === 0 ? (
              <p style={{ padding:32, textAlign:'center', color:'var(--text3)', fontSize:13 }}>No sections found</p>
            ) : secs.map(sec => {
              const total     = sectionStudentCount(drillGrade, sec);
              const genned    = sectionGeneratedCount(drillGrade, sec);
              const remaining = total - genned;
              const done      = isSectionComplete(drillGrade, sec);
              const pct       = total > 0 ? Math.round((genned / total) * 100) : 0;
              const isAlmost  = !done && total > 0 && remaining <= Math.ceil(total * 0.3);
              return (
                <motion.div key={sec} whileHover={{ x: 2 }}
                  onClick={() => setDrillSection(sec)}
                  style={{
                    display:'flex', alignItems:'center', gap:10, padding:'13px 14px',
                    cursor:'pointer', borderBottom:'1px solid var(--border)',
                    background: done ? 'rgba(34,197,94,0.04)' : 'transparent',
                    borderLeft: done ? '3px solid #22c55e' : `3px solid ${gc.bg}40`,
                    transition:'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = done ? 'rgba(34,197,94,0.08)' : 'var(--bg2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = done ? 'rgba(34,197,94,0.04)' : 'transparent')}>
                  {/* Icon */}
                  <div style={{
                    width:34, height:34, borderRadius:9, flexShrink:0,
                    background: done ? 'rgba(34,197,94,0.12)' : gc.light,
                    border:`1.5px solid ${done ? 'rgba(34,197,94,0.3)' : gc.bg+'30'}`,
                    display:'flex', alignItems:'center', justifyContent:'center',
                  }}>
                    {done
                      ? <CheckCircle2 size={17} style={{ color:'#22c55e' }} />
                      : <Users size={15} style={{ color:gc.bg }} />}
                  </div>
                  {/* Info + bar */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:3 }}>
                      <p style={{ fontSize:13, fontWeight:700, color: done ? '#22c55e' : 'var(--text)', textTransform:'uppercase' }}>{sec}</p>
                      <p style={{ fontSize:11, fontWeight:700, color:'var(--text)', marginLeft:8, flexShrink:0 }}>
                        {genned}<span style={{ fontWeight:400, color:'var(--text3)' }}>/{total}</span>
                      </p>
                    </div>
                    <div style={{ height:4, borderRadius:2, background:'var(--border2)', overflow:'hidden', marginBottom:3 }}>
                      <div style={{
                        height:'100%', borderRadius:2,
                        background: done ? '#22c55e' : gc.bg,
                        width:`${pct}%`, transition:'width 0.4s',
                      }} />
                    </div>
                    <p style={{ fontSize:10, color: done ? '#22c55e' : isAlmost ? '#f59e0b' : 'var(--text3)' }}>
                      {done ? 'All IDs generated' : `${remaining} remaining`}
                    </p>
                  </div>
                  {/* Right badge */}
                  {done ? (
                    <span style={{ flexShrink:0, padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700,
                      background:'rgba(34,197,94,0.12)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.3)' }}>
                      Complete
                    </span>
                  ) : (
                    <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
                      <span style={{
                        padding:'3px 9px', borderRadius:20, fontSize:10, fontWeight:700,
                        background: isAlmost ? 'rgba(245,158,11,0.12)' : 'var(--input-bg)',
                        color: isAlmost ? '#f59e0b' : 'var(--text3)',
                        border: isAlmost ? '1px solid rgba(245,158,11,0.3)' : '1px solid var(--border2)',
                      }}>
                        {remaining} left
                      </span>
                      <ChevronRight size={13} style={{ color:'var(--text3)' }} />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      );
    }

    // ── Level 2: students within section ─────────────────────────────────
    const gc = getGradeColor(drillGrade);
    return (
      <>
        <div style={{ padding:'10px 14px 8px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
            <button onClick={() => setDrillSection(null)}
              style={{ width:28, height:28, borderRadius:8, border:'1px solid var(--border2)', background:'var(--input-bg)',
                cursor:'pointer', color:'var(--text2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <ChevronLeft size={14} />
            </button>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:12, fontWeight:800, color:gc.bg, textTransform:'uppercase' }}>Grade {drillGrade} — {drillSection}</p>
              <p style={{ fontSize:10, color:'var(--text3)' }}>
                {filteredDrillStudents.length} student{filteredDrillStudents.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div style={{ position:'relative' }}>
            <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search student…"
              style={{ width:'100%', padding:'8px 10px 8px 30px', background:'var(--input-bg)', color:'var(--text)',
                border:'1px solid var(--border2)', borderRadius:9, fontSize:12, outline:'none', fontFamily:'inherit' }} />
          </div>
          {/* sort toggle A-Z / Z-A */}
          <button onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
            style={{ width:'100%', marginTop:8, padding:'8px 10px', borderRadius:9, border:'1px solid var(--border2)',
              background:'var(--input-bg)', color:'var(--text2)', fontSize:11, fontWeight:700, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            Sort: {sortOrder === 'asc' ? 'A → Z' : 'Z → A'}
          </button>
          {/* select all in this section (no cap — full section at once) */}
          <button onClick={() => selectAllInGroup(filteredDrillStudents)}
            style={{ width:'100%', marginTop:8, padding:'8px 10px', borderRadius:9, border:`1px solid ${gc.bg}40`,
              background:`${gc.bg}0c`, color:gc.bg, fontSize:11, fontWeight:700, cursor:'pointer' }}>
            Select All in Section ({filteredDrillStudents.length})
          </button>
          {/* quick-select next unprinted (respects the current group lock) */}
          <button onClick={() => selectNextUnprinted(filteredDrillStudents)}
            style={{ width:'100%', marginTop:8, padding:'8px 10px', borderRadius:9, border:`1px solid ${gc.bg}40`,
              background:`${gc.bg}0c`, color:gc.bg, fontSize:11, fontWeight:700, cursor:'pointer' }}>
            + Auto-select next unprinted
          </button>
          {/* lock indicator */}
          {selected.length > 0 && (
            <div style={{ marginTop:8, padding:'8px 10px', borderRadius:8,
              background:`${gc.bg}0a`, border:`1px solid ${gc.bg}25`,
              fontSize:10.5, color:'var(--text2)', lineHeight:1.5 }}>
              Locked to <strong style={{ color:gc.bg, textTransform:'uppercase' }}>{batchGroupLabel(selected[0])}</strong> · I-clear ang selection para pumili ng ibang section
            </div>
          )}
        </div>
        <div style={{ flex:1, overflowY:'auto', overscrollBehavior:'contain' }}>
          {loading ? (
            <div style={{ padding:12, display:'flex', flexDirection:'column', gap:8 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:54, borderRadius:10 }} />)}
            </div>
          ) : filteredDrillStudents.length === 0 ? (
            <p style={{ padding:32, textAlign:'center', color:'var(--text3)', fontSize:13 }}>No students found</p>
          ) : filteredDrillStudents.map(p => {
            const inSel  = selected.some(s => s.id === p.id);
            const crossGroup = selected.length > 0 && !inSel && batchGroupKey(selected[0]) !== batchGroupKey(p);
            const isFull = crossGroup && !inSel;
            const wasGen = alreadyGenerated.includes(p.id);
            return (
              <motion.div key={p.id} whileHover={!isFull ? { x: 3 } : {}}
                onClick={() => !isFull && toggleSelect(p)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px',
                  cursor: isFull ? 'not-allowed' : 'pointer',
                  background: inSel ? `${gc.bg}12` : 'transparent',
                  borderBottom:'1px solid var(--border)', opacity: isFull ? 0.45 : 1,
                  transition:'all 0.15s',
                  borderLeft: inSel ? `3px solid ${gc.bg}` : '3px solid transparent' }}>
                <div style={{ width:20, height:20, borderRadius:6, flexShrink:0,
                  background: inSel ? gc.bg : 'var(--input-bg)',
                  border:`1.5px solid ${inSel ? gc.bg : 'var(--border2)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}>
                  {inSel && <svg width="11" height="9" fill="none"><path d="M1 4l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                {p.photo_path ? (
                  <img src={p.photo_path} style={{ width:34, height:34, borderRadius:8, objectFit:'cover', flexShrink:0, border:`1.5px solid ${inSel ? gc.bg+'60' : 'var(--border2)'}` }} alt="" />
                ) : (
                  <div style={{ width:34, height:34, borderRadius:8, flexShrink:0, background:inSel?`${gc.bg}20`:'var(--input-bg)', border:`1px solid ${inSel?gc.bg+'40':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <User size={14} style={{ color:inSel?gc.bg:'var(--text3)' }} />
                  </div>
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textTransform:'uppercase' }}>
                    {p.first_name||'—'} {p.last_name||''}
                  </p>
                  <p style={{ fontSize:9, color:'var(--text3)', fontFamily:'monospace', textTransform:'uppercase' }}>{p.lrn || p.uid}</p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:3, alignItems:'flex-end', flexShrink:0 }}>
                  {inSel && (
                    <span style={{ padding:'2px 7px', borderRadius:20, fontSize:10, fontWeight:700, background:`${gc.bg}20`, color:gc.bg, border:`1px solid ${gc.bg}40` }}>
                      #{selected.findIndex(s => s.id === p.id)+1}
                    </span>
                  )}
                  {wasGen && (
                    <span style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 6px', borderRadius:20, fontSize:9, fontWeight:700, background:'rgba(34,197,94,0.1)', color:'#22c55e', border:'1px solid rgba(34,197,94,0.25)' }}>
                      <CheckCircle2 size={8}/> Done
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </>
    );
  }

  // ── Non-student list (staff) ────────────────────────────────────────────
  function StaffList() {
    return (
      <>
        <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ position:'relative' }}>
            <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', pointerEvents:'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or UID…"
              style={{ width:'100%', padding:'10px 12px 10px 34px', background:'var(--input-bg)', color:'var(--text)',
                border:'1px solid var(--border2)', borderRadius:10, fontSize:13, outline:'none', fontFamily:'inherit' }} />
          </div>
          {/* sort toggle A-Z / Z-A */}
          <button onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
            style={{ width:'100%', marginTop:8, padding:'9px 10px', borderRadius:9, border:'1px solid var(--border2)',
              background:'var(--input-bg)', color:'var(--text2)', fontSize:11, fontWeight:700, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            Sort: {sortOrder === 'asc' ? 'A → Z' : 'Z → A'}
          </button>
          {/* select all in this department (no cap) */}
          <button onClick={() => selectAllInGroup(filteredNonStudent)}
            style={{ width:'100%', marginTop:8, padding:'9px 10px', borderRadius:9, border:`1px solid ${accent}40`,
              background:`${accent}0c`, color:accent, fontSize:11, fontWeight:700, cursor:'pointer' }}>
            Select All ({filteredNonStudent.length})
          </button>
          {/* quick-select next unprinted (respects the current group lock) */}
          <button onClick={() => selectNextUnprinted(filteredNonStudent)}
            style={{ width:'100%', marginTop:8, padding:'9px 10px', borderRadius:9, border:`1px solid ${accent}40`,
              background:`${accent}0c`, color:accent, fontSize:11, fontWeight:700, cursor:'pointer' }}>
            + Auto-select next unprinted
          </button>
          {/* lock indicator */}
          {selected.length > 0 && (
            <div style={{ marginTop:8, padding:'8px 10px', borderRadius:8,
              background:`${accent}0a`, border:`1px solid ${accent}25`,
              fontSize:10.5, color:'var(--text2)', lineHeight:1.5 }}>
               <strong style={{ color:accent, textTransform:'uppercase' }}>{batchGroupLabel(selected[0])}</strong> 
            </div>
          )}
        </div>
        <div style={{ flex:1, overflowY:'auto', overscrollBehavior:'contain' }}>
          {loading ? (
            <div style={{ padding:16, display:'flex', flexDirection:'column', gap:8 }}>
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height:54, borderRadius:10 }} />)}
            </div>
          ) : filteredNonStudent.length === 0 ? (
            <div style={{ padding:40, textAlign:'center', color:'var(--text3)', fontSize:13 }}>
              No approved {tab} found
            </div>
          ) : filteredNonStudent.map(p => {
            const inSel  = selected.some(s => s.id === p.id);
            const crossGroup = selected.length > 0 && !inSel && batchGroupKey(selected[0]) !== batchGroupKey(p);
            const isFull = crossGroup && !inSel;
            const wasGen = alreadyGenerated.includes(p.id);
            return (
              <motion.div key={p.id} whileHover={!isFull ? { x: 3 } : {}}
                onClick={() => !isFull && toggleSelect(p)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px',
                  cursor: isFull ? 'not-allowed' : 'pointer',
                  background: inSel ? `${accent}12` : 'transparent',
                  borderBottom:'1px solid var(--border)', opacity: isFull ? 0.45 : 1,
                  transition:'all 0.15s', borderLeft: inSel ? `3px solid ${accent}` : '3px solid transparent' }}>
                <div style={{ width:20, height:20, borderRadius:6, flexShrink:0,
                  background: inSel ? accent : 'var(--input-bg)',
                  border:`1.5px solid ${inSel ? accent : 'var(--border2)'}`,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {inSel && <svg width="11" height="9" fill="none"><path d="M1 4l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                {p.photo_path ? (
                  <img src={p.photo_path} style={{ width:36, height:36, borderRadius:8, objectFit:'cover', flexShrink:0, border:`1.5px solid ${inSel ? accent+'60' : 'var(--border2)'}` }} alt="" />
                ) : (
                  <div style={{ width:36, height:36, borderRadius:8, flexShrink:0, background:inSel?`${accent}20`:'var(--input-bg)', border:`1px solid ${inSel?accent+'40':'var(--border)'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <User size={14} style={{ color:inSel?accent:'var(--text3)' }} />
                  </div>
                )}
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textTransform:'uppercase' }}>
                    {p.first_name||'—'} {p.last_name||''}
                  </p>
                  <p style={{ fontSize:10, color:'var(--text3)', fontFamily:'monospace', textTransform:'uppercase' }}>{p.uid}</p>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'flex-end', flexShrink:0 }}>
                  {inSel && (
                    <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:`${accent}20`, color:accent, border:`1px solid ${accent}40` }}>
                      #{selected.findIndex(s => s.id === p.id)+1}
                    </span>
                  )}
                  {wasGen && (
                    <span style={{ display:'flex', alignItems:'center', gap:3, padding:'2px 7px', borderRadius:20, fontSize:9, fontWeight:700, background:'rgba(249,115,22,0.1)', color:'#f97316', border:'1px solid rgba(249,115,22,0.25)' }}>
                      <AlertTriangle size={9}/> Printed
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </>
    );
  }

  // ── derived: how many PDF pages the current selection will produce ────────
  const pageCount = Math.ceil(selected.length / PER_PAGE) || 0;

  // ── UI ────────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.3 }}
      style={{ fontFamily:font, height:'100vh', overflow:'hidden', display:'flex', flexDirection:'column', background:'var(--bg)', transition:'background 0.35s', textTransform:'uppercase' }}>

      {/* ── Top zone: header + tabs + selection counter ──────────── */}
      {/* No longer relies on page scroll — the whole shell is height:100vh
          with overflow hidden, so this section simply never moves. Hovering
          over it (or over the gap between panels) has nothing to scroll,
          which is what stops the "both panels move together" bug: that bug
          was actually the whole document scrolling, not real chaining. */}
      <div style={{ flexShrink:0, background:'var(--bg)', paddingBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:14, padding:'20px 24px',
          borderBottom:'1px solid var(--border)', background:'var(--card)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <img src="/SV8CLOGOBG.png" alt="Logo"
              style={{ width:48, height:48, objectFit:'contain', flexShrink:0 }} />
            <div>
              <h1 style={{ fontSize:24, fontWeight:900, letterSpacing:'0.03em',
                textTransform:'uppercase', color:'var(--text)', margin:0, lineHeight:1.1 }}>
                Generate ID Cards
              </h1>
              <p style={{ fontSize:14, color:'var(--text2)', marginTop:4, fontWeight:500 }}>
                Select any number of people · auto-paginated PDF · prints exact same design as preview
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

        <div style={{ padding:'20px 24px 0' }}>
          {/* Tab + Selection counter */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <div style={{ display:'flex', gap:8 }}>
              {(['staff','student'] as const).map(t => {
                const a = tab === t;
                const c = t==='staff'?'#14b8a6':'#a855f7';
                const g = t==='staff'?'rgba(20,184,166,0.25)':'rgba(168,85,247,0.25)';
                const count = tabCounts[t];
                return (
                  <motion.button key={t} whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                    onClick={() => setTab(t)}
                    style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:12,
                      background:a?`${c}15`:'var(--card)', border:a?`1.5px solid ${c}60`:'1px solid var(--border)',
                      color:a?c:'var(--text2)', fontWeight:700, fontSize:13, cursor:'pointer',
                      boxShadow:a?`0 0 20px ${g}`:'none', transition:'all 0.2s' }}>
                    {t==='staff'?<Users size={15}/>:<BookOpen size={15}/>}
                    {t.charAt(0).toUpperCase()+t.slice(1)}
                    <span style={{
                      display:'inline-flex', alignItems:'center', justifyContent:'center',
                      minWidth:20, height:20, borderRadius:10, padding:'0 6px',
                      fontSize:11, fontWeight:800,
                      background: a ? c : 'var(--border2)',
                      color: a ? '#fff' : 'var(--text3)',
                      transition:'all 0.2s',
                    }}>
                      {count}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:12, background:'var(--card)', border:'1px solid var(--border)' }}>
                <Printer size={16} style={{ color:'var(--text3)' }} />
                <span style={{ fontSize:13, fontWeight:800, color: selected.length > 0 ? accent : 'var(--text3)' }}>
                  {selected.length} selected
                </span>
                <span style={{ fontSize:11, color:'var(--text3)' }}>
                  · {pageCount} page{pageCount !== 1 ? 's' : ''}
                </span>
              </div>
              {selected.length > 0 && (
                <motion.button whileTap={{ scale:0.92 }} onClick={() => setSelected([])}
                  style={{ padding:'10px 14px', borderRadius:12, fontSize:13, fontWeight:700, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', color:'#ef4444', cursor:'pointer' }}>
                  <X size={14}/>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>

      {hiddenRender}

      {/* flex:1 + minHeight:0 makes this take exactly the remaining viewport
          height (below the header). overflow:hidden here means the gap
          between the two panels has nothing to scroll — only the panel the
          cursor is actually over can move. */}
      <div style={{ flex:1, minHeight:0, padding:'0 24px 24px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'380px 1fr', gap:20, height:'100%' }}>
          {/* Left panel — fills the column height, scrolls only inside itself */}
          <div style={{ borderRadius:18, border:'1px solid var(--border)', background:'var(--card)',
            backdropFilter:'blur(16px)', overflow:'hidden', display:'flex', flexDirection:'column', height:'100%' }}>
            {tab === 'student' ? <StudentDrillPanel /> : <StaffList />}
          </div>

          {/* Right: Preview + Generate — fills the column height, scrolls only inside itself */}
          <div style={{ height:'100%', minHeight:0, display:'flex', flexDirection:'column' }}>
            <div style={{ borderRadius:18, border:'1px solid var(--border)', background:'var(--card)', backdropFilter:'blur(16px)', padding:28, flex:1, minHeight:0, overflowY:'auto', overscrollBehavior:'contain' }}>
              {selected.length === 0 ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:500 }}>
                  <div style={{ width:72, height:72, borderRadius:20, margin:'0 auto 18px', background:'rgba(249,115,22,0.07)', border:'1px solid rgba(249,115,22,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <CreditCard size={30} style={{ color:'#f97316', opacity:0.6 }} />
                  </div>
                  <p style={{ fontSize:17, fontWeight:800, color:'var(--text)', marginBottom:10 }}>No IDs selected</p>
                  <p style={{ fontSize:13, color:'var(--text2)', maxWidth:300, margin:'0 auto', lineHeight:1.7, textAlign:'center' }}>
                    {tab === 'student'
                      ? 'Choose a grade → section → students from the left panel, or tap Select All for the whole section.'
                      : `Choose any number of approved ${tab}s from the list, or tap Select All.`}
                    {' '}The printed PDF will be exactly what you see in the preview, split across as many pages as needed.
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize:12, fontWeight:700, color:'var(--text2)', marginBottom:16, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                    Preview — {selected.length} selected · {pageCount} PDF page{pageCount !== 1 ? 's' : ''}
                  </p>

                  {/* Grouped-by-page preview so large batches stay readable */}
                  {Array.from({ length: pageCount }).map((_, pageIdx) => {
                    const pageItems = selected.slice(pageIdx * PER_PAGE, pageIdx * PER_PAGE + PER_PAGE);
                    return (
                      <div key={pageIdx} style={{ marginBottom: 24 }}>
                        <p style={{ fontSize:11, fontWeight:700, color:'var(--text3)', marginBottom:8 }}>
                          Page {pageIdx + 1} of {pageCount}
                        </p>
                        <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                          {pageItems.map((p, iInPage) => {
                            const i = pageIdx * PER_PAGE + iInPage; // global index, keeps badge numbers correct
                            const previewScale = 0.4;
                            const previewW = CARD_PX_W * previewScale;
                            const previewH = CARD_PX_H * previewScale;
                            return (
                              <div key={p.id} style={{ position:'relative', flexShrink:0 }}>
                                {/* Number badge + remove button */}
                                <div style={{ position:'absolute', top:-6, left:-6, width:22, height:22, borderRadius:'50%', background:accent, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff', border:'2px solid var(--card)', zIndex:10 }}>{i+1}</div>
                                <button onClick={() => toggleSelect(p)} style={{ position:'absolute', top:-6, right:-6, width:22, height:22, borderRadius:'50%', background:'#ef4444', border:'2px solid var(--card)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', zIndex:10 }}>
                                  <X size={11}/>
                                </button>

                                {/* Front + Back side by side */}
                                <div style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                                  {/* Front */}
                                  <div>
                                    <p style={{ fontSize:9, fontWeight:700, color:'var(--text3)', textAlign:'center', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>Front</p>
                                    <div style={{ width:previewW, height:previewH, overflow:'hidden', borderRadius:6, boxShadow:'0 2px 12px rgba(0,0,0,0.15)' }}>
                                      <div style={{ transform:`scale(${previewScale})`, transformOrigin:'top left', width:CARD_PX_W, height:CARD_PX_H }}>
                                        {tab === 'student' ? (
                                          <StudentIDFront student={{ first_name:p.first_name||'', last_name:p.last_name||'', middle_name:p.middle_name||'', grade_level:p.grade_level?Number(p.grade_level):undefined, section_name:p.section_name||'', lrn:p.lrn||'', photo_path:p.photo_path||'', class_adviser:p.class_adviser||'', school_year:schoolYear }} principalName={principalName} schoolId="308135" />
                                        ) : (
                                          <StaffIDFront staff={{ first_name:p.first_name||'', last_name:p.last_name||'', middle_name:p.middle_name||'', position:p.position||'', staff_number:p.staff_number||'', photo_path:p.photo_path||'', school_year:schoolYear }} principalName={principalName} schoolName={schoolName} />
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Back */}
                                  <div>
                                    <p style={{ fontSize:9, fontWeight:700, color:'var(--text3)', textAlign:'center', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.06em' }}>Back</p>
                                    <div style={{ width:previewW, height:previewH, overflow:'hidden', borderRadius:6, boxShadow:'0 2px 12px rgba(0,0,0,0.15)' }}>
                                      <div style={{ transform:`scale(${previewScale})`, transformOrigin:'top left', width:CARD_PX_W, height:CARD_PX_H }}>
                                        {tab === 'student' ? (
                                          <StudentIDBack student={{ first_name:p.first_name||'', last_name:p.last_name||'', middle_name:p.middle_name||'', guardian_name:p.guardian_name||'', address:p.address||'', guardian_contact_number:p.guardian_contact_number||p.contact_number||'', school_year:schoolYear }} principalName={principalName} />
                                        ) : (
                                          <StaffIDBack staff={{ first_name:p.first_name||'', last_name:p.last_name||'', middle_name:p.middle_name||'', address:p.address||'', contact_number:p.contact_number||'', school_year:schoolYear }} principalName={principalName} schoolName={schoolName} />
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {alreadyGenerated.includes(p.id) && (
                                  <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:4, justifyContent:'center', fontSize:9, color:'#f97316', fontWeight:700 }}>
                                    <AlertTriangle size={9}/> Already printed
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {selected.some(p => alreadyGenerated.includes(p.id)) && (
                    <div style={{ padding:'10px 14px', borderRadius:12, marginBottom:16, background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.25)', display:'flex', alignItems:'center', gap:10 }}>
                      <AlertTriangle size={16} style={{ color:'#f97316', flexShrink:0 }} />
                      <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
                        <strong style={{ color:'#f97316' }}>Heads up:</strong>{' '}
                        {selected.filter(p => alreadyGenerated.includes(p.id)).length} person(s) already had IDs generated. You can still reprint.
                      </p>
                    </div>
                  )}

                  <div style={{ padding:'11px 14px', borderRadius:12, border:`1px solid ${accent}20`, background:`${accent}06`, marginBottom:20 }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'var(--text)', marginBottom:4 }}>
                      Print layout: A4 Portrait · {pageCount} page{pageCount !== 1 ? 's' : ''} · up to {PER_PAGE} per page
                    </p>
                    <p style={{ fontSize:11, color:'var(--text2)', lineHeight:1.7 }}>
                      
                    </p>
                  </div>

                  <motion.button
                    whileHover={!generating?{scale:1.02,y:-1}:{}}
                    whileTap={!generating?{scale:0.98}:{}}
                    onClick={generateBatchPDF} disabled={generating}
                    style={{ width:'100%', padding:'16px', border:'none', borderRadius:14, fontSize:15, fontWeight:700, cursor:generating?'not-allowed':'pointer', transition:'all 0.2s',
                      background: generating ? 'var(--input-bg)' : 'linear-gradient(135deg,#f97316,#ea580c)',
                      color: generating ? 'var(--text3)' : '#fff',
                      boxShadow: generating ? 'none' : '0 8px 28px rgba(249,115,22,0.4)',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
                    {generating ? (
                      <>
                        <motion.div animate={{rotate:360}} transition={{duration:0.7,repeat:Infinity,ease:'linear'}} style={{width:18,height:18,border:'2px solid var(--text3)',borderTopColor:'var(--text)',borderRadius:'50%'}}/>
                        {pdfProgress ? `Generating… ${pdfProgress}` : 'Generating PDF…'}
                      </>
                    ) : (
                      <><Download size={17}/> Print {selected.length} ID{selected.length!==1?'s':''} to PDF ({pageCount} page{pageCount!==1?'s':''})</>
                    )}
                  </motion.button>
                  <p style={{ textAlign:'center', fontSize:11, color:'var(--text3)', marginTop:10 }}>
                  
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <motion.div initial={{ opacity:0, scale:0.85, y:30 }} animate={{ opacity:1, scale:1, y:0 }}
              exit={{ opacity:0, scale:0.85 }} transition={{ type:'spring', stiffness:300, damping:25 }}
              style={{ background:'var(--card)', borderRadius:24, padding:40, maxWidth:380, width:'100%', textAlign:'center', border:'1px solid rgba(34,197,94,0.2)', boxShadow:'0 40px 100px rgba(0,0,0,0.6)' }}>
              <motion.div animate={{ scale:[1,1.1,1] }} transition={{ duration:0.5 }}
                style={{ width:72, height:72, borderRadius:'50%', margin:'0 auto 20px', background:'linear-gradient(135deg,#22c55e,#16a34a)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 30px rgba(34,197,94,0.4)' }}>
                <CheckCircle size={36} style={{ color:'#fff' }} />
              </motion.div>
              <h2 style={{ fontSize:22, fontWeight:900, color:'var(--text)', marginBottom:10 }}>PDF Downloaded!</h2>
              <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7, marginBottom:8 }}>
                <strong style={{ color:'var(--text)' }}>{selected.length * 2} ID cards</strong> across <strong style={{ color:'var(--text)' }}>{pageCount} page{pageCount!==1?'s':''}</strong> saved to your downloads.
              </p>
              <p style={{ fontSize:12, color:'#22c55e', fontWeight:600, marginBottom:24 }}>
                ✓ Records saved · ✓ Notifications sent to {selected.length} {tab}{selected.length!==1?'s':''}
              </p>
              <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }}
                onClick={() => { setShowConfirm(false); setSelected([]); }}
                style={{ width:'100%', padding:'14px', border:'none', borderRadius:13, background:'linear-gradient(135deg,#22c55e,#16a34a)', color:'#fff', fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 6px 24px rgba(34,197,94,0.35)' }}>
                Done
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info / cross-group warning modal (replaces alert()) */}
      <AnimatePresence>
        {infoModal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <motion.div initial={{ opacity:0, scale:0.9, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.9 }}
              transition={{ type:'spring', stiffness:300, damping:25 }}
              style={{ background:'var(--card)', borderRadius:20, padding:32, maxWidth:380, width:'100%', textAlign:'center', border:'1px solid rgba(249,115,22,0.25)', boxShadow:'0 40px 100px rgba(0,0,0,0.6)' }}>
              <div style={{ width:56, height:56, borderRadius:'50%', margin:'0 auto 16px', background:'rgba(249,115,22,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <AlertTriangle size={26} style={{ color:'#f97316' }} />
              </div>
              <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7, marginBottom:22, whiteSpace:'pre-line' }}>{infoModal}</p>
              <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }} onClick={() => setInfoModal(null)}
                style={{ width:'100%', padding:'12px', borderRadius:12, background:'var(--input-bg)', color:'var(--text)', fontSize:14, fontWeight:700, cursor:'pointer', border:'1px solid var(--border2)' }}>
                Okay, gets
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reprint confirmation modal (replaces window.confirm()) */}
      <AnimatePresence>
        {reprintConfirm && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(0,0,0,0.75)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
            <motion.div initial={{ opacity:0, scale:0.9, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:0.9 }}
              transition={{ type:'spring', stiffness:300, damping:25 }}
              style={{ background:'var(--card)', borderRadius:20, padding:32, maxWidth:400, width:'100%', border:'1px solid rgba(239,68,68,0.25)', boxShadow:'0 40px 100px rgba(0,0,0,0.6)' }}>
              <div style={{ width:56, height:56, borderRadius:'50%', margin:'0 auto 16px', background:'rgba(239,68,68,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <AlertTriangle size={26} style={{ color:'#ef4444' }} />
              </div>
              <p style={{ fontSize:15, fontWeight:800, color:'var(--text)', textAlign:'center', marginBottom:10 }}>
                {reprintConfirm.names.length} ID{reprintConfirm.names.length!==1?'s':''} na-print na dati
              </p>
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, marginBottom:18, textAlign:'center', textTransform:'uppercase' }}>
                {reprintConfirm.names.join(', ')}
              </p>
              <p style={{ fontSize:13, color:'var(--text2)', textAlign:'center', marginBottom:22 }}>
                ARE YOU SURE YOU WANT TO REPRINT?
              </p>
              <div style={{ display:'flex', gap:10 }}>
                <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }} onClick={() => setReprintConfirm(null)}
                  style={{ flex:1, padding:'12px', border:'1px solid var(--border2)', borderRadius:12, background:'var(--input-bg)', color:'var(--text)', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                  Kanselahin
                </motion.button>
                <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }} onClick={reprintConfirm.onConfirm}
                  style={{ flex:1, padding:'12px', borderRadius:12, border:'none', background:'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', fontSize:14, fontWeight:700, cursor:'pointer' }}>
                  Oo, i-reprint
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
    </motion.div>
  );
}