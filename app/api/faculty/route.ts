import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

const SAFE_COLS = `id, faculty_number, first_name, last_name, middle_name,
  subject, department, contact_number, address, photo_path, signature_path,
  qr_code_value, uid, email, status, valid_until, created_at, updated_at`;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  const status = searchParams.get('status');
  let sql = `SELECT ${SAFE_COLS} FROM faculty WHERE 1=1`;
  const params: any[] = [];
  if (search) { sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR faculty_number LIKE ?)'; params.push(`%${search}%`,`%${search}%`,`%${search}%`); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  sql += ' ORDER BY created_at DESC';
  try {
    const rows = await query<any[]>(sql, params);
    return NextResponse.json(rows);
  } catch { return NextResponse.json([]); }
}
