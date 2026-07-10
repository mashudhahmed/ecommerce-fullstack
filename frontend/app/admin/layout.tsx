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
} from 'lucide-react';
import { toast } from 'sonner';

// ============================================================
// NAVIGATION ITEMS
// ============================================================

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/vendors', label: 'Vendors', icon: Store },
  { href: '/admin/reports', label: 'Reports', icon: FileSpreadsheet },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
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
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

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
                <Shield className="h-5 w-5 text-orange-500" />
                <h2 className="font-bold text-lg truncate">
                  {isSuperAdmin ? 'Super Admin' : 'Admin Panel'}
                </h2>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {user?.name || user?.email}
              </p>
            </div>
          )}
          {isCollapsed && (
            <Shield className="h-6 w-6 text-orange-500" />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={toggleSidebar}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  isCollapsed && 'justify-center',
                  isActive 
                    ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/20 dark:text-orange-400' 
                    : 'hover:bg-muted hover:text-foreground'
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={cn(
                  'h-4 w-4 shrink-0',
                  isCollapsed && 'h-5 w-5',
                  isActive && 'text-orange-500'
                )} />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

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
        {/* Mobile menu toggle */}
        <div className="lg:hidden flex items-center gap-4 p-4 border-b bg-background sticky top-0 z-30">
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