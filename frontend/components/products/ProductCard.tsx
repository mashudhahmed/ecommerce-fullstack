// components/products/ProductCard.tsx
'use client';

import { useState, memo, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Heart, Eye, Star, StarHalf } from 'lucide-react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { formatPrice, cn } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { useWishlistStore } from '@/store/wishlist-store';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
  priority?: boolean;
}

// Memoized Rating component
const Rating = memo(({ rating, count }: { rating: number; count: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div
      className="flex items-center gap-1.5"
      role="img"
      aria-label={`Rating: ${rating} out of 5 stars`}
    >
      <div className="flex">
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return <Star key={i} className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />;
          }
          if (i === fullStars && hasHalfStar) {
            return <StarHalf key={i} className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />;
          }
          return <Star key={i} className="h-3.5 w-3.5 text-muted-foreground/25" />;
        })}
      </div>
      {count > 0 && <span className="text-xs text-muted-foreground">({count})</span>}
    </div>
  );
});

Rating.displayName = 'Rating';

// Memoized ProductCard
export const ProductCard = memo(function ProductCard({
  product,
  variant = 'default',
  className,
  priority = false,
}: ProductCardProps) {
  const { addToCart, addToCartLoading } = useCart();
  const { addToWishlist, removeFromWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // ✅ Instant, reactive store selector — component re-renders exclusively
  // when this specific product's wishlist status changes.
  const isInWishlist = useWishlistStore((state) =>
    state.items.some((item) => item.id === product.id)
  );

  // Memoized computed values
  const isOutOfStock = useMemo(() => product.stock === 0, [product.stock]);
  const isLowStock = useMemo(() => product.stock > 0 && product.stock <= 5, [product.stock]);
  const discount = useMemo(
    () =>
      product.compareAtPrice
        ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
        : 0,
    [product.compareAtPrice, product.price]
  );

  // Validate image URL and provide fallback
  const imageSrc = useMemo(() => {
    if (!product.imageUrl || imageError) {
      return '/placeholder-image.png';
    }
    return product.imageUrl;
  }, [product.imageUrl, imageError]);

  // Card background click: navigate to product page unless user clicked an interactive element
  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, textarea, select, [role="button"]')) {
        return;
      }
      router.push(`/products/${product.id}`);
    },
    [product.id, router]
  );

  // Memoized handlers
  const handleAddToCart = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isOutOfStock) {
        toast.error('This product is out of stock');
        return;
      }

      try {
        await addToCart({ productId: product.id, quantity: 1, product });
      } catch {
        // toast is handled centrally in useCart
      }
    },
    [addToCart, product, isOutOfStock]
  );

  const handleWishlist = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isWishlistLoading) return;

      setIsWishlistLoading(true);
      try {
        if (isInWishlist) {
          await removeFromWishlist(product.id);
          toast.success('Removed from wishlist');
        } else {
          await addToWishlist(product);
          toast.success('Added to wishlist');
        }
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to update wishlist';
        toast.error(errorMessage);
      } finally {
        setIsWishlistLoading(false);
      }
    },
    [isInWishlist, isWishlistLoading, addToWishlist, removeFromWishlist, product]
  );

  return (
    <div
      className="group h-full transition-transform duration-300 hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card
        onClick={handleCardClick}
        className={cn(
          'h-full cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-background transition-all duration-300 hover:border-orange-300 hover:shadow-xl hover:shadow-orange-950/5',
          className
        )}
      >
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-muted/20">
          {/* Direct image link for middle-click, SEO & accessibility */}
          <Link
            href={`/products/${product.id}`}
            className="absolute inset-0 z-0 block cursor-pointer"
            aria-label={`View details for ${product.title}`}
          >
            <Image
              src={imageSrc}
              alt={product.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              onError={() => setImageError(true)}
              priority={priority}
              loading={priority ? 'eager' : 'lazy'}
            />

            {/* Gradient scrim for legible hover actions */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black/55 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          </Link>

          {/* Status badges — neatly grouped on top-left */}
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
            {discount > 0 && (
              <span className="rounded-full bg-orange-600 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white shadow-sm">
                −{discount}%
              </span>
            )}
            {isOutOfStock && (
              <span className="rounded-full bg-zinc-950/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm shadow-sm">
                Out of stock
              </span>
            )}
            {isLowStock && !isOutOfStock && (
              <span className="rounded-full border border-orange-200 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-orange-700 backdrop-blur-sm shadow-sm">
                Only {product.stock} left
              </span>
            )}
          </div>

          {/* Wishlist (Love icon) — top-right, always accessible, tactile micro-interaction */}
          <button
            type="button"
            onClick={handleWishlist}
            disabled={isWishlistLoading}
            aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            className={cn(
              'absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full shadow-sm backdrop-blur-md transition-all duration-200 active:scale-75 hover:scale-110 disabled:opacity-60 cursor-pointer',
              isInWishlist
                ? 'bg-orange-50/95 text-orange-600 border border-orange-200 shadow-orange-500/10'
                : 'bg-white/90 text-zinc-600 hover:text-orange-600 hover:bg-white border border-border/40'
            )}
          >
            <Heart
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isInWishlist
                  ? 'fill-orange-600 text-orange-600 scale-105'
                  : 'text-zinc-600 hover:text-orange-600'
              )}
            />
          </button>

          {/* Quick actions — reveal on hover */}
          <div
            className={cn(
              'absolute inset-x-3 bottom-3 z-10 flex justify-center gap-2 transition-all duration-300',
              isHovered ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-3 opacity-0 pointer-events-none'
            )}
          >
            <Button
              size="sm"
              className="h-9 gap-1.5 rounded-full bg-zinc-950 px-4 text-xs text-white shadow-lg hover:bg-zinc-800 cursor-pointer"
              onClick={handleAddToCart}
              disabled={isOutOfStock || addToCartLoading}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              {isOutOfStock ? 'Out of stock' : addToCartLoading ? 'Adding…' : 'Add to cart'}
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-9 w-9 rounded-full shadow-lg cursor-pointer"
              asChild
            >
              <Link href={`/products/${product.id}`} aria-label={`Quick view ${product.title}`}>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Content */}
        <CardContent className="space-y-2 p-4">
          <Link
            href={`/products/${product.id}`}
            className="block group-hover:text-orange-600 transition-colors"
          >
            <h3 className="line-clamp-1 text-base font-semibold tracking-tight">
              {product.title}
            </h3>
          </Link>

          <Rating rating={product.averageRating || 0} count={product.totalReviews || 0} />

          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-lg font-bold tabular-nums">{formatPrice(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>
        </CardContent>

        {/* Footer — mobile-only add to cart (no hover on touch) */}
        <CardFooter className="p-4 pt-0 lg:hidden">
          <Button
            className="w-full rounded-full text-sm cursor-pointer"
            size="sm"
            onClick={handleAddToCart}
            disabled={isOutOfStock || addToCartLoading}
          >
            {isOutOfStock ? 'Out of stock' : addToCartLoading ? 'Adding…' : 'Add to cart'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
});

ProductCard.displayName = 'ProductCard';