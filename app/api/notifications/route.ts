import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userType = (session.user as any).userType;
  const personId = (session.user as any).personId;
  try {
    if (userType === 'faculty' || userType === 'staff' || userType === 'student') {
      const notifs = await query<any[]>(
        `SELECT * FROM notifications WHERE person_id=? AND person_type=? ORDER BY created_at DESC LIMIT 30`,
        [personId, userType]
      );
      return NextResponse.json(notifs);
    }
    if (userType === 'admin') {
      const notifs = await query<any[]>(`SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50`);
      return NextResponse.json(notifs);
    }
    return NextResponse.json([]);
  } catch { return NextResponse.json([]); }
}

// ── Mark as read (single or all) ──
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const personId = (session.user as any).personId;
  const userType = (session.user as any).userType;
  try {
    if (body.markAll) {
      await query('UPDATE notifications SET is_read=1 WHERE person_id=? AND person_type=?', [personId, userType]);
    } else {
      if (!body.id) return NextResponse.json({ error: 'Missing notification id' }, { status: 400 });
      if (userType === 'admin') {
        // Admins can mark any admin-broadcast notification as read.
        await query('UPDATE notifications SET is_read=1 WHERE id=?', [body.id]);
      } else {
        // Non-admins can only mark their own notifications as read.
        await query('UPDATE notifications SET is_read=1 WHERE id=? AND person_id=? AND person_type=?', [body.id, personId, userType]);
      }
    }
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

// ── Create notification (admin only, called after ID generation) ──
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.userType !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { person_id, person_type, title, message } = await req.json();
    if (!person_id || !person_type || !message)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    await query(
      `INSERT INTO notifications (person_id, person_type, title, message, is_read) VALUES (?,?,?,?,0)`,
      [person_id, person_type, title || 'Notification', message]
    );
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
