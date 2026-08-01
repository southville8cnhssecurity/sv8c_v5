import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session && (session.user as any)?.userType === 'admin') {
      await logAction({
        adminId: 0,
        adminName: session.user?.name || 'Admin',
        actionType: 'LOGOUT',
        module: 'AUTH',
        details: `Admin logged out`,
      });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true });
  }
}
