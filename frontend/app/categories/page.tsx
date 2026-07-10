// app/categories/page.tsx
'use client';

import { useCategories } from '@/hooks/useCategories';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { 
  Laptop, 
  Shirt, 
  BookOpen, 
  Home, 
  Gamepad2, 
  Bike,
  Smartphone,
  Watch,
  Sofa,
  Camera,
  Headphones,
  Dumbbell,
  Package,
  ChevronRight,
} from 'lucide-react';

const categoryIcons: Record<string, React.ReactNode> = {
  electronics: <Laptop className="h-6 w-6" />,
  clothing: <Shirt className="h-6 w-6" />,
  books: <BookOpen className="h-6 w-6" />,
  'home-garden': <Home className="h-6 w-6" />,
  'toys-games': <Gamepad2 className="h-6 w-6" />,
  'sports-outdoors': <Bike className="h-6 w-6" />,
  smartphones: <Smartphone className="h-6 w-6" />,
  accessories: <Watch className="h-6 w-6" />,
  furniture: <Sofa className="h-6 w-6" />,
  photography: <Camera className="h-6 w-6" />,
  audio: <Headphones className="h-6 w-6" />,
  fitness: <Dumbbell className="h-6 w-6" />,
};

export default function CategoriesPage() {
  const { categories, isLoading } = useCategories();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Categories</h1>
        <p className="text-muted-foreground">
          Browse products by category
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/products?category=${category.slug}`}
            className="group"
          >
            <Card className="hover:shadow-lg transition-all hover:-translate-y-1">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center h-12 w-12 mx-auto mb-3 rounded-full bg-muted/50 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                  {categoryIcons[category.slug] || <Package className="h-6 w-6 text-muted-foreground group-hover:text-orange-600 transition-colors" />}
                </div>
                <h3 className="font-medium text-sm group-hover:text-orange-600 transition-colors">
                  {category.name}
                </h3>
                {category.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {category.description}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h3 className="text-xl font-semibold mt-4">No categories found</h3>
          <p className="text-muted-foreground mt-2">
            Categories will appear here once available
          </p>
        </div>
      )}
    </div>
  );
}