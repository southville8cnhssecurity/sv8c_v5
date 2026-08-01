import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { logAction } from '@/lib/audit';

// Returns null if allowed, or a NextResponse to return immediately if denied.
// - Real admin (isAdviser:false): always allowed.
// - Adviser-flagged session: allowed ONLY if the target student's
//   section_id matches their own sectionId.
async function checkAccess(session: any, studentId: string) {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userType = (session.user as any)?.userType;
  if (userType !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const isAdviser = (session.user as any)?.isAdviser === true;
  if (!isAdviser) return null; // real admin, no restriction

  const sectionId = (session.user as any)?.sectionId;
  const rows = await query<any[]>('SELECT section_id FROM students WHERE id=?', [studentId]);
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!sectionId || rows[0].section_id !== sectionId)
    return NextResponse.json({ error: 'Forbidden — not your section' }, { status: 403 });
  return null;
}

// Defensive param validation — `id` reaches raw SQL via a parameterized
// query (already safe from injection), but rejecting non-numeric IDs
// early avoids wasted queries and gives a clean 400 instead of a DB error
// leaking internals.
function isValidId(id: string) {
  return /^\d+$/.test(id);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  const deny = await checkAccess(session, id);
  if (deny) return deny;
  try {
    const rows = await query<any[]>('SELECT * FROM students WHERE id=?', [id]);
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { password_hash, ...safe } = rows[0];
    return NextResponse.json(safe);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  const deny = await checkAccess(session, id);
  if (deny) return deny;
  const isAdviser = (session!.user as any)?.isAdviser === true;

  try {
    const body = await req.json();
    // ── FIX: rejection_reason was previously destructured out of the
    // request body but never used — the admin's detailed, per-field
    // rejection notes were silently discarded. They are now saved to the
    // student's record AND included in the notification the student
    // actually sees, which is what the student-facing "fix guide" parses. ──
    const { status, grade_level, section_id, section_name, rejection_reason } = body;

    // ── Advisers may ONLY change status (approve/reject). Reassigning
    // grade/section stays admin-only. ──
    if (isAdviser && (grade_level !== undefined || section_id !== undefined || section_name !== undefined)) {
      return NextResponse.json({ error: 'Advisers may only update approval status' }, { status: 403 });
    }

    const rows = await query<any[]>('SELECT first_name,last_name,student_number FROM students WHERE id=?', [id]);
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const p = rows[0];
    const targetName = `${p.first_name} ${p.last_name}`.trim();
    const actorName = session!.user?.name || '';
    const actorId = isAdviser ? 0 : Number((session!.user as any).id) || 0;

    if (status) {
      if (!['pending','approved','rejected'].includes(status))
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

      // ── A rejection must always carry a reason — the reject UI already
      // enforces "at least one issue" client-side, but that's not
      // trustworthy on its own; enforce it here too so a malformed or
      // spoofed request can never silently reject a student with no
      // explanation. ──
      const trimmedReason = typeof rejection_reason === 'string' ? rejection_reason.trim() : '';
      if (status === 'rejected' && !trimmedReason) {
        return NextResponse.json({ error: 'A rejection reason is required.' }, { status: 400 });
      }

      if (status === 'rejected') {
        // ── Professional/audit safeguard: snapshot the student's current
        // record into the existing audit_logs table BEFORE the rejection
        // reason overwrites anything, so there is always a retrievable
        // history of what was submitted at the time of each rejection —
        // without needing a new table or deleting/blanking any data. ──
        const fullSnapshot = await query<any[]>('SELECT * FROM students WHERE id=?', [id]);
        const { password_hash: _ph, ...snapshotSafe } = fullSnapshot[0] || {};
        await logAction({ adminId: actorId, adminName: actorName,
          actionType: 'REJECT_SNAPSHOT', module: 'STUDENTS', targetId: id, targetName,
          details: JSON.stringify({ reason: trimmedReason, recordAtRejection: snapshotSafe }) });

        await query(
          'UPDATE students SET status=?, rejection_reason=?, updated_at=NOW() WHERE id=?',
          [status, trimmedReason, id]
        );
      } else {
        // Approving or moving back to pending clears any stale rejection
        // reason so it never resurfaces on a later, unrelated rejection.
        await query(
          'UPDATE students SET status=?, rejection_reason=NULL, updated_at=NOW() WHERE id=?',
          [status, id]
        );
      }

      if (status === 'approved') {
        await query(
          `INSERT INTO notifications (person_id, person_type, title, message, is_read) VALUES (?,?,?,?,0)`,
          [id, 'student',
            '✅YOUR STUDENT ID IS APPROVED! 🎉',
            `Hello ${targetName || 'Student'}! Your student ID information (${p.student_number}) has been reviewed and approved. Your physical ID card will be printed soon. Please wait for a notification once it is ready for claiming at the admin office.`
          ]
        );
      } else if (status === 'rejected') {
        // The notification message now carries the admin's actual
        // structured feedback (the "• Field: note" lines built by the
        // reject form) so the student portal's fix-guide has real content
        // to parse and display, instead of a generic placeholder.
        await query(
          `INSERT INTO notifications (person_id, person_type, title, message, is_read) VALUES (?,?,?,?,0)`,
          [id, 'student',
            '❌ SUBMISSION REJECTED — Action Needed',
            `Hello ${targetName || 'Student'}! Your student ID submission needs some corrections before it can be approved:\n\n${trimmedReason}\n\nPlease log in to your portal, fix the items above, and resubmit.`
          ]
        );
      }

      await logAction({ adminId: actorId, adminName: actorName,
        actionType:'UPDATE', module:'STUDENTS', targetId:id, targetName, details:`Status → ${status}` });
    }

    if (grade_level !== undefined || section_id !== undefined) {
      const updates: string[] = [];
      const vals: any[] = [];
      if (grade_level !== undefined) { updates.push('grade_level=?'); vals.push(grade_level); }
      if (section_id !== undefined) { updates.push('section_id=?'); vals.push(section_id); }
      if (section_name !== undefined) { updates.push('section_name=?'); vals.push(section_name); }
      updates.push('updated_at=NOW()');
      vals.push(id);
      await query(`UPDATE students SET ${updates.join(',')} WHERE id=?`, vals);
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message||'Database error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  if (!isValidId(id)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  // Deletion stays real-admin-only — advisers approve/reject, never delete.
  const userType = (session?.user as any)?.userType;
  const isAdviser = (session?.user as any)?.isAdviser === true;
  if (!session || userType !== 'admin' || isAdviser)
    return NextResponse.json({ error: 'Forbidden — admin only' }, { status: 403 });
  try {
    const rows = await query<any[]>('SELECT first_name,last_name FROM students WHERE id=?', [id]);
    const targetName = rows[0] ? `${rows[0].first_name} ${rows[0].last_name}`.trim() : `ID ${id}`;
    await query('DELETE FROM students WHERE id=?', [id]);
    await logAction({ adminId: Number((session.user as any).id)||0, adminName: session.user?.name||'',
      actionType:'DELETE', module:'STUDENTS', targetId:id, targetName, details:'Student record deleted' });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message||'Database error' }, { status: 500 });
  }
}
