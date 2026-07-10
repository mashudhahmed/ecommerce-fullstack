// app/wishlist/page.tsx
'use client';

import { useWishlist } from '@/hooks/useWishlist';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function WishlistPage() {
  const { wishlist, isLoading, total, clearWishlist, clearLoading } = useWishlist();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (wishlist.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-semibold">Your wishlist is empty</h2>
        <p className="text-muted-foreground mt-2">
          Save your favorite items here
        </p>
        <Button className="mt-6" asChild>
          <a href="/products">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Browse Products
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Wishlist</h1>
          <p className="text-muted-foreground">{total} items saved</p>
        </div>
        {wishlist.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => clearWishlist()}
            disabled={clearLoading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {wishlist.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}