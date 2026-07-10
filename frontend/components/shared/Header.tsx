// components/shared/Header.tsx
'use client';

import { useState, useEffect } from 'react';
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
  Search,
  LayoutDashboard,
  Store,
  Shield,
  Users,
  Package,
  ChevronDown,
  ShoppingBag,
  Heart
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
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useCart } from '@/hooks/useCart';
import { useWebSocket } from '@/hooks/useWebSocket';
import { getInitials, cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
// NOTIFICATION TYPES
// ============================================================

interface Notification {
  id: string;
  type: 'order' | 'vendor' | 'system' | 'message';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

// ============================================================
// HEADER COMPONENT
// ============================================================

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { totalItems } = useCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ✅ WebSocket for real-time notifications
  const { isConnected, lastMessage } = useWebSocket({
    onMessage: (data) => {
      if (data?.event === 'notification') {
        addNotification(data.data);
      }
    },
  });

  // ✅ Load notifications from API
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated]);

  // ✅ Fetch notifications
  const fetchNotifications = async () => {
    try {
      // Replace with actual API call
      setNotifications([
        {
          id: '1',
          type: 'order',
          title: 'New Order',
          message: 'Order #1234 has been placed',
          read: false,
          createdAt: new Date().toISOString(),
          link: '/orders/1234',
        },
        {
          id: '2',
          type: 'vendor',
          title: 'Vendor Approved',
          message: 'Your vendor account has been approved',
          read: true,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // ✅ Add new notification
  const addNotification = (notification: Notification) => {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
    toast.info(notification.title);
  };

  // ✅ Mark notification as read
  const markAsRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // ✅ Mark all as read
  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // ✅ Handle logout
  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  // ✅ Get role-based dashboard link
  const getDashboardLink = () => {
    if (!user) return '/dashboard';
    switch (user.role) {
      case 'superadmin': return '/superadmin';
      case 'admin': return '/admin';
      case 'vendor': return '/vendor/dashboard';
      default: return '/dashboard';
    }
  };

  // ✅ Get role badge color
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'superadmin': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'admin': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'vendor': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  // ✅ Get navigation items based on role
  const getNavItems = () => {
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
  };

  // ============================================================
  // RENDER LOGIC
  // ============================================================

  if (isLoading) {
    return <HeaderSkeleton />;
  }

  const navItems = getNavItems();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo with SnapCart Branding */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link href="/" className="flex items-center gap-2.5 group">
              {/* ✅ Orange Logo */}
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
              {/* ✅ SnapCart in Dark Gray with hover effect */}
              <span className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors duration-200">
                SnapCart
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
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
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Cart */}
            <Link href="/cart" className="relative">
              <Button variant="ghost" size="icon">
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold">Notifications</h4>
                    {notifications.some((n) => !n.read) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-primary"
                        onClick={markAllAsRead}
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <p className="text-sm">No notifications</p>
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
                                {new Date(notification.createdAt).toLocaleDateString()}
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
                </PopoverContent>
              </Popover>
            )}

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-8 px-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(user?.name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline text-sm font-medium">
                      {user?.name?.split(' ')[0]}
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
                    <Link href={getDashboardLink()} className="flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  
                  {(user?.role === 'admin' || user?.role === 'superadmin') && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {user?.role === 'superadmin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/superadmin" className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Super Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user?.role === 'vendor' && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/vendor/dashboard" className="flex items-center gap-2">
                          <Store className="h-4 w-4" />
                          Vendor Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/vendor/products" className="flex items-center gap-2">
                          <Package className="h-4 w-4" />
                          Manage Products
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
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

        {/* Search Bar */}
        {isSearchOpen && (
          <div className="py-4 border-t">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                    setIsSearchOpen(false);
                  }
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setIsSearchOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t bg-background">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-2 text-sm rounded-md",
                  pathname === item.href 
                    ? "text-primary bg-primary/10" 
                    : "hover:bg-muted"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </span>
              </Link>
            ))}
            {!isAuthenticated && (
              <>
                <Link href="/login" className="px-3 py-2 text-sm hover:bg-muted rounded-md" onClick={() => setIsMobileMenuOpen(false)}>
                  Login
                </Link>
                <Link href="/register" className="px-3 py-2 text-sm hover:bg-muted rounded-md" onClick={() => setIsMobileMenuOpen(false)}>
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
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
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            <div className="h-6 w-24 bg-muted rounded animate-pulse hidden sm:inline" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </header>
  );
}