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

  const hasFilters = Object.values(filters).some((v) => v !== '');

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 relative">
          <Filter className="h-4 w-4" />
          Filters
          {hasFilters && (
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary text-[8px] text-primary-foreground flex items-center justify-center">
              {Object.values(filters).filter((v) => v !== '').length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter Orders</SheetTitle>
          <SheetDescription>
            Apply filters to narrow down your orders
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => handleChange('status', value)}
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
            <Label>Total Amount Range</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minTotal}
                onChange={(e) => handleChange('minTotal', e.target.value)}
                className="w-1/2"
              />
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxTotal}
                onChange={(e) => handleChange('maxTotal', e.target.value)}
                className="w-1/2"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Date Range</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="w-1/2"
              />
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleChange('endDate', e.target.value)}
                className="w-1/2"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button className="flex-1" onClick={() => setIsOpen(false)}>
              Apply Filters
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}