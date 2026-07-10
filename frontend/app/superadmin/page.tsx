// app/superadmin/page.tsx
'use client';

import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Store, 
  Shield, 
  UserCheck, 
  UserX, 
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  DollarSign,
  ShoppingBag,
  Star,
  CheckCircle,
  XCircle,
  Package,
  Eye,
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function SuperAdminDashboard() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { 
    statistics, 
    statisticsLoading, 
    systemStatus, 
    systemStatusLoading 
  } = useSuperAdmin();
  const router = useRouter();

  // ✅ Redirect non-superadmin users
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (user?.role !== 'superadmin') {
        router.push('/dashboard');
      }
    }
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, user, router]);

  if (authLoading || statisticsLoading || systemStatusLoading) {
    return <DashboardSkeleton />;
  }

  // ✅ SAFE ACCESS – with default values
  const totalUsers = statistics?.total?.users ?? 0;
  const totalVendors = statistics?.total?.vendors ?? 0;
  const totalAdmins = statistics?.total?.admins ?? 0;
  const verifiedUsers = statistics?.verification?.verified ?? 0;
  const pendingVendors = statistics?.verification?.pendingVendors ?? 0;
  const recentUsers = statistics?.recentUsers ?? [];

  // Simulate trends (in real app, these come from backend)
  const trends = {
    users: { value: 12, isUp: true },
    vendors: { value: 8, isUp: true },
    pending: { value: 5, isUp: false },
    verified: { value: 3, isUp: true },
  };

  // ============================================================
  // STAT CARDS
  // ============================================================

  const statCards = [
    {
      title: 'Total Users',
      value: totalUsers,
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      trend: trends.users,
      href: '/superadmin/users',
    },
    {
      title: 'Total Vendors',
      value: totalVendors,
      icon: Store,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      trend: trends.vendors,
      href: '/superadmin/vendors',
    },
    {
      title: 'Pending Vendors',
      value: pendingVendors,
      icon: UserX,
      color: 'text-yellow-500',
      bg: 'bg-yellow-50',
      trend: trends.pending,
      href: '/superadmin/vendors',
    },
    {
      title: 'Verified Users',
      value: verifiedUsers,
      icon: UserCheck,
      color: 'text-green-500',
      bg: 'bg-green-50',
      trend: trends.verified,
      href: '/superadmin/users',
    },
  ];

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {user?.name}. Here's what's happening with your platform.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {new Date().toLocaleString()}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={cn("p-2 rounded-lg", stat.bg)}>
                  <stat.icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <span className="text-2xl font-bold">{stat.value.toLocaleString()}</span>
                  {stat.trend && (
                    <span className={cn(
                      "text-xs font-medium flex items-center gap-0.5",
                      stat.trend.isUp ? "text-green-600" : "text-red-600"
                    )}>
                      {stat.trend.isUp ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {stat.trend.value}%
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue & Orders Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Revenue & Orders Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2">
              {[65, 80, 45, 70, 55, 90, 75, 60, 85, 50, 95, 70].map((height, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full rounded-sm bg-blue-500 hover:bg-blue-600 transition-all"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-4">
              <span>Revenue</span>
              <span>Orders</span>
            </div>
          </CardContent>
        </Card>

        {/* Order Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Platform Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total Users</span>
                  <span className="font-medium">{totalUsers}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Vendors</span>
                  <span className="font-medium">{totalVendors}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totalUsers > 0 ? (totalVendors / totalUsers) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Admins</span>
                  <span className="font-medium">{totalAdmins}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${totalUsers > 0 ? (totalAdmins / totalUsers) * 100 : 0}%` }} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Pending Vendors</span>
                  <span className="font-medium text-yellow-600">{pendingVendors}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${totalUsers > 0 ? (pendingVendors / totalUsers) * 100 : 0}%` }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentUsers.length > 0 ? (
            <div className="space-y-3">
              {recentUsers.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                      {user.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      user.isVerified 
                        ? "bg-green-100 text-green-700" 
                        : "bg-yellow-100 text-yellow-700"
                    )}>
                      {user.isVerified ? 'Verified' : 'Pending'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
              <Link 
                href="/superadmin/users" 
                className="text-sm text-primary hover:underline block text-center mt-2"
              >
                View all users →
              </Link>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// SKELETON LOADING STATE
// ============================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  );
}