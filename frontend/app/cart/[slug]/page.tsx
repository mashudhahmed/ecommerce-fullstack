// app/categories/[slug]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { ProductList } from '@/components/products/ProductList';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CategoryDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { products, isLoading: productsLoading } = useProducts();

  const category = categories.find((c) => c.slug === slug);
  const categoryProducts = products.filter((p) => p.category?.slug === slug);

  if (categoriesLoading || productsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold">Category not found</h2>
        <Link href="/categories" className="text-orange-500 hover:underline mt-4 inline-block">
          <ArrowLeft className="h-4 w-4 inline mr-1" />
          Back to Categories
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/categories" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          Categories
        </Link>
        <h1 className="text-3xl font-bold mt-2">{category.name}</h1>
        {category.description && (
          <p className="text-muted-foreground mt-1">{category.description}</p>
        )}
        <p className="text-sm text-muted-foreground mt-2">
          {categoryProducts.length} product{categoryProducts.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ProductList products={categoryProducts} />
    </div>
  );
}