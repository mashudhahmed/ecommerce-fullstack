// app/vendor/analytics/page.tsx
'use client';

import { useVendor } from '@/hooks/useVendor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPrice } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

export default function VendorAnalyticsPage() {
  const { performance, performanceLoading } = useVendor();

  if (performanceLoading) {
    return <AnalyticsSkeleton />;
  }

  const salesData = performance?.salesTrend || [];
  const topProducts = performance?.topProducts || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">Monitor your store performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPrice(performance?.totalRevenue || 0)}</p>
            <p className={`text-sm ${(performance?.growthRate || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {performance?.growthRate?.toFixed(1)}% from previous period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{performance?.totalOrders || 0}</p>
            <p className="text-sm text-muted-foreground">
              Avg. {formatPrice(performance?.averageOrderValue || 0)} per order
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Product</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold truncate">{topProducts[0]?.title || 'N/A'}</p>
            <p className="text-sm text-muted-foreground">
              {topProducts[0] ? `${topProducts[0].sold} sold` : 'No sales yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value: any) =>
                    typeof value === 'number' ? formatPrice(value) : value
                  }
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Revenue"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="#22c55e"
                  strokeWidth={2}
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topProducts.slice(0, 5).map((product, index) => (
              <div key={product.id} className="flex items-center gap-4">
                <span className="text-sm font-medium w-6 text-muted-foreground">#{index + 1}</span>
                <div className="flex-1">
                  <p className="font-medium truncate">{product.title}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{product.sold} sold</span>
                    <span>{formatPrice(product.revenue)} revenue</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-80 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}