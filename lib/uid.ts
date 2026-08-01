import { query } from './db';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_TRIES = 50;

function generateRaw(): string {
  return Array.from({ length: 12 }, () =>
    CHARS[Math.floor(Math.random() * CHARS.length)]
  ).join('');
}

// Accept both 'student' and 'students' — normalize internally
export async function generateUID(
  table: 'faculty' | 'staff' | 'students' | 'student'
): Promise<string> {
  const tbl = table === 'student' ? 'students' : table;
  for (let i = 0; i < MAX_TRIES; i++) {
    const uid = generateRaw();
    try {
      const rows = await query<any[]>(`SELECT id FROM ${tbl} WHERE uid=?`, [uid]);
      if (!rows.length) return uid;
    } catch { return uid; }
  }
  throw new Error(`Could not generate unique UID after ${MAX_TRIES} attempts`);
}
