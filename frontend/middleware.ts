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

  // Note: The frontend (Vercel) and backend API (Render) are hosted on separate domains.
  // HttpOnly session cookies from Render are cross-origin and never sent to Vercel Edge runtime.
  // Protected route authorization and role-based access control are enforced on the client side
  // via layout guards (AdminLayout, VendorLayout, ProfilePage, etc.) and backed by API JWT checks.
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