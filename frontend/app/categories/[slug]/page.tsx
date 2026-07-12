// app/categories/[slug]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { ProductList } from '@/components/products/ProductList';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Package } from 'lucide-react';
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
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-72" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="mx-auto max-w-sm py-20 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Package className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">Category not found</h2>
        <p className="mt-2 text-muted-foreground">
          This category doesn&apos;t exist or may have been removed.
        </p>
        <Link href="/categories">
          <Button className="mt-6 rounded-full bg-zinc-950 text-white hover:bg-zinc-800">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to categories
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/categories"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Categories
        </Link>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{category.name}</h1>
        {category.description && (
          <p className="mt-1 text-muted-foreground">{category.description}</p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          {categoryProducts.length} product{categoryProducts.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ProductList products={categoryProducts} />
    </div>
  );
}