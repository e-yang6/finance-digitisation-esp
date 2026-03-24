import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import { NextResponse } from 'next/server';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const token = req.auth;

  // Not authenticated → redirect to login
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = token.user?.role;

  // Officer-only routes
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/review')) {
    if (role !== 'officer') {
      return NextResponse.redirect(new URL('/apply', req.url));
    }
  }

  // Applicant-only routes
  if (pathname.startsWith('/apply')) {
    if (role !== 'applicant') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/apply/:path*',
    '/dashboard/:path*',
    '/review/:path*',
  ],
};
