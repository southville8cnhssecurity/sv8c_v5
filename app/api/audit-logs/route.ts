import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.userType !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const isAdviser = (session.user as any)?.isAdviser === true;

  try {
    let logs: any[];
    if (isAdviser) {
      // ── Advisers see only their own actions, never other admins'/advisers' ──
      logs = await query<any[]>(
        `SELECT * FROM audit_logs WHERE admin_name=? ORDER BY created_at DESC LIMIT 500`,
        [session.user?.name || '']
      );
    } else {
      logs = await query<any[]>(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500`);
    }
    return NextResponse.json(logs);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}