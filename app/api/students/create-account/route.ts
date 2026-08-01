import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateUID } from '@/lib/uid';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

function academicYear(): number {
  return new Date().getMonth() >= 5
    ? new Date().getFullYear() + 1
    : new Date().getFullYear();
}

async function nextStudentNumber(): Promise<string> {
  const yy = String(new Date().getFullYear()).slice(-2);
  const prefix = `${yy}-`;
  const rows = await query<any[]>(
    `SELECT student_number FROM students
     WHERE student_number LIKE ? ORDER BY student_number DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let nextSeq = 1;
  if (rows.length) {
    const lastSeq = parseInt(rows[0].student_number.split('-')[1], 10);
    if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password)
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    if (!email.toLowerCase().trim().endsWith('@gmail.com'))
      return NextResponse.json({ error: 'Must use a Gmail address (@gmail.com)' }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

    const clean = email.toLowerCase().trim();
    const existing = await query<any[]>('SELECT id FROM students WHERE email=?', [clean]);
    if (existing.length)
      return NextResponse.json({ error: 'This Gmail is already registered' }, { status: 400 });

    const uid = await generateUID('students');
    const password_hash = await bcrypt.hash(password, 12);
    const tempToken = randomBytes(12).toString('hex');

    const result = await query<any>(
      `INSERT INTO students (student_number, qr_code_value, uid, email, password_hash, valid_until, status)
       VALUES (?,?,?,?,?,?,'pending')`,
      [`STD-TEMP-${tempToken}`, `QR-TEMP-${tempToken}`, uid, clean, password_hash, academicYear()]
    );
    const insertId = result.insertId;

    const student_number = await nextStudentNumber();
    const qr_code_value  = `SV8CNHS-STD-${String(insertId).padStart(6, '0')}`;
    await query(
      'UPDATE students SET student_number=?, qr_code_value=? WHERE id=?',
      [student_number, qr_code_value, insertId]
    );

    // ── Notify the student that their submission was received ──
    await query(
      `INSERT INTO notifications (person_id, person_type, title, message, is_read) VALUES (?,?,?,?,0)`,
      [insertId, 'student',
        'Submission Received',
        'Your ID is already submitted, wait for the update in this application.']
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}