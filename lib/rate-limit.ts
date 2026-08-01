// Shared in-memory windowed rate limiter.
// Same pattern already used in app/api/auth/pin/route.ts — extracted here
// so it can also protect NextAuth's authorize() for admin/adviser/faculty/
// staff/student login, which previously had no attempt limiting at all.

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 10;

export function isLoginRateLimited(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now > rec.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}