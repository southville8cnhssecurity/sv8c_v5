'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/layout/Header';
import {
  FileText, Download, Calendar, Filter,
  GraduationCap, Users, BookOpen, Activity,
  TrendingUp, CheckCircle, Clock, XCircle, BarChart2,
} from 'lucide-react';

const font = 'Inter, Plus Jakarta Sans, system-ui, sans-serif';

type ReportPeriod = 'daily'|'weekly'|'monthly'|'yearly';

interface ReportData {
  period: string;
  totalLogins: number;
  idsGenerated: number;
  facultyApproved: number;
  staffApproved: number;
  studentsApproved: number;
  facultyPending: number;
  staffPending: number;
  studentsPending: number;
  adminActions: number;
  topAdmin: string;
  logs: any[];
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<ReportPeriod>('monthly');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth()-1);
    return d.toISOString().slice(0,10);
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0,10));
  const [adminFilter, setAdminFilter] = useState('all');
  const [data, setData] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, [period, dateFrom, dateTo, adminFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch(`/api/audit-logs?from=${dateFrom}&to=${dateTo}&admin=${adminFilter}`),
        fetch('/api/home/stats'),
      ]);
      const logsData = await logsRes.json();
      const statsData = await statsRes.json();
      setLogs(Array.isArray(logsData) ? logsData : []);
      setData(statsData);
    } catch { setLogs([]); }
    setLoading(false);
  }

  function applyPeriod(p: ReportPeriod) {
    setPeriod(p);
    const now = new Date();
    const to = now.toISOString().slice(0,10);
    let from = new Date();
    if (p === 'daily')   from.setDate(now.getDate()-1);
    if (p === 'weekly')  from.setDate(now.getDate()-7);
    if (p === 'monthly') from.setMonth(now.getMonth()-1);
    if (p === 'yearly')  from.setFullYear(now.getFullYear()-1);
    setDateFrom(from.toISOString().slice(0,10));
    setDateTo(to);
  }

  // Group logs by action type
  const byAction: Record<string,number> = {};
  logs.forEach(l => { byAction[l.action_type] = (byAction[l.action_type]||0)+1; });

  // Group by admin
  const byAdmin: Record<string,number> = {};
  logs.forEach(l => { byAdmin[l.admin_name] = (byAdmin[l.admin_name]||0)+1; });
  const topAdmin = Object.entries(byAdmin).sort((a,b)=>b[1]-a[1])[0];

  // Group by date (for chart)
  const byDate: Record<string,number> = {};
  logs.forEach(l => {
    const d = new Date(l.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric'});
    byDate[d] = (byDate[d]||0)+1;
  });
  const chartData = Object.entries(byDate).slice(-14);
  const maxVal = Math.max(...chartData.map(([,v])=>v), 1);

  async function generatePDF() {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit:'mm', format:'a4', orientation:'portrait' });
      const pageW = 210;
      let y = 15;

      // Header
      doc.setFillColor(26,58,107); doc.rect(0,0,pageW,30,'F');
      doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.setTextColor(255,255,255);
      doc.text('SOUTH VILLE 8C NATIONAL HIGH SCHOOL', pageW/2, 12, {align:'center'});
      doc.setFontSize(10); doc.setFont('helvetica','normal');
      doc.text('ID System Activity Report', pageW/2, 20, {align:'center'});
      doc.setFontSize(8);
      doc.text(`Period: ${dateFrom} to ${dateTo}`, pageW/2, 27, {align:'center'});

      y = 40;
      // Summary boxes
      const summaryItems = [
        { label:'Total Log Entries', value:logs.length },
        { label:'IDs Generated', value:byAction['GENERATE_ID']||0 },
        { label:'Admin Logins', value:byAction['LOGIN']||0 },
        { label:'Most Active Admin', value:topAdmin?topAdmin[0]:'—' },
      ];
      const boxW = (pageW-20)/4;
      summaryItems.forEach((item,i) => {
        const bx = 10+i*boxW;
        doc.setFillColor(232,240,251); doc.roundedRect(bx,y,boxW-4,20,2,2,'F');
        doc.setFontSize(16); doc.setFont('helvetica','bold'); doc.setTextColor(26,58,107);
        doc.text(String(item.value), bx+(boxW-4)/2, y+12, {align:'center'});
        doc.setFontSize(6); doc.setFont('helvetica','normal'); doc.setTextColor(80,80,120);
        doc.text(item.label, bx+(boxW-4)/2, y+18, {align:'center'});
      });
      y += 28;

      // Action breakdown
      doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(26,58,107);
      doc.text('Action Breakdown', 10, y); y += 6;
      doc.setDrawColor(200,210,230); doc.line(10,y,pageW-10,y); y += 4;

      Object.entries(byAction).forEach(([action,count]) => {
        const barW = Math.max(2, (count/Math.max(...Object.values(byAction)))*100);
        doc.setFillColor(26,58,107); doc.rect(10,y-3,barW,4,'F');
        doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(40,40,80);
        doc.text(`${action}: ${count}`, 115, y); y += 7;
      });
      y += 4;

      // Admin activity breakdown
      doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(26,58,107);
      doc.text('Admin Activity', 10, y); y += 6;
      doc.line(10,y,pageW-10,y); y += 4;

      Object.entries(byAdmin).forEach(([admin,count]) => {
        doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(40,40,80);
        doc.text(`${admin}`, 10, y); doc.text(`${count} actions`, 120, y);
        y += 6;
      });
      y += 4;

      // Recent log entries table
      if (y < 220) {
        doc.setFontSize(11); doc.setFont('helvetica','bold'); doc.setTextColor(26,58,107);
        doc.text('Recent Activity Log', 10, y); y += 6;
        doc.line(10,y,pageW-10,y); y += 4;

        doc.setFillColor(240,244,255);
        doc.rect(10,y-3,pageW-20,6,'F');
        doc.setFontSize(8); doc.setFont('helvetica','bold'); doc.setTextColor(40,40,100);
        ['Admin','Action','Module','Target','Date/Time'].forEach((h,i)=>{
          doc.text(h,[10,50,85,120,160][i],y);
        });
        y += 6;

        logs.slice(0,20).forEach(l => {
          if (y > 270) return;
          doc.setFont('helvetica','normal'); doc.setTextColor(40,40,80); doc.setFontSize(7);
          doc.text(l.admin_name||'',10,y);
          doc.text(l.action_type||'',50,y);
          doc.text(l.module||'',85,y);
          doc.text((l.target_name||'—').slice(0,20),120,y);
          doc.text(new Date(l.created_at).toLocaleString('en-PH'),160,y);
          y += 5;
        });
      }

      // Footer
      doc.setFontSize(7); doc.setFont('helvetica','normal'); doc.setTextColor(120,120,150);
      doc.text(`Generated: ${new Date().toLocaleString('en-PH')} · SV8CNHS ID System v2.0`, pageW/2, 290, {align:'center'});

      doc.save(`SV8CNHS-Report-${period}-${dateTo}.pdf`);
    } catch (e) {
      console.error('Report PDF error:', e);
      alert('Failed to generate report PDF.');
    }
    setGenerating(false);
  }

  const actionColors: Record<string,string> = {
    LOGIN:'#22c55e', LOGOUT:'#ef4444', GENERATE_ID:'#f97316',
    UPDATE:'#3b82f6', DELETE:'#ef4444', CREATE:'#a855f7',
    VIEW:'#8b8fa8', EXPORT:'#14b8a6',
  };

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ duration:0.3 }}
      style={{ fontFamily:font, minHeight:'100vh', background:'var(--bg)', transition:'background 0.35s' }}>
      <Header title="Reports" subtitle="Generate printable activity and usage reports" />
      <div style={{ padding:24, maxWidth:1100, margin:'0 auto' }}>

        {/* Controls */}
        <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap', alignItems:'center',
          padding:'16px 20px', borderRadius:16, background:'var(--card)', border:'1px solid var(--border)' }}>

          {/* Period presets */}
          <div style={{ display:'flex', gap:6 }}>
            {(['daily','weekly','monthly','yearly'] as ReportPeriod[]).map(p => (
              <motion.button key={p} whileTap={{ scale:0.96 }} onClick={()=>applyPeriod(p)}
                style={{ padding:'8px 14px', borderRadius:9, fontSize:12, fontWeight:700, cursor:'pointer',
                  background:period===p?'rgba(37,99,235,0.15)':'var(--input-bg)',
                  border:period===p?'1.5px solid rgba(37,99,235,0.45)':'1px solid var(--border2)',
                  color:period===p?'#2563eb':'var(--text2)', transition:'all 0.15s' }}>
                {p.charAt(0).toUpperCase()+p.slice(1)}
              </motion.button>
            ))}
          </div>

          <div style={{ height:24, width:1, background:'var(--border2)' }} />

          {/* Custom date range */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Calendar size={14} style={{ color:'var(--text3)' }} />
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
              style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border2)',
                background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none', fontFamily:font }} />
            <span style={{ color:'var(--text3)', fontSize:12 }}>to</span>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
              style={{ padding:'7px 10px', borderRadius:8, border:'1px solid var(--border2)',
                background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none', fontFamily:font }} />
          </div>

          <div style={{ height:24, width:1, background:'var(--border2)' }} />

          {/* Admin filter */}
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Filter size={14} style={{ color:'var(--text3)' }} />
            <select value={adminFilter} onChange={e=>setAdminFilter(e.target.value)}
              style={{ padding:'7px 12px', borderRadius:8, border:'1px solid var(--border2)',
                background:'var(--input-bg)', color:'var(--text)', fontSize:12, outline:'none', fontFamily:font }}>
              <option value="all">All Admins</option>
              {Object.keys(byAdmin).map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div style={{ marginLeft:'auto' }}>
            <motion.button whileHover={{ scale:1.02, y:-1 }} whileTap={{ scale:0.97 }}
              onClick={generatePDF} disabled={generating}
              style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:10,
                fontSize:13, fontWeight:700, cursor:generating?'not-allowed':'pointer', border:'none',
                background:generating?'var(--input-bg)':'linear-gradient(135deg,#2563eb,#1d4ed8)',
                color:generating?'var(--text3)':'#fff',
                boxShadow:generating?'none':'0 4px 18px rgba(37,99,235,0.35)',
                transition:'all 0.2s' }}>
              {generating
                ? <><motion.div animate={{rotate:360}} transition={{duration:0.7,repeat:Infinity,ease:'linear'}}
                    style={{width:15,height:15,border:'2px solid var(--text3)',borderTopColor:'var(--text)',borderRadius:'50%'}}/>Generating…</>
                : <><Download size={15}/> Export PDF Report</>
              }
            </motion.button>
          </div>
        </div>

        {/* Summary stat cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:14, marginBottom:24 }}>
          {[
            { label:'Total Log Entries', value:logs.length, icon:Activity, color:'#2563eb' },
            { label:'IDs Generated',     value:byAction['GENERATE_ID']||0, icon:BarChart2, color:'#f97316' },
            { label:'Admin Logins',      value:byAction['LOGIN']||0, icon:CheckCircle, color:'#22c55e' },
            { label:'Data Changes',      value:(byAction['UPDATE']||0)+(byAction['CREATE']||0)+(byAction['DELETE']||0), icon:TrendingUp, color:'#a855f7' },
            { label:'Top Admin',         value:topAdmin?topAdmin[1]:0, icon:Users, color:'#14b8a6', sub:topAdmin?topAdmin[0]:'' },
          ].map((card,i) => (
            <motion.div key={card.label} initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
              transition={{ delay:i*0.05 }}
              style={{ padding:'16px 18px', borderRadius:14, background:'var(--card)',
                border:'1px solid var(--border)', backdropFilter:'blur(12px)', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:-8, right:-8, width:56, height:56, borderRadius:'50%',
                background:`radial-gradient(circle,${card.color}22 0%,transparent 70%)`, pointerEvents:'none' }} />
              <div style={{ width:32, height:32, borderRadius:9, marginBottom:10, flexShrink:0,
                background:`linear-gradient(135deg,${card.color},${card.color}CC)`,
                display:'flex', alignItems:'center', justifyContent:'center',
                boxShadow:`0 4px 14px ${card.color}40` }}>
                <card.icon size={15} style={{ color:'#fff' }} />
              </div>
              <p style={{ fontSize:9, color:'var(--text3)', fontWeight:700,
                textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>{card.label}</p>
              {loading
                ? <div className="skeleton" style={{ height:28, width:60, borderRadius:6 }} />
                : <p style={{ fontSize:26, fontWeight:900, color:'var(--text)', lineHeight:1 }}>
                    {typeof card.value==='number'?card.value.toLocaleString():card.value}
                  </p>
              }
              {card.sub && <p style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{card.sub}</p>}
            </motion.div>
          ))}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:20 }}>
          {/* Activity chart */}
          <div style={{ borderRadius:18, border:'1px solid var(--border)', background:'var(--card)',
            backdropFilter:'blur(12px)', padding:22 }}>
            <p style={{ fontSize:14, fontWeight:800, color:'var(--text)', marginBottom:4 }}>
              Activity Timeline
            </p>
            <p style={{ fontSize:11, color:'var(--text3)', marginBottom:20 }}>
              Log entries per day — last 14 days
            </p>
            {loading ? (
              <div className="skeleton" style={{ height:160, borderRadius:10 }} />
            ) : chartData.length === 0 ? (
              <div style={{ height:160, display:'flex', alignItems:'center', justifyContent:'center',
                color:'var(--text3)', fontSize:13 }}>No data for this period</div>
            ) : (
              <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:160, padding:'0 4px' }}>
                {chartData.map(([date, count]) => {
                  const h = Math.max(8, (count/maxVal)*140);
                  return (
                    <div key={date} style={{ flex:1, display:'flex', flexDirection:'column',
                      alignItems:'center', gap:4 }}>
                      <motion.div initial={{ height:0 }} animate={{ height:h }}
                        transition={{ duration:0.6, ease:'easeOut' }}
                        title={`${date}: ${count} actions`}
                        style={{ width:'100%', borderRadius:'3px 3px 0 0',
                          background:'linear-gradient(180deg,#2563eb,#1d4ed8)',
                          boxShadow:'0 2px 8px rgba(37,99,235,0.3)',
                          minWidth:8, cursor:'default' }} />
                      <span style={{ fontSize:8, color:'var(--text3)', textAlign:'center',
                        lineHeight:1.2, writingMode:'vertical-rl', transform:'rotate(180deg)',
                        maxHeight:32, overflow:'hidden' }}>{date}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Action breakdown */}
          <div style={{ borderRadius:18, border:'1px solid var(--border)', background:'var(--card)',
            backdropFilter:'blur(12px)', padding:22 }}>
            <p style={{ fontSize:14, fontWeight:800, color:'var(--text)', marginBottom:4 }}>
              By Action Type
            </p>
            <p style={{ fontSize:11, color:'var(--text3)', marginBottom:16 }}>
              Distribution of admin actions
            </p>
            {loading ? (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{ height:32, borderRadius:8 }} />)}
              </div>
            ) : Object.keys(byAction).length===0 ? (
              <p style={{ color:'var(--text3)', fontSize:13, textAlign:'center', marginTop:20 }}>
                No actions in this period
              </p>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {Object.entries(byAction).sort((a,b)=>b[1]-a[1]).map(([action,count]) => {
                  const pct = Math.round((count/logs.length)*100);
                  const color = actionColors[action]||'#8b8fa8';
                  return (
                    <div key={action}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'var(--text)' }}>{action}</span>
                        <span style={{ fontSize:12, fontWeight:700, color }}>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div style={{ height:6, borderRadius:3, background:'var(--input-bg)', overflow:'hidden' }}>
                        <motion.div initial={{ width:0 }} animate={{ width:`${pct}%` }}
                          transition={{ duration:0.7, ease:'easeOut' }}
                          style={{ height:'100%', borderRadius:3, background:color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Log table */}
        <div style={{ borderRadius:18, border:'1px solid var(--border)', background:'var(--card)',
          backdropFilter:'blur(12px)', overflow:'hidden', marginTop:20 }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)',
            display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <p style={{ fontSize:14, fontWeight:800, color:'var(--text)' }}>Activity Log</p>
              <p style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                {logs.length.toLocaleString()} entries · {dateFrom} to {dateTo}
              </p>
            </div>
          </div>
          {loading ? (
            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:8 }}>
              {[1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{ height:40, borderRadius:8 }} />)}
            </div>
          ) : logs.length===0 ? (
            <div style={{ padding:48, textAlign:'center' }}>
              <FileText size={36} style={{ color:'var(--text3)', margin:'0 auto 12px', display:'block' }} />
              <p style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:6 }}>No logs found</p>
              <p style={{ fontSize:13, color:'var(--text2)' }}>Try a wider date range or different filter.</p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)', background:'var(--bg2)' }}>
                  {['Admin','Action','Module','Target / Details','Date & Time'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10,
                      fontWeight:800, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.07em',
                      whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.slice(0,100).map(l => {
                  const color = actionColors[l.action_type]||'#8b8fa8';
                  return (
                    <tr key={l.id} style={{ borderBottom:'1px solid var(--border)' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='var(--bg2)')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <td style={{ padding:'10px 16px', fontSize:12, fontWeight:700, color:'var(--text)' }}>
                        {l.admin_name}
                      </td>
                      <td style={{ padding:'10px 16px' }}>
                        <span style={{ padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700,
                          background:`${color}15`, color }}>
                          {l.action_type}
                        </span>
                      </td>
                      <td style={{ padding:'10px 16px', fontSize:12, color:'var(--text2)',
                        fontFamily:'monospace' }}>{l.module}</td>
                      <td style={{ padding:'10px 16px', fontSize:12, color:'var(--text2)',
                        maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {l.target_name||l.details||'—'}
                      </td>
                      <td style={{ padding:'10px 16px', fontSize:11, color:'var(--text3)',
                        fontFamily:'monospace', whiteSpace:'nowrap' }}>
                        {new Date(l.created_at).toLocaleString('en-PH')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </motion.div>
  );
}
