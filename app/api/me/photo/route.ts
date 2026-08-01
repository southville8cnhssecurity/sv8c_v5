import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { put } from '@vercel/blob';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
};
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userType = (session.user as any)?.userType;
  const email = session.user?.email;
  if (!['faculty','staff','student'].includes(userType))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const tableMap: Record<string,string> = { faculty:'faculty', staff:'staff', student:'students' };
  const prefMap:  Record<string,string> = { faculty:'fac', staff:'stf', student:'std' };

  try {
    const fd = await req.formData();
    const photoFile = fd.get('photo') as File | null;
    const sigFile   = fd.get('signature') as File | null;
    const table  = tableMap[userType];
    const prefix = prefMap[userType];

    async function saveFile(file: File, kind: string): Promise<string> {
      if (file.size > MAX_SIZE)
        throw new Error(`File too large — max 5MB`);
      // Get extension from MIME type (not filename — prevents evil.php.jpg attacks)
      const ext = ALLOWED_TYPES[file.type];
      if (!ext)
        throw new Error(`Invalid file type "${file.type}". Only JPEG, PNG, and WebP are allowed.`);
      const safeName = `${prefix}_${kind}_${Date.now()}.${ext}`;
      const blob = await put(safeName, file, {
        access: 'public',
        addRandomSuffix: false,
      });
      return blob.url;
    }

    if (photoFile && photoFile.size > 0) {
      const photoPath = await saveFile(photoFile, 'photo');
      await query(`UPDATE ${table} SET photo_path=?, updated_at=NOW() WHERE email=?`, [photoPath, email]);
    }
    if (sigFile && sigFile.size > 0) {
      const sigPath = await saveFile(sigFile, 'signature');
      await query(`UPDATE ${table} SET signature_path=?, updated_at=NOW() WHERE email=?`, [sigPath, email]);
    }
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}