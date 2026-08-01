export default function StatusBadge({ status }: { status: string }) {
  const c: Record<string, any> = {
    completed: { bg:'#F0FDF4', color:'#16A34A', label:'Completed' },
    pending:   { bg:'#FFF7ED', color:'#F97316', label:'Pending' },
    empty:     { bg:'#FEF2F2', color:'#DC2626', label:'Empty' },
    approved:  { bg:'#F0FDF4', color:'#16A34A', label:'Approved' },
    rejected:  { bg:'#FEF2F2', color:'#DC2626', label:'Rejected' },
  };
  const s = c[status] || { bg:'#F8FAFC', color:'#64748B', label: status };
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px',
      borderRadius:20, fontSize:11, fontWeight:700, background:s.bg, color:s.color }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:s.color, display:'inline-block' }} />
      {s.label}
    </span>
  );
}
