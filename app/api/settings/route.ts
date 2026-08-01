import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

// GET /api/settings — returns all settings as { settings: { key: value } }
export async function GET() {
  try {
    const rows = await query<any[]>('SELECT setting_key, value FROM settings');
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.setting_key] = row.value;
    }
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('GET /api/settings error:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

// PATCH /api/settings — body: { key: string, value: string }
export async function PATCH(req: NextRequest) {
  try {
    const { key, value } = await req.json();
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'key and value are required' }, { status: 400 });
    }
    await query(
      `INSERT INTO settings (setting_key, value)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [key, value]
    );
    return NextResponse.json({ success: true, key, value });
  } catch (error) {
    console.error('PATCH /api/settings error:', error);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}
