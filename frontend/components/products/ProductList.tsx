// components/products/ProductList.tsx
'use client';

import { Product } from '@/types';
import { ProductCard } from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProductListProps {
  products: Product[];
  isLoading?: boolean;
  variant?: 'default' | 'compact' | 'featured';
  columns?: 2 | 3 | 4 | 5;
}

export function ProductList({ 
  products, 
  isLoading, 
  variant = 'default',
  columns = 4 
}: ProductListProps) {
  if (isLoading) {
    return (
      <div className={cn(
        "grid gap-3 sm:gap-4 md:gap-5",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4",
        columns === 4 && "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
        columns === 5 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      )}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2 rounded-xl sm:rounded-2xl border border-border/40 p-2.5 sm:p-3.5 bg-card">
            <Skeleton className="aspect-square w-full rounded-lg sm:rounded-xl" />
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
        <h3 className="text-xl font-semibold mt-4">No products found</h3>
        <p className="text-muted-foreground mt-2">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-3 sm:gap-4 md:gap-5",
      columns === 2 && "grid-cols-2",
      columns === 3 && "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4",
      columns === 4 && "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
      columns === 5 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
    )}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant={variant} />
      ))}
    </div>
  );
}