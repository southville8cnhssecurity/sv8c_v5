import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

const TABLE: Record<string, string> = { faculty:'faculty', staff:'staff', student:'students' };

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userType = (session.user as any)?.userType;
  const email = session.user?.email;
  if (!email || !TABLE[userType])
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 });
  try {
    const rows = await query<any[]>(`SELECT * FROM ${TABLE[userType]} WHERE email=?`, [email]);
    if (!rows.length) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    const { password_hash, ...safe } = rows[0];
    return NextResponse.json({ ...safe, userType });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

function sanitize(val: any, required = false): string | null {
  if (val === undefined || val === null) return required ? null : null;
  const s = String(val).trim();
  return s.length > 0 ? s : (required ? null : null);
}

// ── Professional safeguard: a short cooldown against rapid-fire duplicate
// submissions (double-clicks, retry loops, or scripted abuse), reusing the
// existing `updated_at` column — no schema change needed anywhere. This
// never blocks normal use: a real resubmission after reading a rejection
// guide, or a first-time submit, will always be well past this window. ──
const RESUBMIT_COOLDOWN_SECONDS = 10;
function withinCooldown(updatedAt: any): boolean {
  if (!updatedAt) return false;
  const secondsSince = (Date.now() - new Date(updatedAt).getTime()) / 1000;
  return secondsSince < RESUBMIT_COOLDOWN_SECONDS;
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userType = (session.user as any)?.userType;
  const email = session.user?.email;
  try {
    const body = await req.json();

    if (userType === 'faculty') {
      // ── Edit request: profile already locked, staff/faculty is only
      // allowed to flag which fields need correction — no direct writes. ──
      if (body.editRequest === true) {
        if (!Array.isArray(body.requestedFields) || body.requestedFields.length === 0)
          return NextResponse.json({ error: 'No fields selected' }, { status: 400 });
        await query(
          `UPDATE faculty SET edit_requested=1, edit_requested_fields=?, edit_requested_note=?,
           edit_requested_at=NOW() WHERE email=?`,
          [JSON.stringify(body.requestedFields), sanitize(body.editNote), email]
        );
        return NextResponse.json({ success: true });
      }

      const [cur] = await query<any[]>('SELECT submitted, updated_at FROM faculty WHERE email=?', [email]);
      if (cur?.submitted === 1 && !body.__adminOverride)
        return NextResponse.json({ error: 'Already submitted' }, { status: 403 });
      if (!body.__adminOverride && withinCooldown(cur?.updated_at))
        return NextResponse.json({ error: 'Please wait a few seconds before submitting again.' }, { status: 429 });

      const first = sanitize(body.first_name);
      const last  = sanitize(body.last_name);
      if (!first || !last)
        return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });

      const setParts = [
        'first_name=?','last_name=?','middle_name=?','subject=?','department=?',
        'contact_number=?','address=?',
      ];
      const values: any[] = [
        first, last, sanitize(body.middle_name), sanitize(body.subject),
        sanitize(body.department), sanitize(body.contact_number), sanitize(body.address),
      ];

      // ── This was the bug: submitted was never persisted, so the
      // profile never actually locked after the user hit Submit. ──
      const isSubmittingFaculty = body.submitted === 1 || body.submitted === true;
      if (body.submitted !== undefined) {
        setParts.push('submitted=?');
        values.push(isSubmittingFaculty ? 1 : 0);
      }

      setParts.push('updated_at=NOW()');
      values.push(email);

      await query(`UPDATE faculty SET ${setParts.join(',')} WHERE email=?`, values);

      // ── Notify faculty na natanggap na ang submission ──
      if (isSubmittingFaculty) {
        const [facultyRow] = await query<any[]>('SELECT id FROM faculty WHERE email=?', [email]);
        if (facultyRow?.id) {
          await query(
            `INSERT INTO notifications (person_id, person_type, title, message, is_read) VALUES (?,?,?,?,0)`,
            [facultyRow.id, 'faculty',
              'Submission Received',
              'Your ID is already submitted, wait for the update in this application.']
          );
        }
      }

    } else if (userType === 'staff') {
      if (body.editRequest === true) {
        if (!Array.isArray(body.requestedFields) || body.requestedFields.length === 0)
          return NextResponse.json({ error: 'No fields selected' }, { status: 400 });
        await query(
          `UPDATE staff SET edit_requested=1, edit_requested_fields=?, edit_requested_note=?,
           edit_requested_at=NOW() WHERE email=?`,
          [JSON.stringify(body.requestedFields), sanitize(body.editNote), email]
        );
        return NextResponse.json({ success: true });
      }

      const [cur] = await query<any[]>('SELECT submitted, updated_at FROM staff WHERE email=?', [email]);
      if (cur?.submitted === 1 && !body.__adminOverride)
        return NextResponse.json({ error: 'Already submitted' }, { status: 403 });
      if (!body.__adminOverride && withinCooldown(cur?.updated_at))
        return NextResponse.json({ error: 'Please wait a few seconds before submitting again.' }, { status: 429 });

      const first = sanitize(body.first_name);
      const last  = sanitize(body.last_name);
      if (!first || !last)
        return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });

      const setParts = [
        'first_name=?','last_name=?','middle_name=?','position=?','department=?',
        'contact_number=?','address=?',
      ];
      const values: any[] = [
        first, last, sanitize(body.middle_name), sanitize(body.position),
        sanitize(body.department), sanitize(body.contact_number), sanitize(body.address),
      ];

      // ── Same fix as faculty: persist submitted so the profile actually
      // locks and the frontend's isLocked flag reflects reality. ──
      const isSubmittingStaff = body.submitted === 1 || body.submitted === true;
      if (body.submitted !== undefined) {
        setParts.push('submitted=?');
        values.push(isSubmittingStaff ? 1 : 0);
      }

      setParts.push('updated_at=NOW()');
      values.push(email);

      await query(`UPDATE staff SET ${setParts.join(',')} WHERE email=?`, values);

      // ── Notify staff na natanggap na ang submission ──
      if (isSubmittingStaff) {
        const [staffRow] = await query<any[]>('SELECT id FROM staff WHERE email=?', [email]);
        if (staffRow?.id) {
          await query(
            `INSERT INTO notifications (person_id, person_type, title, message, is_read) VALUES (?,?,?,?,0)`,
            [staffRow.id, 'staff',
              'Submission Received',
              'Your ID is already submitted, wait for the update in this application.']
          );
        }
      }

    } else if (userType === 'student') {
      // ── Edit request for already-locked, non-rejected students. ──
      if (body.editRequest === true) {
        if (!Array.isArray(body.requestedFields) || body.requestedFields.length === 0)
          return NextResponse.json({ error: 'No fields selected' }, { status: 400 });
        await query(
          `UPDATE students SET edit_requested=1, edit_requested_fields=?, edit_requested_note=?,
           edit_requested_at=NOW() WHERE email=?`,
          [JSON.stringify(body.requestedFields), sanitize(body.editNote), email]
        );
        return NextResponse.json({ success: true });
      }

      // ── Read current state first so we know whether this is a fresh
      // submission or a resubmission after a rejection. ──
      const [cur] = await query<any[]>(
        'SELECT submitted, status, updated_at FROM students WHERE email=?', [email]
      );

      // ── Block resubmit only while genuinely locked (already submitted
      // AND not rejected). A rejected record is always editable. ──
      if (cur?.submitted === 1 && cur?.status !== 'rejected') {
        return NextResponse.json({ error: 'Already submitted' }, { status: 403 });
      }

      // ── Cooldown guards against duplicate rapid resubmits (double-click,
      // retry storms). A genuine resubmission — done after reading the
      // rejection guide — will never realistically hit this. ──
      if (withinCooldown(cur?.updated_at)) {
        return NextResponse.json({ error: 'Please wait a few seconds before submitting again.' }, { status: 429 });
      }

      const wasRejected = cur?.status === 'rejected';
      const isResubmitting = body.submitted === 1 || body.submitted === true;

      const first = sanitize(body.first_name);
      const last  = sanitize(body.last_name);
      if (!first || !last)
        return NextResponse.json({ error: 'First name and last name are required' }, { status: 400 });
      const grade = body.grade_level ? Number(body.grade_level) : null;
      if (grade && ![7,8,9,10].includes(grade))
        return NextResponse.json({ error: 'Grade level must be 7, 8, 9, or 10' }, { status: 400 });
      const sectionId = body.section_id ? Number(body.section_id) : null;
      const schoolYear = /^\d{4}-\d{4}$/.test(String(body.school_year||'')) ? body.school_year : null;

      const setParts = [
        'first_name=?','last_name=?','middle_name=?','grade_level=?','section_id=?',
        'section_name=?','lrn=?','class_adviser=?','contact_number=?','guardian_name=?','guardian_relation=?',
        'guardian_contact_number=?','address=?','school_year=?',
      ];
      const values: any[] = [
        first, last, sanitize(body.middle_name), grade, sectionId,
        sanitize(body.section_name), sanitize(body.lrn),
        sanitize(body.class_adviser),
        sanitize(body.contact_number),
        sanitize(body.guardian_name),
        ['mother','father','guardian'].includes(body.guardian_relation) ? body.guardian_relation : 'guardian',
        sanitize(body.guardian_contact_number),
        sanitize(body.address), schoolYear,
      ];

      if (body.submitted !== undefined) {
        const submittedVal = body.submitted === 1 || body.submitted === true ? 1 : 0;
        setParts.push('submitted=?');
        values.push(submittedVal);
      }

      // ── This is the fix: if the record WAS rejected and the student is
      // resubmitting, always force status back to "pending" and clear the
      // old rejection reason server-side — regardless of what the client
      // sent. This guarantees a fixed resubmission never gets stuck
      // showing "rejected" and always lands back in the admin's Pending
      // queue with the corrected data actually saved. ──
      if (wasRejected && isResubmitting) {
        setParts.push('status=?');
        values.push('pending');
        setParts.push('rejection_reason=?');
        values.push(null);
      } else {
        if (body.status !== undefined) {
          const statusVal = ['pending','approved','rejected'].includes(body.status) ? body.status : 'pending';
          setParts.push('status=?');
          values.push(statusVal);
        }
        if (body.rejection_reason !== undefined) {
          const reasonVal = body.rejection_reason === null ? null : sanitize(body.rejection_reason);
          setParts.push('rejection_reason=?');
          values.push(reasonVal);
        }
      }

      setParts.push('updated_at=NOW()');
      values.push(email);

      await query(
        `UPDATE students SET ${setParts.join(',')} WHERE email=?`,
        values
      );

      // ── Notify the student na natanggap na ang submission ──
      if (isResubmitting) {
        const [studentRow] = await query<any[]>('SELECT id FROM students WHERE email=?', [email]);
        if (studentRow?.id) {
          await query(
            `INSERT INTO notifications (person_id, person_type, title, message, is_read) VALUES (?,?,?,?,0)`,
            [studentRow.id, 'student',
              'Submission Received',
              'Your ID is already submitted, wait for the update in this application.']
          );
        }
      }
    } else {
      return NextResponse.json({ error: 'Cannot update profile for this account type' }, { status: 403 });
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[PATCH /api/me] error:', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}