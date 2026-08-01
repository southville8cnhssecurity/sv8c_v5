import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
    const year = new Date().getFullYear();
    const [[totalIds],[facultyIds],[staffIds],[studentIds],
           [facultyCount],[staffCount],[studentCount],[pendingCount]] = await Promise.all([
      query<any[]>('SELECT COUNT(*) as c FROM generated_ids'),
      query<any[]>('SELECT COUNT(*) as c FROM generated_ids WHERE person_type="faculty" AND YEAR(created_at)=?',[year]),
      query<any[]>('SELECT COUNT(*) as c FROM generated_ids WHERE person_type="staff"   AND YEAR(created_at)=?',[year]),
      query<any[]>('SELECT COUNT(*) as c FROM generated_ids WHERE person_type="student" AND YEAR(created_at)=?',[year]),
      query<any[]>('SELECT COUNT(*) as c FROM faculty'),
      query<any[]>('SELECT COUNT(*) as c FROM staff'),
      query<any[]>('SELECT COUNT(*) as c FROM students'),
      query<any[]>('SELECT COUNT(*) as c FROM students WHERE status="pending"'),
    ]);
    return NextResponse.json({
      totalIds:totalIds.c, facultyIds:facultyIds.c, staffIds:staffIds.c, studentIds:studentIds.c,
      facultyCount:facultyCount.c, staffCount:staffCount.c, studentCount:studentCount.c,
      pendingStudents:pendingCount.c,
    });
  } catch {
    return NextResponse.json({ totalIds:0,facultyIds:0,staffIds:0,studentIds:0,facultyCount:0,staffCount:0,studentCount:0,pendingStudents:0 });
  }
}
