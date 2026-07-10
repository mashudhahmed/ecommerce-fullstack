// app/superadmin/statistics/page.tsx
'use client';

import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formatDate } from '@/lib/utils';

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'];

export default function SuperAdminStatisticsPage() {
  const { statistics, statisticsLoading } = useSuperAdmin();

  if (statisticsLoading) {
    return <StatisticsSkeleton />;
  }

  // Prepare data for charts
  const userDistribution = [
    { name: 'Users', value: statistics?.total.users || 0 },
    { name: 'Vendors', value: statistics?.total.vendors || 0 },
    { name: 'Admins', value: statistics?.total.admins || 0 },
    { name: 'SuperAdmins', value: statistics?.total.superAdmins || 0 },
  ];

  const verificationData = [
    { name: 'Verified', value: statistics?.verification.verified || 0 },
    { name: 'Unverified', value: statistics?.verification.unverified || 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Statistics</h1>
        <p className="text-muted-foreground">Detailed platform analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {userDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verification Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={verificationData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {verificationData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Vendors</p>
              <p className="text-2xl font-bold">{statistics?.total.vendors || 0}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
              <p className="text-2xl font-bold text-yellow-500">
                {statistics?.verification.pendingVendors || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approved</p>
              <p className="text-2xl font-bold text-green-500">
                {statistics?.verification.approvedVendors || 0}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Approval Rate</p>
              <p className="text-2xl font-bold">
                {statistics?.total.vendors
                  ? (
                      ((statistics.verification.approvedVendors || 0) /
                        statistics.total.vendors) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          {statistics?.recentUsers?.length > 0 ? (
            <div className="space-y-2">
              {statistics.recentUsers.slice(0, 10).map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 border-b">
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-muted px-2 py-1 rounded capitalize">
                      {user.role}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No recent registrations</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatisticsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}