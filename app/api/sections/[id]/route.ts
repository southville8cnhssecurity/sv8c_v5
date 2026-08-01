import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { formatAdviserUsername, hashSectionPassword } from '@/lib/credentials';

function requireAdmin(session: any) {
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any)?.userType !== 'admin')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

// PATCH /api/sections/:id
// body: { name?: string, class_adviser?: string }
// Renaming the section regenerates its password (since password = section name).
// Renaming the adviser regenerates its username.
// Both are reflected back in the response ONCE so the admin can hand the
// new credentials to the adviser — they are never re-displayed afterward.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{id: string}> }) {
  const session = await getServerSession(authOptions);
  const deny = requireAdmin(session);
  if (deny) return deny;
  try {
    const { id } = await params;
    const { name, class_adviser } = await req.json();

    if (name === undefined && class_adviser === undefined)
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    if (name !== undefined && !name.trim())
      return NextResponse.json({ error: 'Section name cannot be empty' }, { status: 400 });
    if (class_adviser !== undefined && !class_adviser.trim())
      return NextResponse.json({ error: 'Class adviser cannot be empty' }, { status: 400 });

    const sec = await query<any[]>('SELECT id, grade_level, name, class_adviser FROM sections WHERE id=?', [id]);
    if (!sec.length) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    const current = sec[0];

    const setClauses: string[] = [];
    const values: any[] = [];
    let newUsername: string | undefined;
    let newPassword: string | undefined;

    if (name !== undefined) {
      const trimmedName = name.trim();
      setClauses.push('name=?'); values.push(trimmedName);
      // Password = section name -> changing the name changes the password
      newPassword = trimmedName.toUpperCase();
      setClauses.push('password_hash=?'); values.push(await hashSectionPassword(trimmedName));
    }
    if (class_adviser !== undefined) {
      const trimmedAdviser = class_adviser.trim();
      setClauses.push('class_adviser=?'); values.push(trimmedAdviser);
      let username = formatAdviserUsername(trimmedAdviser);
      const dup = await query<any[]>('SELECT id FROM sections WHERE username=? AND id!=?', [username, id]);
      if (dup.length) username = `${username} (G${current.grade_level})`;
      newUsername = username;
      setClauses.push('username=?'); values.push(username);
    }
    values.push(id);

    await query(`UPDATE sections SET ${setClauses.join(', ')} WHERE id=?`, values);

    // Keep already-enrolled students' denormalized fields in sync
    if (name !== undefined) {
      await query('UPDATE students SET section_name=? WHERE section_id=?', [name.trim(), id]);
    }
    if (class_adviser !== undefined) {
      await query('UPDATE students SET class_adviser=? WHERE section_id=?', [class_adviser.trim(), id]);
    }

    return NextResponse.json({
      success: true,
      ...(newUsername ? { username: newUsername } : {}),
      ...(newPassword ? { password: newPassword } : {}),
    });
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY')
      return NextResponse.json({ error: 'That name is already used in this grade' }, { status: 400 });
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{id: string}> }) {
  const session = await getServerSession(authOptions);
  const deny = requireAdmin(session);
  if (deny) return deny;
  try {
    const { id } = await params;
    const sec = await query<any[]>('SELECT id FROM sections WHERE id=?', [id]);
    if (!sec.length) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    const enrolled = await query<any[]>('SELECT COUNT(*) as c FROM students WHERE section_id=?', [id]);
    if (Number(enrolled[0].c) > 0)
      return NextResponse.json({
        error: `Cannot delete — ${Number(enrolled[0].c)} student(s) enrolled. Reassign them first.`
      }, { status: 400 });
    await query('DELETE FROM sections WHERE id=?', [id]);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}