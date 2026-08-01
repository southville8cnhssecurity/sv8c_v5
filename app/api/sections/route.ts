import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { formatAdviserUsername, hashSectionPassword } from '@/lib/credentials';

const DEFAULTS = [
  [7,'A',1],[7,'B',2],[7,'C',3],[7,'D',4],
  [8,'A',1],[8,'B',2],[8,'C',3],[8,'D',4],
  [9,'A',1],[9,'B',2],[9,'C',3],[9,'D',4],
  [10,'A',1],[10,'B',2],[10,'C',3],[10,'D',4],
] as const;

export async function GET() {
  try {
    const existing = await query<any[]>('SELECT COUNT(*) as c FROM sections');
    if (Number(existing[0].c) === 0) {
      for (const [grade, name, ord] of DEFAULTS) {
        await query('INSERT IGNORE INTO sections (grade_level,name,display_order) VALUES (?,?,?)', [grade, name, ord]);
      }
    }
    // NOTE: password_hash is deliberately never selected here — this route
    // is public (no session check) and used by registration dropdowns.
    const rows = await query<any[]>(
      'SELECT id, grade_level, name, class_adviser, username, display_order, created_at FROM sections ORDER BY grade_level, display_order, name'
    );
    const grouped: Record<number, any[]> = { 7:[], 8:[], 9:[], 10:[] };
    for (const r of rows) grouped[r.grade_level]?.push(r);
    return NextResponse.json(grouped);
  } catch (e: any) {
    return NextResponse.json({ 7:[], 8:[], 9:[], 10:[] });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.userType !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { grade_level, name, class_adviser } = await req.json();

    if (!grade_level || !name?.trim())
      return NextResponse.json({ error: 'Grade level and section name are required' }, { status: 400 });
    if (!class_adviser?.trim())
      return NextResponse.json({ error: 'Class adviser is required when creating a section' }, { status: 400 });
    if (![7,8,9,10].includes(Number(grade_level)))
      return NextResponse.json({ error: 'Grade must be 7, 8, 9, or 10' }, { status: 400 });

    const sectionName = name.trim();
    let username = formatAdviserUsername(class_adviser);

    // Disambiguate if another section already has the same adviser username
    const dup = await query<any[]>('SELECT id FROM sections WHERE username=?', [username]);
    if (dup.length) username = `${username} (G${grade_level})`;

    const password_hash = await hashSectionPassword(sectionName);

    const maxOrd = await query<any[]>('SELECT MAX(display_order) as m FROM sections WHERE grade_level=?', [grade_level]);
    const nextOrd = Number(maxOrd[0].m || 0) + 1;

    await query(
      'INSERT INTO sections (grade_level,name,class_adviser,username,password_hash,display_order) VALUES (?,?,?,?,?,?)',
      [Number(grade_level), sectionName, class_adviser.trim(), username, password_hash, nextOrd]
    );

    // Return the password in the EXACT casing that was hashed (uppercase) —
    // not the admin's raw input casing — so what's shown matches what
    // must actually be typed at login.
    return NextResponse.json({ success: true, username, password: sectionName.toUpperCase() });
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY')
      return NextResponse.json({ error: 'A section with that name already exists in this grade' }, { status: 400 });
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}