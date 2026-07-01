// proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/products',
  '/products/:path*',
];

// Admin routes
const adminRoutes = ['/admin'];

// Protected routes
const protectedRoutes = [
  '/cart',
  '/checkout',
  '/orders',
  '/orders/:path*',
  '/dashboard',
  '/dashboard/:path*',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('token')?.value;

  // Check if path is public
  const isPublicRoute = publicRoutes.some((route) => {
    if (route.includes(':path*')) {
      const baseRoute = route.replace('/:path*', '');
      return pathname === baseRoute || pathname.startsWith(`${baseRoute}/`);
    }
    return pathname === route || pathname.startsWith(`${route}/`);
  });

  // Check if path is protected
  const isProtectedRoute = protectedRoutes.some((route) => {
    if (route.includes(':path*')) {
      const baseRoute = route.replace('/:path*', '');
      return pathname === baseRoute || pathname.startsWith(`${baseRoute}/`);
    }
    return pathname === route || pathname.startsWith(`${route}/`);
  });

  // Check if path is admin
  const isAdminRoute = adminRoutes.some((route) => {
    return pathname === route || pathname.startsWith(`${route}/`);
  });

  // Redirect authenticated users away from auth pages
  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Redirect unauthenticated users from protected routes
  if (!token && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check admin access
  if (token && isAdminRoute) {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );
      const role = payload.role;
      if (role !== 'admin' && role !== 'superadmin') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}