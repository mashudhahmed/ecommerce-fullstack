// app/admin/reports/page.tsx
'use client';

import { useState } from 'react';
import { useExport } from '@/hooks/useExport';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Download, FileSpreadsheet, FileText, FileJson, FileCode } from 'lucide-react';
import { toast } from 'sonner';

const exportTypes = [
  { value: 'users', label: 'Users' },
  { value: 'orders', label: 'Orders' },
  { value: 'products', label: 'Products' },
  { value: 'analytics', label: 'Analytics' },
];

const formats = [
  { value: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV (.csv)', icon: FileText },
  { value: 'pdf', label: 'PDF (.pdf)', icon: FileText },
  { value: 'json', label: 'JSON (.json)', icon: FileJson },
];

export default function ReportsPage() {
  const { exportData, loading } = useExport();
  const [selectedType, setSelectedType] = useState('users');
  const [selectedFormat, setSelectedFormat] = useState('excel');
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    role: '',
    isVerified: '',
  });

  const handleExport = async () => {
    try {
      const exportFilters: any = {};
      if (filters.status) exportFilters.status = filters.status;
      if (filters.startDate) exportFilters.startDate = filters.startDate;
      if (filters.endDate) exportFilters.endDate = filters.endDate;
      if (filters.role) exportFilters.role = filters.role;
      if (filters.isVerified !== '') exportFilters.isVerified = filters.isVerified === 'true';

      await exportData(
        selectedType as 'users' | 'orders' | 'products' | 'analytics',
        selectedFormat as any,
        exportFilters
      );
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Exports</h1>
          <p className="text-muted-foreground">Export data in various formats</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Export Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exportTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Format</Label>
              <Select value={selectedFormat} onValueChange={setSelectedFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {formats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      <div className="flex items-center gap-2">
                        <format.icon className="h-4 w-4" />
                        {format.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4">Filters (Optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters({ ...filters, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleExport} disabled={loading} className="w-full" size="lg">
            <Download className="mr-2 h-4 w-4" />
            {loading ? 'Exporting...' : 'Export Data'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}