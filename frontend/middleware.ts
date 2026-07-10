// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define route categories
const publicRoutes = [
  '/',
  '/products',
  '/products/:path*',
];

const authRoutes = [
  '/login',
  '/register',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
];

const protectedRoutes = [
  '/dashboard',
  '/dashboard/:path*',
  '/cart',
  '/checkout',
  '/orders',
  '/orders/:path*',
  '/profile',
  '/profile/:path*',
  // ✅ Vendor routes
  '/vendor',
  '/vendor/:path*',
  // ✅ SuperAdmin routes
  '/superadmin',
  '/superadmin/:path*',
];

const adminRoutes = [
  '/admin',
  '/admin/:path*',
];

// Helper functions to check route types
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some((route) => {
    if (route.includes(':path*')) {
      const baseRoute = route.replace('/:path*', '');
      return pathname === baseRoute || pathname.startsWith(`${baseRoute}/`);
    }
    return pathname === route;
  });
}

function isAuthRoute(pathname: string): boolean {
  return authRoutes.some((route) => pathname === route);
}

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some((route) => {
    if (route.includes(':path*')) {
      const baseRoute = route.replace('/:path*', '');
      return pathname === baseRoute || pathname.startsWith(`${baseRoute}/`);
    }
    return pathname === route;
  });
}

function isAdminRoute(pathname: string): boolean {
  return adminRoutes.some((route) => {
    if (route.includes(':path*')) {
      const baseRoute = route.replace('/:path*', '');
      return pathname === baseRoute || pathname.startsWith(`${baseRoute}/`);
    }
    return pathname === route;
  });
}

// Skip middleware for these paths
const skipPaths = [
  '/_next',
  '/_next/static',
  '/_next/image',
  '/favicon.ico',
  '/api',
  '/api/auth',
  '/public',
];

function shouldSkipMiddleware(pathname: string): boolean {
  return skipPaths.some((path) => pathname.startsWith(path));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes
  if (shouldSkipMiddleware(pathname)) {
    return NextResponse.next();
  }

  // ✅ Check for session cookie (set by backend after login)
  const accessToken = request.cookies.get('access_token')?.value;
  const isAuthenticated = !!accessToken;

  // ✅ If authenticated and trying to access auth pages, redirect to dashboard
  if (isAuthenticated && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ✅ If not authenticated and trying to access protected routes, redirect to login
  if (!isAuthenticated && isProtectedRoute(pathname)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ✅ If authenticated and trying to access admin routes, check role via API
  // We'll let the client-side handle admin authorization
  // The backend will enforce proper role checks

  // ✅ For all other cases, proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};