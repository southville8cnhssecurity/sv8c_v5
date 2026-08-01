import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateUID } from '@/lib/uid';
import { formatQRValue } from '@/lib/qr';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { put } from '@vercel/blob';

function academicYear(): number {
  const now = new Date();
  // Philippine school year: June–May. If past June, next year is the valid year.
  return now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear();
}

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();
    const first_name     = fd.get('first_name') as string;
    const last_name      = fd.get('last_name') as string;
    const middle_name    = fd.get('middle_name') as string;
    const position       = fd.get('position') as string;
    const department     = fd.get('department') as string;
    const contact_number = fd.get('contact_number') as string;
    const address        = fd.get('address') as string;
    const email          = (fd.get('email') as string)?.toLowerCase().trim();
    const password       = fd.get('password') as string;
    const photoFile      = fd.get('photo') as File | null;
    const sigFile        = fd.get('signature') as File | null;

    if (!first_name || !last_name || !position || !email || !password)
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });

    if (!email.endsWith('@gmail.com'))
      return NextResponse.json({ error: 'Please use a Gmail address (@gmail.com)' }, { status: 400 });

    const existing = await query<any[]>('SELECT id FROM staff WHERE email = ?', [email]);
    if (existing.length) return NextResponse.json({ error: 'This Gmail is already registered' }, { status: 400 });

    const ALLOWED_MIME: Record<string,string> = { 'image/jpeg':'jpg','image/jpg':'jpg','image/png':'png','image/webp':'webp' };
    const MAX_SIZE = 5 * 1024 * 1024;

    async function saveUpload(file: File, prefix: string): Promise<string> {
      if (file.size > MAX_SIZE) throw new Error('File too large — max 5MB');
      const ext = ALLOWED_MIME[file.type];
      if (!ext) throw new Error(`Invalid file type "${file.type}". Only JPEG, PNG, and WebP allowed.`);
      const fname = `${prefix}_${Date.now()}.${ext}`;
      const blob = await put(fname, file, {
        access: 'public',
        addRandomSuffix: false,
      });
      return blob.url;
    }

    let photo_path = '', signature_path = '';

    if (photoFile && photoFile.size > 0) photo_path = await saveUpload(photoFile, 'stf_photo');
    if (sigFile && sigFile.size > 0) signature_path = await saveUpload(sigFile, 'stf_sig');

    const tempToken = randomBytes(8).toString('hex');
    const uid           = await generateUID('staff');
    const password_hash = await bcrypt.hash(password, 12);

    const result = await query<any>(
      `INSERT INTO staff
         (staff_number, first_name, last_name, middle_name, position, department,
          contact_number, address, photo_path, signature_path,
          qr_code_value, uid, email, password_hash, valid_until)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [`STF-TEMP-${tempToken}`, first_name, last_name, middle_name||null, position,
       department||null, contact_number||null, address||null,
       photo_path||null, signature_path||null,
       `QR-TEMP-${tempToken}`, uid, email, password_hash,
       academicYear()]
    );
    const insertId = result.insertId;
    const staff_number  = `STF-${String(insertId).padStart(4, '0')}`;
    const qr_code_value = formatQRValue('STF', String(insertId));
    await query('UPDATE staff SET staff_number=?, qr_code_value=? WHERE id=?', [staff_number, qr_code_value, insertId]);

    return NextResponse.json({ success: true, staff_number });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}