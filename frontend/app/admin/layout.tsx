'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Store,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  Globe,
  BarChart3,
  SlidersHorizontal,
  ExternalLink,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// NAVIGATION ITEMS (RBAC-DRIVEN)
// ============================================================

const storeNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/users', label: 'Customers', icon: Users },
  { href: '/admin/vendors', label: 'Vendors', icon: Store },
  { href: '/admin/payouts', label: 'Vendor Payouts', icon: DollarSign },
  { href: '/admin/reports', label: 'Reports', icon: FileSpreadsheet },
  { href: '/admin/settings', label: 'Store Settings', icon: Settings },
];

const governanceNavItems = [
  { href: '/admin/admins', label: 'Admin Team', icon: Shield },
  { href: '/admin/statistics', label: 'Platform Stats', icon: BarChart3 },
  { href: '/admin/platform-settings', label: 'Platform Config', icon: SlidersHorizontal },
];

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // ✅ Load sidebar state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin-sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  // ✅ Save sidebar state
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('admin-sidebar-collapsed', String(newState));
  };

  // ✅ Auth check
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role !== 'admin' && user?.role !== 'superadmin') {
        router.push('/');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  // ✅ Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  // ✅ Loading state
  if (isLoading) {
    return <AdminLayoutSkeleton />;
  }

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-64';
  const isSuperAdmin = user?.role === 'superadmin';

  return (
    <div className="flex min-h-screen bg-muted/20">
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 z-50 h-screen border-r bg-background shrink-0 flex flex-col transition-all duration-300',
          sidebarWidth,
          isMobileOpen ? 'left-0' : '-left-full lg:left-0'
        )}
      >
        {/* Header */}
        <div className={cn(
          'flex items-center border-b p-4',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}>
          {!isCollapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Shield className={cn('h-5 w-5', isSuperAdmin ? 'text-violet-600' : 'text-orange-500')} />
                <h2 className="font-bold text-base tracking-tight truncate">
                  SnapCart Admin
                </h2>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  isSuperAdmin 
                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300'
                )}>
                  {isSuperAdmin ? 'Super Admin' : 'Administrator'}
                </span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <Shield className={cn('h-6 w-6', isSuperAdmin ? 'text-violet-600' : 'text-orange-500')} />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex cursor-pointer"
            onClick={toggleSidebar}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden cursor-pointer"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-4 overflow-y-auto">
          {/* Store Operations */}
          <div>
            {!isCollapsed && (
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                Store Operations
              </p>
            )}
            <div className="space-y-0.5">
              {storeNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname === item.href || pathname?.startsWith(item.href + '/');

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isCollapsed && 'justify-center',
                      isActive
                        ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400 font-semibold'
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
            </div>
          </div>

          {/* Platform Governance (Super Admin Only) */}
          {isSuperAdmin && (
            <div className="pt-2 border-t border-border/60">
              {!isCollapsed && (
                <div className="flex items-center justify-between px-3 pb-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-400">
                    Governance
                  </p>
                  <span className="rounded-full bg-violet-100 dark:bg-violet-950/50 px-1.5 py-0.5 text-[9px] font-bold text-violet-700 dark:text-violet-300">
                    Root
                  </span>
                </div>
              )}
              <div className="space-y-0.5">
                {governanceNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isCollapsed && 'justify-center',
                        isActive
                          ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/20 dark:text-violet-300 font-semibold'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isCollapsed && 'h-5 w-5',
                          isActive && 'text-violet-600 dark:text-violet-400'
                        )}
                      />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* Storefront Link */}
        <div className="border-t p-2 space-y-1">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-950/20',
              isCollapsed && 'justify-center'
            )}
            title={isCollapsed ? 'View Storefront' : undefined}
          >
            <Globe className={cn('h-4 w-4 shrink-0', isCollapsed && 'h-5 w-5')} />
            {!isCollapsed && (
              <span className="flex items-center gap-1.5 flex-1 justify-between">
                <span>View Storefront</span>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </span>
            )}
          </Link>
        </div>

        {/* Footer - Logout */}
        <div className="border-t p-2">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors w-full text-red-500 hover:text-red-600',
              isCollapsed && 'justify-center'
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
        {/* Mobile menu toggle & Quick Storefront */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b bg-background sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-500" />
              <h1 className="text-lg font-bold">
                {isSuperAdmin ? 'Super Admin' : 'Admin Panel'}
              </h1>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link href="/">
              <Globe className="h-3.5 w-3.5 text-orange-600" />
              <span>Storefront</span>
            </Link>
          </Button>
        </div>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

// ============================================================
// SKELETON LOADING STATE
// ============================================================

function AdminLayoutSkeleton() {
  return (
    <div className="flex min-h-screen">
      <div className="w-64 border-r p-4 space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-24" />
        <div className="space-y-2 mt-4">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
        <div className="border-t pt-4 mt-4">
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
      <div className="flex-1 p-8">
        <Skeleton className="h-8 w-48 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full mt-4" />
      </div>
    </div>
  );
}