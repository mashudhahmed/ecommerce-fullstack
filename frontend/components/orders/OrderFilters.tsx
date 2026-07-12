// components/orders/OrderFilters.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Filter, X } from 'lucide-react';

interface OrderFiltersProps {
  onFilterChange: (filters: any) => void;
}

export function OrderFilters({ onFilterChange }: OrderFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    minTotal: '',
    maxTotal: '',
    startDate: '',
    endDate: '',
  });

  const handleChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const empty = { status: '', minTotal: '', maxTotal: '', startDate: '', endDate: '' };
    setFilters(empty);
    onFilterChange(empty);
    setIsOpen(false);
  };

  const activeCount = Object.values(filters).filter((v) => v !== '').length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative gap-2 rounded-full">
          <Filter className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-600 text-[11px] font-semibold text-white">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter orders</SheetTitle>
          <SheetDescription>Narrow down your orders by status, amount, or date.</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </Label>
            <Select value={filters.status} onValueChange={(value) => handleChange('status', value)}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="All statuses" />
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
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Total amount range
            </Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minTotal}
                onChange={(e) => handleChange('minTotal', e.target.value)}
                className="w-1/2 rounded-xl"
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxTotal}
                onChange={(e) => handleChange('maxTotal', e.target.value)}
                className="w-1/2 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Date range
            </Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="w-1/2 rounded-xl"
              />
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="w-1/2 rounded-xl"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              className="flex-1 rounded-full bg-orange-600 text-white hover:bg-orange-700"
              onClick={() => setIsOpen(false)}
            >
              Apply filters
            </Button>
            <Button variant="outline" className="rounded-full" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}