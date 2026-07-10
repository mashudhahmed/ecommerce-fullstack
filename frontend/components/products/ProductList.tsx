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
  columns?: 2 | 3 | 4;
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
        "grid gap-6",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      )}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-6 w-1/4" />
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
      "grid gap-6",
      columns === 2 && "grid-cols-1 sm:grid-cols-2",
      columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    )}>
      {products.map((product) => (
        <ProductCard key={product.id} product={product} variant={variant} />
      ))}
    </div>
  );
}