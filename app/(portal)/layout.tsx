import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  let session = null;
  try { session = await getServerSession(authOptions); } catch {}
  if (!session) redirect('/login');
  const userType = (session.user as any)?.userType;
  if (!['faculty','staff','student'].includes(userType)) redirect('/home');
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)',
      fontFamily:'Plus Jakarta Sans, Inter, system-ui, sans-serif',
      transition:'background 0.35s' }}>
      {children}
    </div>
  );
}
