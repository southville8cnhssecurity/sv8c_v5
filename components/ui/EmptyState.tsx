'use client';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon: Icon, title, subtitle, action }: Props) {
  return (
    <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
      style={{ display:'flex', flexDirection:'column', alignItems:'center',
        justifyContent:'center', padding:'60px 24px', textAlign:'center' }}>
      <div style={{ width:68, height:68, borderRadius:18, marginBottom:16,
        background:'linear-gradient(135deg, rgba(249,115,22,0.1), rgba(37,99,235,0.08))',
        border:'1px solid rgba(249,115,22,0.15)',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <Icon size={28} style={{ color:'#F97316', opacity:0.7 }} />
      </div>
      <h3 style={{ fontSize:15, fontWeight:700, color:'var(--color-text)', marginBottom:6 }}>{title}</h3>
      <p style={{ fontSize:13, color:'var(--color-muted)', maxWidth:280, lineHeight:1.6 }}>{subtitle}</p>
      {action && (
        <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
          onClick={action.onClick}
          style={{ marginTop:20, padding:'10px 22px', background:'linear-gradient(135deg, #F97316, #EA580C)',
            color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:700,
            cursor:'pointer', boxShadow:'0 4px 14px rgba(249,115,22,0.3)',
            fontFamily:'Plus Jakarta Sans, Inter, system-ui, sans-serif' }}>
          {action.label}
        </motion.button>
      )}
    </motion.div>
  );
}
