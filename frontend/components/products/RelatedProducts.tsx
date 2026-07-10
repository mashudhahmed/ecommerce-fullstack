// components/products/RelatedProducts.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/product.service';
import { ProductCard } from './ProductCard';
import { Skeleton } from '@/components/ui/skeleton';

interface RelatedProductsProps {
  currentProductId: number;
  categoryId?: number;
}

export function RelatedProducts({ currentProductId, categoryId }: RelatedProductsProps) {
  const { data: products, isLoading } = useQuery({
    queryKey: ['related-products', categoryId],
    queryFn: async () => {
      const result = await productService.getProducts({
        categoryId,
        limit: 4,
      });
      return result.filter(p => p.id !== currentProductId);
    },
    enabled: !!categoryId,
  });

  if (isLoading) {
    return (
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">You May Also Like</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6">You May Also Like</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}