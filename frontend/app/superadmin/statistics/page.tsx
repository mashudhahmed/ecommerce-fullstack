// app/superadmin/statistics/page.tsx
'use client';

import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { formatDate, cn } from '@/lib/utils';

// ✅ Brand-aligned palette (was the recharts default blue/green/yellow/
// red/purple, which clashed with the zinc-950/orange-600 system used
// everywhere else in the admin).
const COLORS = ['#ea580c', '#18181b', '#10b981', '#f59e0b', '#8b5cf6'];

export default function SuperAdminStatisticsPage() {
  const { statistics, statisticsLoading } = useSuperAdmin();

  if (statisticsLoading) {
    return <StatisticsSkeleton />;
  }

  const userDistribution = [
    { name: 'Users', value: statistics?.total.users || 0 },
    { name: 'Vendors', value: statistics?.total.vendors || 0 },
    { name: 'Admins', value: statistics?.total.admins || 0 },
    { name: 'Super admins', value: statistics?.total.superAdmins || 0 },
  ];

  const verificationData = [
    { name: 'Verified', value: statistics?.verification.verified || 0 },
    { name: 'Unverified', value: statistics?.verification.unverified || 0 },
  ];

  const approvalRate = statistics?.total.vendors
    ? (((statistics.verification.approvedVendors || 0) / statistics.total.vendors) * 100).toFixed(1)
    : '0';

  // ✅ Pull this into a local const so TS can narrow it once, instead of
  // repeating `statistics?.recentUsers?.` (and still getting flagged)
  // at every usage below.
  const recentUsers = statistics?.recentUsers ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Statistics</h1>
        <p className="text-muted-foreground">Detailed platform analytics</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-background p-6">
          <h2 className="text-sm font-semibold">User distribution</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={userDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {userDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background p-6">
          <h2 className="text-sm font-semibold">Verification status</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={verificationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {verificationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Vendor Stats */}
      <div className="rounded-2xl border border-border bg-background p-6">
        <h2 className="text-sm font-semibold">Vendor details</h2>
        <div className="mt-5 grid grid-cols-2 gap-6 md:grid-cols-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Total vendors
            </p>
            <p className="text-2xl font-black tabular-nums tracking-tight">
              {statistics?.total.vendors || 0}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Pending approval
            </p>
            <p className="text-2xl font-black tabular-nums tracking-tight text-amber-600">
              {statistics?.verification.pendingVendors || 0}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Approved
            </p>
            <p className="text-2xl font-black tabular-nums tracking-tight text-emerald-600">
              {statistics?.verification.approvedVendors || 0}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Approval rate
            </p>
            <p className="text-2xl font-black tabular-nums tracking-tight text-orange-600">
              {approvalRate}%
            </p>
          </div>
        </div>
      </div>

      {/* Recent Users List */}
      <div className="rounded-2xl border border-border bg-background p-6">
        <h2 className="text-sm font-semibold">Recent registrations</h2>
        {recentUsers.length > 0 ? (
          <div className="mt-3 divide-y divide-border">
            {recentUsers.slice(0, 10).map((user) => (
              <div key={user.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {user.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold capitalize text-muted-foreground">
                    {user.role}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatDate(user.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">No recent registrations</p>
        )}
      </div>
    </div>
  );
}

function StatisticsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}