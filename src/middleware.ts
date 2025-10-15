import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isAdmin = req.auth?.user?.role === 'ADMIN';

  // Public routes that don't require authentication
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/register',
    '/auth/verify-email',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/api/auth',
  ];

  const isPublicRoute = publicRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  // API routes that require authentication
  const isApiRoute = nextUrl.pathname.startsWith('/api');
  const isAuthApiRoute = nextUrl.pathname.startsWith('/api/auth');

  // Admin routes
  const isAdminRoute = nextUrl.pathname.startsWith('/admin');

  // Protect admin routes
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/auth/login', nextUrl));
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL('/unauthorized', nextUrl));
    }
  }

  // Redirect to dashboard if logged in user tries to access auth pages
  if (isLoggedIn && nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  // Protect all non-public routes
  if (!isPublicRoute && !isLoggedIn && !isAuthApiRoute) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/auth/login', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
