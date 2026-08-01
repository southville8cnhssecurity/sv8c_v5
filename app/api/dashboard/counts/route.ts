import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.userType !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const [
      pendingStudentsRow,
      pendingStaffRow,
      studentsNeedingIdRow,
      staffNeedingIdRow,
    ] = await Promise.all([
      query<any[]>(`SELECT COUNT(*) as c FROM students WHERE status = 'pending'`),
      query<any[]>(`SELECT COUNT(*) as c FROM staff WHERE status = 'pending'`),
      query<any[]>(`
        SELECT COUNT(*) as c FROM students s
        WHERE s.status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM generated_ids g
          WHERE g.person_id = s.id AND g.person_type = 'student'
        )
      `),
      query<any[]>(`
        SELECT COUNT(*) as c FROM staff s
        WHERE s.status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM generated_ids g
          WHERE g.person_id = s.id AND g.person_type = 'staff'
        )
      `),
    ]);

    return NextResponse.json({
      pendingStudents: Number(pendingStudentsRow[0]?.c || 0),
      pendingStaff: Number(pendingStaffRow[0]?.c || 0),
      pendingIds: Number(studentsNeedingIdRow[0]?.c || 0) + Number(staffNeedingIdRow[0]?.c || 0),
    });
  } catch (e: any) {
    return NextResponse.json({ pendingStudents: 0, pendingStaff: 0, pendingIds: 0 });
  }
}