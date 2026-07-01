'use client';

import { useParams } from 'next/navigation';
import { ProductDetail } from '@/components/products/ProductDetail';
import { Skeleton } from '@/components/ui/skeleton';
import { fallbackProducts } from '@/lib/fallback-products';
import { useEffect, useState } from 'react';

export default function ProductDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<(typeof fallbackProducts)[number] | null>(null);

  useEffect(() => {
    // ✅ Get product from fallback data immediately
    const foundProduct = fallbackProducts.find(p => p.id === id);
    
    // Simulate loading for smooth UX
    setTimeout(() => {
      setProduct(foundProduct || null);
      setIsLoading(false);
    }, 500);
  }, [id]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Skeleton className="aspect-square rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold">Product not found</h2>
        <p className="text-muted-foreground mt-2">The product you're looking for doesn't exist.</p>
        <p className="text-sm text-muted-foreground mt-4">Try checking our other products.</p>
      </div>
    );
  }

  return <ProductDetail product={product} />;
}