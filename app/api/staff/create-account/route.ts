import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateUID } from '@/lib/uid';
import { formatQRValue } from '@/lib/qr';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

function academicYear(): number {
  const now = new Date();
  return now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear();
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    if (!email.endsWith('@gmail.com')) return NextResponse.json({ error: 'Must use a Gmail address (@gmail.com)' }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });

    const existing = await query<any[]>('SELECT id FROM staff WHERE email=?', [email.toLowerCase().trim()]);
    if (existing.length) return NextResponse.json({ error: 'This Gmail is already registered' }, { status: 400 });

    const uid = await generateUID('staff');
    const password_hash = await bcrypt.hash(password, 12);
    const validUntil = academicYear();

    const result = await query<any>(
      `INSERT INTO staff (staff_number, first_name, last_name, position, qr_code_value, uid, email, password_hash, valid_until, status)
       VALUES (?, '', '', 'Staff', ?, ?, ?, ?, ?, 'pending')`,
      [`STF-TEMP-${randomBytes(8).toString("hex")}`, `QR-TEMP-${randomBytes(8).toString("hex")}`, uid, email.toLowerCase().trim(), password_hash, validUntil]
    );
    const insertId = result.insertId;
    const staff_number = `STF-${String(insertId).padStart(4, '0')}`;
    const qr_code_value = formatQRValue('STF', String(insertId));
    await query('UPDATE staff SET staff_number=?, qr_code_value=? WHERE id=?', [staff_number, qr_code_value, insertId]);

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
