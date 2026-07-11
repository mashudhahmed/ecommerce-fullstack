// components/shared/Header.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import {
  ShoppingCart,
  User,
  LogOut,
  Settings,
  Bell,
  Menu,
  X,
  LayoutDashboard,
  Store,
  Shield,
  Users,
  Package,
  ChevronDown,
  ShoppingBag,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { useWebSocket } from '@/hooks/useWebSocket';
import { notificationService, Notification } from '@/services/notification.service';
import { getInitials, cn, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
// HEADER COMPONENT
// ============================================================

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { totalItems } = useCart();
  const { count: wishlistCount } = useWishlist();

  // State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Refs
  const notificationInterval = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // ============================================================
  // WEBSOCKET - Production Grade (No UI Indicator)
  // ============================================================

  const {
    isConnected,
    lastMessage,
    connectionError,
    reconnectAttempts,
  } = useWebSocket({
    autoConnect: true,
    onConnect: () => {
      console.log('🔌 WebSocket: Connected to notification service');
      fetchNotifications();
    },
    onDisconnect: () => {
      console.log('🔌 WebSocket: Disconnected from notification service');
    },
    onMessage: (data) => {
      if (data?.event === 'notification') {
        handleNewNotification(data.data);
      }
    },
    onError: (error) => {
      console.error('WebSocket error:', error);
    },
    onReconnect: (attempt) => {
      console.log(`🔄 WebSocket: Reconnecting (attempt ${attempt})`);
    },
  });

  // ============================================================
  // NOTIFICATION HANDLERS
  // ============================================================

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !mountedRef.current) return;

    setIsLoadingNotifications(true);
    setNotificationError(null);

    try {
      const result = await notificationService.getNotifications(1, 20);
      if (mountedRef.current) {
        setNotifications(result.data);
        setUnreadCount(result.unread);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      if (mountedRef.current) {
        setNotificationError('Failed to load notifications');
      }
    } finally {
      if (mountedRef.current) {
        setIsLoadingNotifications(false);
      }
    }
  }, [isAuthenticated]);

  const handleNewNotification = useCallback((notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);

    // ✅ Show toast for important notifications
    if (notification.type === 'order' || notification.type === 'vendor') {
      toast.info(notification.title, {
        description: notification.message,
        duration: 5000,
        action: notification.link ? {
          label: 'View',
          onClick: () => router.push(notification.link!),
        } : undefined,
      });
    } else {
      toast.info(notification.title);
    }
  }, [router]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  }, []);

  // ============================================================
  // EFFECTS
  // ============================================================

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (notificationInterval.current) {
        clearInterval(notificationInterval.current);
        notificationInterval.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();

      notificationInterval.current = setInterval(() => {
        fetchNotifications();
      }, 60000);
    } else {
      setNotifications([]);
      setUnreadCount(0);
      if (notificationInterval.current) {
        clearInterval(notificationInterval.current);
        notificationInterval.current = null;
      }
    }

    return () => {
      if (notificationInterval.current) {
        clearInterval(notificationInterval.current);
        notificationInterval.current = null;
      }
    };
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => {
    if (lastMessage?.event === 'notification') {
      handleNewNotification(lastMessage.data);
    }
  }, [lastMessage, handleNewNotification]);

  // ============================================================
  // AUTH HANDLERS
  // ============================================================

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Failed to logout');
    }
  }, [logout, router]);

  // ============================================================
  // HELPERS
  // ============================================================

  const getDashboardLink = useCallback(() => {
    if (!user) return '/dashboard';
    switch (user.role) {
      case 'superadmin': return '/superadmin';
      case 'admin': return '/admin';
      case 'vendor': return '/vendor/dashboard';
      default: return '/dashboard';
    }
  }, [user]);

  const getRoleBadgeColor = useCallback((role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400';
      case 'admin': return 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400';
      case 'vendor': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400';
      default: return 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400';
    }
  }, []);

  const getNavItems = useCallback(() => {
    const items = [
      { href: '/products', label: 'Products', icon: ShoppingBag },
      { href: '/orders', label: 'Orders', icon: ShoppingCart },
      { href: '/wishlist', label: 'Wishlist', icon: Heart },
    ];

    if (user?.role === 'vendor') {
      items.push({ href: '/vendor/dashboard', label: 'Vendor Panel', icon: Store });
    }

    if (user?.role === 'admin' || user?.role === 'superadmin') {
      items.push({ href: '/admin', label: 'Admin Panel', icon: Shield });
    }

    if (user?.role === 'superadmin') {
      items.push({ href: '/superadmin', label: 'Super Admin', icon: Users });
    }

    return items;
  }, [user]);

  // ============================================================
  // RENDER
  // ============================================================

  if (isLoading) {
    return <HeaderSkeleton />;
  }

  const navItems = getNavItems();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            <Link href="/" className="group flex items-center gap-2.5" aria-label="SnapCart Home">
              <div className="relative h-8 w-8 shrink-0">
                <Image
                  src="/logo.png"
                  alt="SnapCart"
                  width={32}
                  height={32}
                  className="object-contain"
                  priority
                />
              </div>
              <span className="text-xl font-black tracking-tight text-foreground transition-colors duration-200 group-hover:text-orange-600">
                SnapCart
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-zinc-950 text-white'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-1">
            {/* Wishlist */}
            <Link href="/wishlist" className="relative" aria-label="Wishlist">
              <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="View wishlist">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && isAuthenticated && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-semibold tabular-nums text-white">
                    {wishlistCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Cart */}
            <Link href="/cart" className="relative" aria-label="Shopping cart">
              <Button variant="ghost" size="icon" className="relative rounded-full" aria-label="View cart">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && isAuthenticated && (
                  <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-semibold tabular-nums text-white">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>

            {/* Notifications */}
            {isAuthenticated && (
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full"
                    aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-semibold tabular-nums text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 rounded-2xl p-0" align="end">
                  <div className="flex items-center justify-between border-b border-border p-4">
                    <h4 className="text-sm font-semibold">Notifications</h4>
                    <div className="flex items-center gap-1">
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-full px-2.5 text-xs text-orange-600 hover:text-orange-700"
                          onClick={markAllAsRead}
                        >
                          Mark all read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-full px-2.5 text-xs"
                        onClick={fetchNotifications}
                        disabled={isLoadingNotifications}
                      >
                        {isLoadingNotifications ? '...' : 'Refresh'}
                      </Button>
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {isLoadingNotifications && notifications.length === 0 ? (
                      <div className="space-y-3 p-4">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : notificationError ? (
                      <div className="p-6 text-center text-muted-foreground">
                        <p className="text-sm">{notificationError}</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs text-orange-600"
                          onClick={fetchNotifications}
                        >
                          Try again
                        </Button>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Bell className="mx-auto mb-2 h-8 w-8 opacity-40" />
                        <p className="text-sm">No notifications</p>
                        <p className="text-xs">You're all caught up!</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            'cursor-pointer border-b border-border p-3 transition-colors last:border-0 hover:bg-muted/50',
                            !notification.read && 'bg-orange-50/50 dark:bg-orange-950/10'
                          )}
                          onClick={() => {
                            markAsRead(notification.id);
                            if (notification.link) {
                              setIsPopoverOpen(false);
                              router.push(notification.link);
                            }
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{notification.title}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {notification.message}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatDate(notification.createdAt)}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-600" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="border-t border-border p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full rounded-full text-xs text-muted-foreground"
                        onClick={() => {
                          setIsPopoverOpen(false);
                          router.push('/notifications');
                        }}
                      >
                        View all notifications
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            )}

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="ml-1 flex h-9 items-center gap-2 rounded-full px-2"
                    aria-label="User menu"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-orange-600/10 text-xs font-semibold text-orange-700 dark:text-orange-400">
                        {getInitials(user?.name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-medium sm:inline">
                      {user?.name?.split(' ')[0] || 'User'}
                    </span>
                    <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:inline" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-1.5 py-1">
                      <p className="text-sm font-semibold">{user?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                      <span
                        className={cn(
                          'w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          getRoleBadgeColor(user?.role || 'user')
                        )}
                      >
                        {user?.role}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link href={getDashboardLink()} className="flex cursor-pointer items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex cursor-pointer items-center gap-2">
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href="/wishlist" className="flex cursor-pointer items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Wishlist
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="flex cursor-pointer items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      Orders
                    </Link>
                  </DropdownMenuItem>

                  {(user?.role === 'admin' || user?.role === 'superadmin') && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex cursor-pointer items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {user?.role === 'superadmin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/superadmin" className="flex cursor-pointer items-center gap-2">
                        <Users className="h-4 w-4" />
                        Super Admin
                      </Link>
                    </DropdownMenuItem>
                  )}

                  {user?.role === 'vendor' && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/vendor/dashboard" className="flex cursor-pointer items-center gap-2">
                          <Store className="h-4 w-4" />
                          Vendor Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/vendor/products" className="flex cursor-pointer items-center gap-2">
                          <Package className="h-4 w-4" />
                          Manage Products
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex cursor-pointer items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="rounded-full">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="border-t border-border bg-background lg:hidden">
            <nav className="container mx-auto flex flex-col gap-1 px-4 py-4" aria-label="Mobile navigation">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors',
                    pathname === item.href
                      ? 'bg-zinc-950 text-white'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}

              {!isAuthenticated && (
                <>
                  <Link
                    href="/login"
                    className="rounded-full px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-full px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Register
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

// ============================================================
// SKELETON LOADING STATE
// ============================================================

function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-xl" />
            <Skeleton className="hidden h-6 w-24 sm:inline" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </div>
    </header>
  );
}