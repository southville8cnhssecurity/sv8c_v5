import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { logAction } from '@/lib/audit';

function requireAdmin(session: any) {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.userType !== 'admin')
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  return null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const deny = requireAdmin(session);
  if (deny) return deny;
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;
    if (!['pending','approved','rejected'].includes(status))
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    const rows = await query<any[]>('SELECT first_name,last_name,faculty_number FROM faculty WHERE id=?', [id]);
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const p = rows[0];
    const targetName = `${p.first_name} ${p.last_name}`.trim();
    await query('UPDATE faculty SET status=?,updated_at=NOW() WHERE id=?', [status, id]);

    // Send notification when status changes
    if (status === 'approved') {
      await query(
        `INSERT INTO notifications (person_id, person_type, title, message, is_read) VALUES (?,?,?,?,0)`,
        [id, 'faculty',
          '✅ Your ID Information Has Been Approved!',
          `Hello ${targetName || 'Faculty Member'}! Your ID information (${p.faculty_number}) has been reviewed and approved by the administrator. Your physical ID card will be printed soon. Please wait for a notification once it is ready for claiming at the admin office.`
        ]
      );
    } else if (status === 'rejected') {
      await query(
        `INSERT INTO notifications (person_id, person_type, title, message, is_read) VALUES (?,?,?,?,0)`,
        [id, 'faculty',
          '❌ Account Status Update',
          `Hello ${targetName || 'Faculty Member'}! Your account submission has been reviewed. Unfortunately it was not approved at this time. Please contact the school admin office for assistance or to resubmit your information.`
        ]
      );
    }

    await logAction({ adminId: Number((session!.user as any).id), adminName: session!.user?.name||'',
      actionType:'UPDATE', module:'FACULTY', targetId:id, targetName, details:`Status → ${status}` });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message||'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const deny = requireAdmin(session);
  if (deny) return deny;
  try {
    const { id } = await params;
    const rows = await query<any[]>('SELECT first_name,last_name FROM faculty WHERE id=?', [id]);
    const targetName = rows[0] ? `${rows[0].first_name} ${rows[0].last_name}`.trim() : `ID ${id}`;
    await query('DELETE FROM faculty WHERE id=?', [id]);
    await logAction({ adminId: Number((session!.user as any).id), adminName: session!.user?.name||'',
      actionType:'DELETE', module:'FACULTY', targetId:id, targetName, details:'Faculty record deleted' });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message||'Database error' }, { status: 500 });
  }
}
