'use client';

import { useState, memo, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Heart, Eye, Star, StarHalf, Package, Sparkles, TrendingUp } from 'lucide-react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice, cn } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
  priority?: boolean;
}

// ✅ Memoized Rating component
const Rating = memo(({ rating, count }: { rating: number; count: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-1.5" role="img" aria-label={`Rating: ${rating} out of 5 stars`}>
      <div className="flex">
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return <Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />;
          }
          if (i === fullStars && hasHalfStar) {
            return <StarHalf key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />;
          }
          return <Star key={i} className="h-3.5 w-3.5 text-muted-foreground/30" />;
        })}
      </div>
      {count > 0 && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  );
});

Rating.displayName = 'Rating';

// ✅ Memoized ProductCard
export const ProductCard = memo(function ProductCard({ 
  product, 
  variant = 'default', 
  className,
  priority = false 
}: ProductCardProps) {
  const { addToCart, addToCartLoading } = useCart();
  const { addToWishlist, removeFromWishlist, checkInWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);

  // ✅ Memoized computed values
  const isOutOfStock = useMemo(() => product.stock === 0, [product.stock]);
  const isLowStock = useMemo(() => product.stock > 0 && product.stock <= 5, [product.stock]);
  const discount = useMemo(() => 
    product.compareAtPrice ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0,
    [product.compareAtPrice, product.price]
  );

  // ✅ Memoized handlers
  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isOutOfStock) {
      toast.error('This product is out of stock');
      return;
    }
    
    try {
      await addToCart({ productId: product.id, quantity: 1 });
      toast.success(`${product.title} added to cart`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add to cart');
    }
  }, [addToCart, product.id, product.title, isOutOfStock]);

  const handleWishlist = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.info('Please login to add to wishlist');
      return;
    }
    
    if (isWishlistLoading) return;
    
    setIsWishlistLoading(true);
    try {
      if (isInWishlist) {
        await removeFromWishlist(product.id);
        setIsInWishlist(false);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist(product.id);
        setIsInWishlist(true);
        toast.success('Added to wishlist');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update wishlist');
    } finally {
      setIsWishlistLoading(false);
    }
  }, [isAuthenticated, isInWishlist, isWishlistLoading, addToWishlist, removeFromWishlist, product.id]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="h-full"
    >
      <Link href={`/products/${product.id}`} className="block h-full">
        <Card className={cn(
          "h-full overflow-hidden border transition-shadow duration-300 hover:shadow-lg bg-background cursor-pointer",
          className
        )}>
          {/* Image Container */}
          <div className="relative aspect-square bg-muted/20 overflow-hidden">
            {product.imageUrl && !imageError ? (
              <Image
                src={product.imageUrl}
                alt={product.title}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                onError={() => setImageError(true)}
                priority={priority}
                loading={priority ? 'eager' : 'lazy'}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/30">
                <Package className="h-12 w-12 text-muted-foreground/30" />
              </div>
            )}

            {/* Badges */}
            {isOutOfStock && (
              <Badge variant="destructive" className="absolute top-3 left-3 z-10">
                Out of Stock
              </Badge>
            )}
            {isLowStock && !isOutOfStock && (
              <Badge className="absolute top-3 left-3 z-10 bg-amber-500 hover:bg-amber-600">
                Low Stock
              </Badge>
            )}
            {discount > 0 && (
              <Badge className="absolute top-3 right-3 z-10 bg-red-500 hover:bg-red-600">
                -{discount}%
              </Badge>
            )}

            {/* Quick Action Buttons */}
            <div className={cn(
              "absolute bottom-0 left-0 right-0 p-3 flex justify-center gap-2 transition-all duration-300",
              isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            )}>
              <Button
                size="sm"
                variant="secondary"
                className="h-9 px-4 text-xs shadow-lg"
                onClick={handleAddToCart}
                disabled={isOutOfStock || addToCartLoading}
              >
                <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
                {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-9 w-9 shadow-lg"
                onClick={handleWishlist}
                disabled={isWishlistLoading}
                aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={cn(
                  "h-4 w-4 transition-colors",
                  isInWishlist ? "fill-red-500 text-red-500" : "text-muted-foreground"
                )} />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-9 w-9 shadow-lg"
                asChild
              >
                <div className="cursor-pointer" aria-label="Quick view">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            </div>
          </div>

          {/* Content */}
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold text-base line-clamp-1 group-hover:text-orange-600 transition-colors">
              {product.title}
            </h3>

            <Rating rating={product.averageRating || 0} count={product.totalReviews || 0} />

            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">{formatPrice(product.price)}</span>
              {product.compareAtPrice && (
                <span className="text-sm text-muted-foreground line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
            </div>

            {product.isNew && (
              <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-blue-200 text-blue-600 bg-blue-50">
                <Sparkles className="mr-1 h-2.5 w-2.5" />
                New
              </Badge>
            )}
            {product.isTrending && (
              <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-orange-200 text-orange-600 bg-orange-50">
                <TrendingUp className="mr-1 h-2.5 w-2.5" />
                Trending
              </Badge>
            )}
          </CardContent>

          {/* Footer */}
          <CardFooter className="p-4 pt-0 lg:hidden">
            <Button
              className="w-full text-sm"
              size="sm"
              onClick={handleAddToCart}
              disabled={isOutOfStock || addToCartLoading}
            >
              {isOutOfStock ? 'Out of Stock' : addToCartLoading ? 'Adding...' : 'Add to Cart'}
            </Button>
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  );
});

ProductCard.displayName = 'ProductCard';