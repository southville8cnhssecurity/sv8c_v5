import { NextRequest, NextResponse } from 'next/server';

// PIN → portal mapping lives only on the server (env vars), never shipped to the client.
function getPinMap(): Record<string, string> {
  return {
    [process.env.PORTAL_PIN_STUDENT || '']: 'student',
    [process.env.PORTAL_PIN_FACULTY || '']: 'faculty',
    [process.env.PORTAL_PIN_STAFF   || '']: 'staff',
    [process.env.PORTAL_PIN_ADMIN   || '']: 'admin',
  };
}

// Simple in-memory rate limiter per IP — 4-digit PINs only have 10,000
// combinations, so brute force must be slowed down.
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const { pin } = await req.json();
    if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin)) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 400 });
    }

    const map = getPinMap();
    const userType = map[pin];
    if (!userType) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    return NextResponse.json({ userType });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
