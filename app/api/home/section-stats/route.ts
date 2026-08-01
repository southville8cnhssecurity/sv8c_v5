import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error:'Unauthorized' },{ status:401 });
  try {
    const sections = await query<any[]>('SELECT * FROM sections ORDER BY grade_level,display_order,name');
    const sectionStats = await Promise.all(sections.map(async sec => {
      const [total]    = await query<any[]>('SELECT COUNT(*) as c FROM students WHERE section_id=? AND status="approved"',[sec.id]);
      const [withIds]  = await query<any[]>(`SELECT COUNT(DISTINCT g.person_id) as c FROM generated_ids g
        JOIN students s ON s.id=g.person_id AND g.person_type='student' WHERE s.section_id=?`,[sec.id]);
      return { ...sec, total: total.c, with_ids: withIds.c };
    }));
    const byGrade: Record<number,any[]> = {7:[],8:[],9:[],10:[]};
    for (const s of sectionStats) byGrade[s.grade_level]?.push(s);
    return NextResponse.json(byGrade);
  } catch {
    return NextResponse.json({7:[],8:[],9:[],10:[]});
  }
}
