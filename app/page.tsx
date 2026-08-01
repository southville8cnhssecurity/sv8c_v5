import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function RootPage() {
  try {
    const session = await getServerSession(authOptions);
    if (session) {
      const userType = (session.user as any)?.userType;
      if (userType === 'admin')   redirect('/home');
      if (userType === 'faculty' || userType === 'staff') redirect('/my-status');
      if (userType === 'student') redirect('/student-status');
    }
  } catch {}
  redirect('/login');
}
