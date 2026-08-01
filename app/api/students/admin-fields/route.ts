import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { logAction } from '@/lib/audit';

// ── student_number is fully system-generated (year-prefixed sequence,
// e.g. "26-0001") and is now permanently view-only — nobody, including
// admin, can change it through this route anymore. LRN is the only field
// this endpoint ever touches. ──
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userType = (session.user as any)?.userType;
  if (userType !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const isAdviser = (session.user as any)?.isAdviser === true;

  try {
    const { id, lrn } = await req.json();
    if (!id) return NextResponse.json({ error: 'Student ID required' }, { status: 400 });
    if (lrn === undefined) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

    if (isAdviser) {
      const sectionId = (session.user as any)?.sectionId;
      const rows = await query<any[]>('SELECT section_id FROM students WHERE id=?', [id]);
      if (!rows.length) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
      if (!sectionId || rows[0].section_id !== sectionId)
        return NextResponse.json({ error: 'Forbidden — not your section' }, { status: 403 });
    }

    const val = String(lrn).trim();
    if (val && !/^\d{1,12}$/.test(val))
      return NextResponse.json({ error: 'LRN must be up to 12 digits only' }, { status: 400 });
    if (val) {
      const dup = await query<any[]>('SELECT id FROM students WHERE lrn=? AND id!=?', [val, id]);
      if (dup.length) return NextResponse.json({ error: 'LRN already assigned to another student' }, { status: 400 });
    }

    await query('UPDATE students SET lrn=?, updated_at=NOW() WHERE id=?', [val || null, id]);

    const rows = await query<any[]>('SELECT first_name,last_name FROM students WHERE id=?', [id]);
    await logAction({
      adminId: isAdviser ? 0 : Number((session.user as any).id)||0,
      adminName: session.user?.name || '',
      actionType:'UPDATE', module:'STUDENT', targetId: id,
      targetName: rows[0] ? `${rows[0].first_name} ${rows[0].last_name}`.trim() : `ID ${id}`,
      details: `${isAdviser ? 'Adviser' : 'Admin'} set LRN`,
    });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message||'Server error' }, { status: 500 });
  }
}