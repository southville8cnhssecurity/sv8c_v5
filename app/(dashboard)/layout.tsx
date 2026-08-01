import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let session = null;
  try { session = await getServerSession(authOptions); } catch {}
  if (!session) redirect('/login');
  const userType = (session.user as any)?.userType;
  if (userType !== 'admin') redirect('/login');
  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg)', transition:'background 0.35s' }}>
      <div className="hidden md:block"><Sidebar /></div>
      <main style={{ flex:1 }} className="md:ml-[260px] pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
