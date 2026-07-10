// app/superadmin/page.tsx
'use client';

import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Store,
  UserCheck,
  UserX,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
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
    systemStatusLoading,
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
      title: 'Total users',
      value: totalUsers,
      icon: Users,
      color: 'text-blue-600',
      trend: trends.users,
      href: '/superadmin/users',
    },
    {
      title: 'Total vendors',
      value: totalVendors,
      icon: Store,
      color: 'text-orange-600',
      trend: trends.vendors,
      href: '/superadmin/vendors',
    },
    {
      title: 'Pending vendors',
      value: pendingVendors,
      icon: UserX,
      color: 'text-amber-600',
      trend: trends.pending,
      href: '/superadmin/vendors',
    },
    {
      title: 'Verified users',
      value: verifiedUsers,
      icon: UserCheck,
      color: 'text-emerald-600',
      trend: trends.verified,
      href: '/superadmin/users',
    },
  ];

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">Dashboard overview</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name} — here's what's happening with your platform.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href} className="group block">
            <div className="h-full rounded-2xl border border-border bg-background p-5 transition-all duration-300 group-hover:-translate-y-1 group-hover:border-orange-300 group-hover:shadow-xl group-hover:shadow-orange-950/5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {stat.title}
                </span>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  <stat.icon className={cn('h-4 w-4', stat.color)} />
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <span className="text-3xl font-black tabular-nums tracking-tight">
                  {stat.value.toLocaleString()}
                </span>
                {stat.trend && (
                  <span
                    className={cn(
                      'flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-semibold tabular-nums',
                      stat.trend.isUp
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                    )}
                  >
                    {stat.trend.isUp ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {stat.trend.value}%
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue & Orders Chart */}
        <div className="rounded-2xl border border-border bg-background p-6">
          <h2 className="text-sm font-semibold">Revenue &amp; orders trend</h2>
          <div className="mt-6 flex h-56 items-end justify-between gap-2">
            {[65, 80, 45, 70, 55, 90, 75, 60, 85, 50, 95, 70].map((height, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-full bg-orange-600/90 transition-colors hover:bg-orange-600"
                  style={{ height: `${height}%` }}
                />
                <span className="text-[10px] text-muted-foreground">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between border-t border-border pt-4 text-xs text-muted-foreground">
            <span>Revenue</span>
            <span>Orders</span>
          </div>
        </div>

        {/* Platform Status */}
        <div className="rounded-2xl border border-border bg-background p-6">
          <h2 className="text-sm font-semibold">Platform status</h2>
          <div className="mt-6 space-y-5">
            <StatusBar label="Total users" value={totalUsers} of={totalUsers} colorClass="bg-zinc-950 dark:bg-white" />
            <StatusBar
              label="Vendors"
              value={totalVendors}
              of={totalUsers}
              colorClass="bg-orange-600"
            />
            <StatusBar
              label="Admins"
              value={totalAdmins}
              of={totalUsers}
              colorClass="bg-violet-500"
            />
            <StatusBar
              label="Pending vendors"
              value={pendingVendors}
              of={totalUsers}
              colorClass="bg-amber-500"
              valueClassName="text-amber-600"
            />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="rounded-2xl border border-border bg-background p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4" />
          Recent activity
        </h2>
        {recentUsers.length > 0 ? (
          <div className="mt-4 divide-y divide-border">
            {recentUsers.slice(0, 5).map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {u.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[11px] font-semibold',
                      u.isVerified
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                    )}
                  >
                    {u.isVerified ? 'Verified' : 'Pending'}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDate(u.createdAt)}
                  </span>
                </div>
              </div>
            ))}
            <div className="pt-4 text-center">
              <Link
                href="/superadmin/users"
                className="text-sm font-medium text-orange-600 transition-colors hover:text-orange-700"
              >
                View all users →
              </Link>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">No recent activity</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// STATUS BAR — small helper for the Platform Status card
// ============================================================

function StatusBar({
  label,
  value,
  of,
  colorClass,
  valueClassName,
}: {
  label: string;
  value: number;
  of: number;
  colorClass: string;
  valueClassName?: string;
}) {
  const pct = of > 0 ? Math.min(100, (value / of) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn('font-semibold tabular-nums', valueClassName)}>{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all', colorClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ============================================================
// SKELETON LOADING STATE
// ============================================================

function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}