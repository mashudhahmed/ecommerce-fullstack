// app/superadmin/layout.tsx – Enhanced with Collapsible Sidebar
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Shield,
  Store,
  BarChart3,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
// NAVIGATION ITEMS
// ============================================================

const navItems = [
  { href: '/superadmin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/superadmin/admins', label: 'Admins', icon: Shield },
  { href: '/superadmin/users', label: 'Users', icon: Users },
  { href: '/superadmin/vendors', label: 'Vendors', icon: Store },
  { href: '/superadmin/statistics', label: 'Statistics', icon: BarChart3 },
  { href: '/admin/reports', label: 'Reports', icon: FileSpreadsheet },
  { href: '/superadmin/settings', label: 'Settings', icon: Settings },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // ✅ Redirect if not superadmin
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role !== 'superadmin') {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  // ✅ Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('superadmin-sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  // ✅ Save sidebar state
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('superadmin-sidebar-collapsed', String(newState));
  };

  // ✅ Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  if (isLoading) {
    return <SuperAdminLayoutSkeleton />;
  }

  const sidebarWidth = isCollapsed ? 'w-18' : 'w-64';

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 z-50 flex h-screen shrink-0 flex-col border-r border-border bg-background transition-all duration-300',
          sidebarWidth,
          isMobileOpen ? 'left-0' : '-left-full lg:left-0'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center gap-3 border-b border-border p-4',
            isCollapsed && 'justify-center'
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-950">
            <Shield className="h-4.5 w-4.5 text-orange-500" />
          </div>
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-black tracking-tight">Super Admin</h2>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            </div>
          )}
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="hidden h-8 w-8 shrink-0 rounded-full lg:flex"
              onClick={toggleSidebar}
              aria-label="Collapse sidebar"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full lg:hidden"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isCollapsed && (
          <div className="hidden justify-center border-b border-border py-2 lg:flex">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors',
                  isCollapsed && 'justify-center px-0',
                  isActive
                    ? 'bg-zinc-950 text-white shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    isCollapsed && 'h-5 w-5',
                    isActive && 'text-orange-500'
                  )}
                />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer - Logout */}
        <div className="border-t border-border p-3">
          <button
            onClick={handleLogout}
            className={cn(
              'flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20',
              isCollapsed && 'justify-center px-0'
            )}
            title={isCollapsed ? 'Logout' : undefined}
          >
            <LogOut className={cn('h-4 w-4 shrink-0', isCollapsed && 'h-5 w-5')} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Mobile menu toggle */}
        <div className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-background/80 p-4 backdrop-blur-sm lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-950">
              <Shield className="h-4 w-4 text-orange-500" />
            </div>
            <h1 className="text-lg font-black tracking-tight">Super Admin</h1>
          </div>
        </div>
        <div className="p-4 md:p-8 lg:p-10">{children}</div>
      </main>
    </div>
  );
}

// ============================================================
// SKELETON LOADING STATE
// ============================================================

function SuperAdminLayoutSkeleton() {
  return (
    <div className="flex min-h-screen">
      <div className="w-64 space-y-6 border-r border-border p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="space-y-1.5">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-full" />
          ))}
        </div>
        <div className="border-t border-border pt-4">
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
      </div>
      <div className="flex-1 p-8">
        <Skeleton className="mb-2 h-9 w-56" />
        <Skeleton className="mb-8 h-4 w-72" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
      </div>
    </div>
  );
}