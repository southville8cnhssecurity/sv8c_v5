'use client';
import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import { useTheme } from '@/lib/theme';
import { Users, Search, Check, X, User, ChevronLeft, ChevronRight, Trash2, Phone, MapPin, Mail, Briefcase, LogOut, Settings, Moon, Sun, Eye, AlertTriangle } from 'lucide-react';

const font = 'Inter, Plus Jakarta Sans, system-ui, sans-serif';
const PAGE_SIZE = 15;
type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

function StatusPill({ status }: { status: string }) {
  const m: Record<string, any> = {
    approved: { bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
    rejected: { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444' },
    pending:  { bg: 'rgba(249,115,22,0.12)', color: '#f97316' },
  };
  const s = m[status] || m.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px',
      borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color,
      textTransform: 'uppercase', letterSpacing: '0.03em' }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color }} />
      {status}
    </span>
  );
}

type ConfirmKind = 'approve' | 'reject' | 'delete' | 'logout';
type ConfirmState = { kind: ConfirmKind; name?: string; onConfirm: () => void } | null;

function ConfirmCard({ state, onCancel }: { state: ConfirmState; onCancel: () => void }) {
  if (!state) return null;
  const cfg: Record<ConfirmKind, { title: string; body: string; color: string; bg: string; icon: any; confirmLabel: string }> = {
    approve: { title: 'Approve Staff', body: `Approve ${state.name ? `"${state.name}"` : 'this record'}?`,
      color: '#22c55e', bg: 'linear-gradient(135deg,#22c55e,#16a34a)', icon: Check, confirmLabel: 'Approve' },
    reject:  { title: 'Reject Staff', body: `Reject ${state.name ? `"${state.name}"` : 'this record'}?`,
      color: '#ef4444', bg: 'linear-gradient(135deg,#ef4444,#dc2626)', icon: X, confirmLabel: 'Reject' },
    delete:  { title: 'Delete Record', body: `Delete ${state.name ? `"${state.name}"` : 'this record'}? This cannot be undone.`,
      color: '#ef4444', bg: 'linear-gradient(135deg,#ef4444,#dc2626)', icon: Trash2, confirmLabel: 'Delete' },
    logout:  { title: 'Log Out', body: 'Are you sure you want to log out?',
      color: '#ef4444', bg: 'linear-gradient(135deg,#ef4444,#dc2626)', icon: LogOut, confirmLabel: 'Log Out' },
  };
  const c = cfg[state.kind];
  const Icon = c.icon;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onCancel}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, textTransform: 'none' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ duration: 0.18 }}
          onClick={e => e.stopPropagation()}
          style={{ width: 320, borderRadius: 18, background: 'var(--card)', border: '1px solid var(--border)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.35)', overflow: 'hidden' }}>

          <div style={{ padding: '22px 20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: `${c.color}18`,
              border: `1px solid ${c.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Icon size={20} style={{ color: c.color }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{c.title}</p>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6, lineHeight: 1.4, textTransform: 'uppercase' }}>{c.body}</p>
          </div>

          <div style={{ display: 'flex', gap: 8, padding: '14px 18px 18px' }}>
            <button onClick={onCancel}
              style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: 'var(--input-bg)', color: 'var(--text2)', border: '1px solid var(--border2)',
                cursor: 'pointer', textTransform: 'uppercase' }}>
              Cancel
            </button>
            <button onClick={() => { state.onConfirm(); onCancel(); }}
              style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                background: c.bg, color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textTransform: 'uppercase' }}>
              <Icon size={13} /> {c.confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function StaffSubmitPage() {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme() as any;
  const [staff, setStaff]             = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState<any>(null);
  const [filter, setFilter]           = useState<FilterTab>('all');
  const [page, setPage]               = useState(1);
  const [actionLoading, setActionLoading] = useState('');
  const [confirmModal, setConfirmModal] = useState<ConfirmState>(null);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/staff');
    const d = await r.json();
    setStaff(Array.isArray(d) ? d : []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function doUpdateStatus(id: number, status: string) {
    setActionLoading(`${id}-${status}`);
    try {
      await fetch(`/api/staff/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      await load();
      setSelected((prev: any) => prev?.id === id ? { ...prev, status } : prev);
    } finally {
      setActionLoading('');
    }
  }

  async function doDeleteStaff(id: number) {
    await fetch(`/api/staff/${id}`, { method: 'DELETE' });
    setSelected(null);
    load();
  }

  function askApprove(id: number, name: string) {
    setConfirmModal({ kind: 'approve', name, onConfirm: () => doUpdateStatus(id, 'approved') });
  }
  function askReject(id: number, name: string) {
    setConfirmModal({ kind: 'reject', name, onConfirm: () => doUpdateStatus(id, 'rejected') });
  }
  function askDelete(id: number, name: string) {
    setConfirmModal({ kind: 'delete', name, onConfirm: () => doDeleteStaff(id) });
  }
  function askLogout() {
    setConfirmModal({ kind: 'logout', onConfirm: () => signOut() });
  }

  const filtered = staff
    .filter(s => filter === 'all' || s.status === filter)
    .filter(s => !search ||
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      s.staff_number?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()));

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = {
    all:      staff.length,
    pending:  staff.filter(s => s.status === 'pending').length,
    approved: staff.filter(s => s.status === 'approved').length,
    rejected: staff.filter(s => s.status === 'rejected').length,
  };

  const tabColors: Record<FilterTab, string> = {
    all: '#14b8a6', pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      style={{ fontFamily: font, minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.35s', textTransform: 'uppercase' }}>

      {/* ── Custom header with logo + bigger title + right-side toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '20px 24px',
        borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src="/SV8CLOGOBG.png" alt="Logo"
            style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '0.03em',
              textTransform: 'uppercase', color: 'var(--text)', margin: 0, lineHeight: 1.1 }}>
              Staff Submissions
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 4, fontWeight: 500 }}>
              Review and approve staff accounts
            </p>
          </div>
        </div>

        {/* Right-side toolbar: logout · settings · theme toggle · avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={askLogout} title="Log out"
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

      <div style={{ padding: 24 }}>

        {/* Filter tabs + search */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'pending', 'approved', 'rejected'] as FilterTab[]).map(t => {
              const active = filter === t;
              const color  = tabColors[t];
              return (
                <motion.button key={t} whileTap={{ scale: 0.96 }}
                  onClick={() => { setFilter(t); setPage(1); }}
                  style={{ padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                    background: active ? `${color}18` : 'var(--card)',
                    border: active ? `1.5px solid ${color}50` : '1px solid var(--border)',
                    color: active ? color : 'var(--text2)', cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: active ? `0 0 16px ${color}20` : 'none' }}>
                  {t}
                  <span style={{ marginLeft: 4, opacity: 0.7 }}>({counts[t]})</span>
                </motion.button>
              );
            })}
          </div>
          <div style={{ position: 'relative', minWidth: 220 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, ID, email…"
              style={{ width: '100%', padding: '10px 14px 10px 34px', background: 'var(--input-bg)',
                color: 'var(--text)', border: '1px solid var(--border2)', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', textTransform: 'uppercase' }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20 }}>

          {/* ── Table ── */}
          <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--card)', backdropFilter: 'blur(12px)' }}>
            {loading ? (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10 }} />)}
              </div>
            ) : paginated.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <Users size={40} style={{ color: 'var(--text3)', margin: '0 auto 14px', display: 'block' }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>No submissions</p>
                <p style={{ fontSize: 13, color: 'var(--text2)' }}>
                  No {filter !== 'all' ? filter : ''} staff found{search ? ` matching "${search}"` : ''}
                </p>
              </div>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Staff', 'ID Number', 'Position', 'Contact', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800,
                          color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.08em',
                          whiteSpace: 'nowrap', background: 'var(--bg2)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map(s => {
                      const fullName = s.first_name && s.last_name ? `${s.first_name} ${s.last_name}` : s.staff_number;
                      return (
                      <tr key={s.id}
                        style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s' }}
                        onClick={() => setSelected(s)}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                        {/* Staff name + photo */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {s.photo_path ? (
                              <img src={s.photo_path} style={{ width: 36, height: 36, borderRadius: 9, objectFit: 'cover',
                                border: '1.5px solid rgba(20,184,166,0.3)', flexShrink: 0 }} alt="" />
                            ) : (
                              <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                                background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <User size={16} style={{ color: '#14b8a6' }} />
                              </div>
                            )}
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
                                {s.first_name && s.last_name
                                  ? `${s.first_name} ${s.last_name}`
                                  : <span style={{ color: 'var(--text3)', fontStyle: 'italic' }}>Not filled</span>}
                              </p>
                              <p style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace' }}>{s.email}</p>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '12px 16px', fontSize: 11, color: '#14b8a6', fontFamily: 'monospace', fontWeight: 600 }}>{s.staff_number}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text2)' }}>{s.position || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text3)' }}>{s.contact_number || '—'}</td>
                        <td style={{ padding: '12px 16px' }}><StatusPill status={s.status} /></td>

                        {/* Actions */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setSelected(s)}
                              title="View"
                              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(20,184,166,0.25)',
                                background: 'rgba(20,184,166,0.08)', cursor: 'pointer', color: '#14b8a6',
                                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Eye size={13} />
                            </button>
                            {s.status !== 'approved' && (
                              <button
                                onClick={() => askApprove(s.id, fullName)}
                                disabled={!!actionLoading}
                                title="Approve"
                                style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(34,197,94,0.2)',
                                  background: 'rgba(34,197,94,0.08)', cursor: actionLoading ? 'not-allowed' : 'pointer', color: '#22c55e',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: actionLoading ? 0.5 : 1 }}>
                                {actionLoading === `${s.id}-approved`
                                  ? <span style={{ fontSize: 9, fontWeight: 700 }}>…</span>
                                  : <Check size={13} />}
                              </button>
                            )}
                            {s.status !== 'rejected' && (
                              <button
                                onClick={() => askReject(s.id, fullName)}
                                disabled={!!actionLoading}
                                title="Reject"
                                style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)',
                                  background: 'rgba(239,68,68,0.08)', cursor: actionLoading ? 'not-allowed' : 'pointer', color: '#ef4444',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: actionLoading ? 0.5 : 1 }}>
                                {actionLoading === `${s.id}-rejected`
                                  ? <span style={{ fontSize: 9, fontWeight: 700 }}>…</span>
                                  : <X size={13} />}
                              </button>
                            )}
                            <button
                              onClick={() => askDelete(s.id, fullName)}
                              title="Delete"
                              style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border2)',
                                background: 'var(--input-bg)', cursor: 'pointer', color: 'var(--text3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );})}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 12, color: 'var(--text3)' }}>
                      Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--input-bg)',
                          cursor: page === 1 ? 'not-allowed' : 'pointer', color: 'var(--text2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === 1 ? 0.4 : 1 }}>
                        <ChevronLeft size={14} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => Math.abs(p - page) <= 2).map(p => (
                        <button key={p} onClick={() => setPage(p)}
                          style={{ width: 30, height: 30, borderRadius: 8, fontSize: 12, fontWeight: 700,
                            border: p === page ? '1.5px solid rgba(20,184,166,0.5)' : '1px solid var(--border2)',
                            background: p === page ? 'rgba(20,184,166,0.12)' : 'var(--input-bg)',
                            color: p === page ? '#14b8a6' : 'var(--text2)', cursor: 'pointer' }}>{p}</button>
                      ))}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border2)', background: 'var(--input-bg)',
                          cursor: page === totalPages ? 'not-allowed' : 'pointer', color: 'var(--text2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === totalPages ? 0.4 : 1 }}>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── Detail panel ── */}
          <AnimatePresence>
            {selected && (
              <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }}
                style={{ borderRadius: 18, border: '1px solid var(--border)', background: 'var(--card)',
                  backdropFilter: 'blur(16px)', overflow: 'hidden', height: 'fit-content', position: 'sticky', top: 80 }}>

                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'linear-gradient(135deg,rgba(20,184,166,0.06),transparent)' }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Staff Detail</p>
                  <button onClick={() => setSelected(null)}
                    style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--border2)',
                      background: 'var(--input-bg)', cursor: 'pointer', color: 'var(--text2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={13} />
                  </button>
                </div>

                <div style={{ padding: 18 }}>
                  {/* Photo */}
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                    {selected.photo_path ? (
                      <img src={selected.photo_path} style={{ width: 110, height: 140, borderRadius: 14, objectFit: 'cover',
                        border: '2px solid rgba(20,184,166,0.4)', boxShadow: '0 8px 32px rgba(20,184,166,0.2)' }} alt="" />
                    ) : (
                      <div style={{ width: 110, height: 140, borderRadius: 14, background: 'rgba(20,184,166,0.08)',
                        border: '2px dashed rgba(20,184,166,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={40} style={{ color: 'rgba(20,184,166,0.4)' }} />
                      </div>
                    )}
                  </div>

                  <p style={{ textAlign: 'center', fontSize: 16, fontWeight: 800, color: 'var(--text)', marginBottom: 2 }}>
                    {selected.first_name && selected.last_name
                      ? `${selected.first_name} ${selected.last_name}`
                      : '(Name not filled)'}
                  </p>
                  <p style={{ textAlign: 'center', fontSize: 11, color: '#14b8a6', fontFamily: 'monospace', marginBottom: 12 }}>
                    {selected.staff_number}
                  </p>
                  <div style={{ marginBottom: 14 }}><StatusPill status={selected.status} /></div>

                  {/* Info fields — DEPARTMENT removed */}
                  {[
                    { icon: Mail,      label: 'Email',      val: selected.email },
                    { icon: Briefcase, label: 'Position',   val: selected.position || '—' },
                    { icon: Phone,     label: 'Contact',    val: selected.contact_number || '—' },
                    { icon: MapPin,    label: 'Address',    val: selected.address || '—' },
                  ].map(({ icon: Icon, label, val }) => (
                    <div key={label} style={{ display: 'flex', gap: 10, padding: '8px 0',
                      borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                      <Icon size={13} style={{ color: 'var(--text3)', flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
                        <p style={{ fontSize: 12, color: 'var(--text)', wordBreak: 'break-word' }}>{val}</p>
                      </div>
                    </div>
                  ))}

                  {/* Approve / Reject buttons */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    {selected.status !== 'approved' && (
                      <button
                        onClick={() => askApprove(selected.id, `${selected.first_name || ''} ${selected.last_name || ''}`.trim())}
                        disabled={!!actionLoading}
                        style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                          background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff',
                          border: 'none', cursor: actionLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          opacity: actionLoading ? 0.6 : 1 }}>
                        <Check size={14} /> Approve
                      </button>
                    )}
                    {selected.status !== 'rejected' && (
                      <button
                        onClick={() => askReject(selected.id, `${selected.first_name || ''} ${selected.last_name || ''}`.trim())}
                        disabled={!!actionLoading}
                        style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 700,
                          background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                          border: '1px solid rgba(239,68,68,0.25)', cursor: actionLoading ? 'not-allowed' : 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                          opacity: actionLoading ? 0.6 : 1 }}>
                        <X size={14} /> Reject
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => askDelete(selected.id, `${selected.first_name || ''} ${selected.last_name || ''}`.trim())}
                    style={{ width: '100%', marginTop: 8, padding: '9px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                      background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Trash2 size={13} /> Delete Record
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <ConfirmCard state={confirmModal} onCancel={() => setConfirmModal(null)} />
    </motion.div>
  );
}