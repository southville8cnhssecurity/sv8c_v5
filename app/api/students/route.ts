import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

const SAFE_COLS = `id, student_number, first_name, last_name, middle_name,
  grade_level, section_id, section_name, lrn, class_adviser, guardian_contact_number,
  contact_number, guardian_name, guardian_relation, address, photo_path,
  qr_code_value, uid, email, status, valid_until, school_year, created_at, updated_at`;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error:'Unauthorized' },{ status:401 });

  const userType = (session.user as any)?.userType;
  const isAdviser = (session.user as any)?.isAdviser === true;

  if (userType !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search  = searchParams.get('search');
  const status  = searchParams.get('status');
  const grade   = searchParams.get('grade');
  const section = searchParams.get('section_id');

  let sql = `SELECT ${SAFE_COLS} FROM students WHERE 1=1`;
  const params: any[] = [];

  if (isAdviser) {
    // ── HARD SCOPE: an adviser-flagged session can only ever see their own
    // section's students, regardless of what grade/section_id the client
    // sends. This is the actual security boundary — not the UI. ──
    const sectionId = (session.user as any)?.sectionId;
    if (!sectionId) return NextResponse.json([], { status: 200 });
    sql += ' AND section_id=?';
    params.push(sectionId);
  } else {
    if (grade)   { sql += ' AND grade_level=?'; params.push(grade); }
    if (section) { sql += ' AND section_id=?'; params.push(section); }
  }

  if (search) { sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR student_number LIKE ? OR lrn LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`); }
  if (status) { sql += ' AND status=?'; params.push(status); }

  sql += ' ORDER BY grade_level, section_name, last_name';
  try {
    return NextResponse.json(await query<any[]>(sql, params));
  } catch { return NextResponse.json([]); }
}