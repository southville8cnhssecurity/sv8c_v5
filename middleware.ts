import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Pages an adviser account IS allowed to open. Everything else under the
// admin dashboard redirects them back here — enforced server-side, so it
// can't be bypassed by typing a URL directly or editing the DOM.
const ADVISER_ALLOWED = ['/student-submit', '/activity-log'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only guard dashboard-area pages — skip api/_next/static/public assets.
  const isDashboardPage = [
    '/home', '/faculty-submit', '/staff-submit', '/student-submit',
    '/create-id', '/settings', '/activity-log', '/reports',
  ].some(p => pathname.startsWith(p));

  if (!isDashboardPage) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.next(); // let the page-level layout handle the redirect-to-login

  const isAdviser = (token as any).isAdviser === true;
  if (isAdviser && !ADVISER_ALLOWED.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/student-submit', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/home/:path*', '/faculty-submit/:path*', '/staff-submit/:path*',
    '/student-submit/:path*', '/create-id/:path*', '/settings/:path*',
    '/activity-log/:path*', '/reports/:path*',
  ],
};