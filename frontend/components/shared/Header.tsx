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
  // ✅ Wifi and WifiOff removed - no longer needed
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
import { Badge } from '@/components/ui/badge';
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
      case 'superadmin': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'vendor': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            
            <Link href="/" className="flex items-center gap-2.5 group" aria-label="SnapCart Home">
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
              <span className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors duration-200">
                SnapCart
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm transition-colors rounded-md",
                  pathname === item.href 
                    ? "text-primary bg-primary/10" 
                    : "hover:text-primary hover:bg-muted"
                )}
                aria-current={pathname === item.href ? 'page' : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Side - ✅ NO "Offline" Text */}
          <div className="flex items-center gap-2">
            {/* Wishlist */}
            <Link href="/wishlist" className="relative" aria-label="Wishlist">
              <Button variant="ghost" size="icon" aria-label="View wishlist">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && isAuthenticated && (
                  <Badge
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    variant="destructive"
                  >
                    {wishlistCount}
                  </Badge>
                )}
              </Button>
            </Link>

            {/* Cart */}
            <Link href="/cart" className="relative" aria-label="Shopping cart">
              <Button variant="ghost" size="icon" aria-label="View cart">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && isAuthenticated && (
                  <Badge
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    variant="destructive"
                  >
                    {totalItems}
                  </Badge>
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
                    className="relative"
                    aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold">Notifications</h4>
                    <div className="flex items-center gap-2">
                      {unreadCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-primary h-8 px-2"
                          onClick={markAllAsRead}
                        >
                          Mark all read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8 px-2"
                        onClick={fetchNotifications}
                        disabled={isLoadingNotifications}
                      >
                        {isLoadingNotifications ? '...' : 'Refresh'}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="max-h-80 overflow-y-auto">
                    {isLoadingNotifications && notifications.length === 0 ? (
                      <div className="p-4 space-y-3">
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
                      <div className="p-4 text-center text-muted-foreground">
                        <p className="text-sm">{notificationError}</p>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs"
                          onClick={fetchNotifications}
                        >
                          Try again
                        </Button>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No notifications</p>
                        <p className="text-xs">You're all caught up!</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={cn(
                            "p-3 border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors",
                            !notification.read && "bg-muted/20"
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
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{notification.title}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDate(notification.createdAt)}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <div className="border-t p-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground"
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
                    className="flex items-center gap-2 h-8 px-2"
                    aria-label="User menu"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(user?.name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium">
                      {user?.name?.split(' ')[0] || 'User'}
                    </span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:inline" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold text-sm">{user?.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      <Badge className={cn("text-xs w-fit", getRoleBadgeColor(user?.role || 'user'))}>
                        {user?.role}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem asChild>
                    <Link href={getDashboardLink()} className="flex items-center gap-2 cursor-pointer">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link href="/wishlist" className="flex items-center gap-2 cursor-pointer">
                      <Heart className="h-4 w-4" />
                      Wishlist
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="flex items-center gap-2 cursor-pointer">
                      <ShoppingBag className="h-4 w-4" />
                      Orders
                    </Link>
                  </DropdownMenuItem>
                  
                  {(user?.role === 'admin' || user?.role === 'superadmin') && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
                        <Shield className="h-4 w-4" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  {user?.role === 'superadmin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/superadmin" className="flex items-center gap-2 cursor-pointer">
                        <Users className="h-4 w-4" />
                        Super Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  {user?.role === 'vendor' && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/vendor/dashboard" className="flex items-center gap-2 cursor-pointer">
                          <Store className="h-4 w-4" />
                          Vendor Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/vendor/products" className="flex items-center gap-2 cursor-pointer">
                          <Package className="h-4 w-4" />
                          Manage Products
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">Login</Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t bg-background">
            <nav className="container mx-auto px-4 py-4 flex flex-col gap-2" aria-label="Mobile navigation">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 text-sm rounded-md flex items-center gap-2",
                    pathname === item.href 
                      ? "text-primary bg-primary/10" 
                      : "hover:bg-muted"
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
                    className="px-3 py-2 text-sm hover:bg-muted rounded-md"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="px-3 py-2 text-sm hover:bg-muted rounded-md"
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
    <header className="sticky top-0 z-50 w-full border-b bg-background/95">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-6 w-24 hidden sm:inline" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
    </header>
  );
}