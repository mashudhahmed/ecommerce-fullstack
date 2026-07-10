// app/products/[id]/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/product.service';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { useReviews } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ReviewList } from '@/components/reviews/ReviewList';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { RelatedProducts } from '@/components/products/RelatedProducts';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Heart, 
  Share2, 
  Star, 
  StarHalf,
  Truck, 
  Shield, 
  RefreshCw, 
  Package,
  CheckCircle,
  AlertCircle,
  Minus,
  Plus,
  Loader2,
} from 'lucide-react';
import { formatPrice, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

// ============================================================
// HELPERS
// ============================================================

const formatRating = (rating: number | string | undefined): string => {
  if (rating === undefined || rating === null) return 'N/A';
  const num = typeof rating === 'string' ? parseFloat(rating) : rating;
  return isNaN(num) ? 'N/A' : num.toFixed(1);
};

// ============================================================
// RATING COMPONENT - Memoized
// ============================================================

const Rating = ({ rating, count }: { rating: number; count: number }) => {
  const safeRating = typeof rating === 'number' ? rating : Number(rating) || 0;
  const fullStars = Math.floor(safeRating);
  const hasHalfStar = safeRating % 1 >= 0.5;

  return (
    <div className="flex items-center gap-2" role="img" aria-label={`Rating: ${safeRating} out of 5 stars`}>
      <div className="flex">
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />;
          }
          if (i === fullStars && hasHalfStar) {
            return <StarHalf key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />;
          }
          return <Star key={i} className="h-4 w-4 text-muted-foreground/30" />;
        })}
      </div>
      {count > 0 && (
        <span className="text-sm text-muted-foreground">({count} reviews)</span>
      )}
    </div>
  );
};

// ============================================================
// MAIN PRODUCT DETAIL PAGE
// ============================================================

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = Number(params.id);
  const prevIdRef = useRef<number>(id);

  const { isAuthenticated } = useAuth();
  const { addToCart, addToCartLoading } = useCart();
  const { addToWishlist, removeFromWishlist, checkInWishlist } = useWishlist();
  const { reviews, stats, statsLoading } = useReviews(id);

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  // ============================================================
  // FORCE CACHE INVALIDATION ON ID CHANGE
  // ============================================================

  useEffect(() => {
    if (prevIdRef.current !== id) {
      queryClient.removeQueries({ queryKey: ['product'] });
      queryClient.invalidateQueries({ queryKey: ['product'] });
      setQuantity(1);
      setSelectedImage(0);
      setIsInWishlist(false);
      setImageError(false);
      prevIdRef.current = id;
    }
  }, [id, queryClient]);

  // ============================================================
  // FETCH PRODUCT - Optimized with staleTime
  // ============================================================

  const { 
    data: product, 
    isLoading, 
    error,
    isFetching,
  } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const result = await productService.getProduct(id);
      return result;
    },
    enabled: !isNaN(id) && id > 0,
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // ============================================================
  // CHECK WISHLIST STATUS - Memoized
  // ============================================================

  useEffect(() => {
    if (isAuthenticated && product) {
      checkInWishlist(product.id).then(setIsInWishlist);
    }
  }, [isAuthenticated, product, checkInWishlist]);

  // ============================================================
  // MEMOIZED COMPUTED VALUES
  // ============================================================

  const isOutOfStock = useMemo(() => {
    const stock = product?.stock ?? 0;
    return stock === 0;
  }, [product?.stock]);
  const isLowStock = useMemo(() => {
    const stock = product?.stock ?? 0;
    return stock > 0 && stock <= 5;
  }, [product?.stock]);
  const discount = useMemo(() => 
    product?.compareAtPrice ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100) : 0,
    [product?.compareAtPrice, product?.price]
  );

  const images = useMemo(() => 
    Array.isArray(product?.images) ? product.images : 
    product?.imageUrl ? [product.imageUrl] : [],
    [product]
  );

  const averageRating = useMemo(() => 
    typeof product?.averageRating === 'number' 
      ? product.averageRating 
      : Number(product?.averageRating) || 0,
    [product?.averageRating]
  );

  // ============================================================
  // MEMOIZED HANDLERS
  // ============================================================

  const handleQuantityChange = useCallback((value: number) => {
    if (value < 1) return;
    if (product && value > product.stock) {
      toast.error(`Only ${product.stock} items available`);
      return;
    }
    setQuantity(value);
  }, [product]);

  const handleAddToCart = useCallback(async () => {
    if (!product) return;
    try {
      await addToCart({ productId: product.id, quantity });
      toast.success(`${product.title} added to cart!`);
    } catch (error: any) {
      if (error?.requiresAuth || error?.statusCode === 401) {
        toast.error('Please login to add items to cart');
        router.push('/login');
        return;
      }
      toast.error(error?.message || 'Failed to add to cart');
    }
  }, [addToCart, product, quantity, router]);

  const handleWishlistToggle = useCallback(async () => {
    if (!product || !isAuthenticated) {
      toast.info('Please login to add to wishlist');
      router.push('/login');
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
  }, [isAuthenticated, isInWishlist, isWishlistLoading, addToWishlist, removeFromWishlist, product, router]);

  const handleShare = useCallback(async () => {
    if (!product) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.title,
          text: `Check out ${product.title} on SnapCart!`,
          url: window.location.href,
        });
      } catch {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      } catch {
        toast.error('Failed to copy link');
      }
    }
  }, [product]);

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (isLoading || isFetching) {
    return <ProductDetailSkeleton />;
  }

  // ============================================================
  // ERROR STATE
  // ============================================================

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Product Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The product you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/products">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Browse Products
            </Button>
          </Link>
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* Breadcrumb – with SEO structure */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/products" className="hover:text-foreground transition-colors">Products</Link>
          <span aria-hidden="true">/</span>
          <span className="text-foreground font-medium truncate max-w-48" aria-current="page">
            {product.title}
          </span>
        </nav>

        {/* Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column – Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="relative aspect-square bg-muted/20 rounded-2xl overflow-hidden"
            >
              {product.imageUrl && !imageError ? (
                <Image
                  src={product.imageUrl}
                  alt={product.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 100vw, 50vw"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted/30">
                  <Package className="h-20 w-20 text-muted-foreground/30" />
                </div>
              )}
              
              {/* Badges */}
              {isOutOfStock && (
                <Badge variant="destructive" className="absolute top-4 left-4 text-sm px-4 py-1.5">
                  Out of Stock
                </Badge>
              )}
              {isLowStock && !isOutOfStock && (
                <Badge className="absolute top-4 left-4 text-sm px-4 py-1.5 bg-amber-500">
                  Low Stock
                </Badge>
              )}
              {discount > 0 && (
                <Badge className="absolute top-4 right-4 text-sm px-4 py-1.5 bg-red-500">
                  -{discount}%
                </Badge>
              )}
            </motion.div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2" role="tablist" aria-label="Product images">
                {images.map((img: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      "relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-all shrink-0",
                      selectedImage === index ? "border-orange-500" : "border-transparent hover:border-muted"
                    )}
                    role="tab"
                    aria-selected={selectedImage === index}
                    aria-label={`Product image ${index + 1}`}
                  >
                    <Image
                      src={img}
                      alt={`${product.title} - Image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column – Product Info */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-6"
          >
            {/* Title */}
            <div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
                {product.title}
              </h1>
            </div>

            {/* Rating */}
            <Rating rating={averageRating} count={product.totalReviews || 0} />

            {/* Price */}
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
              {product.compareAtPrice && (
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(product.compareAtPrice)}
                </span>
              )}
              {discount > 0 && (
                <Badge className="bg-green-500 text-white text-sm px-3 py-1">
                  Save {discount}%
                </Badge>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {isOutOfStock ? (
                <span className="text-red-500 font-medium flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Out of Stock
                </span>
              ) : (
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  In Stock ({product.stock} available)
                </span>
              )}
            </div>

            {/* Description */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>

            <Separator />

            {/* Quantity & Add to Cart */}
            {!isOutOfStock && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Quantity:</span>
                  <div className="flex items-center border rounded-lg">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-none hover:bg-muted"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-medium text-lg" aria-label={`Quantity: ${quantity}`}>
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-none hover:bg-muted"
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= product.stock}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    className="flex-1 min-w-45 bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={handleAddToCart}
                    disabled={addToCartLoading}
                  >
                    {addToCartLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ShoppingCart className="h-4 w-4 mr-2" />
                    )}
                    Add to Cart
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-6"
                    onClick={handleWishlistToggle}
                    disabled={isWishlistLoading}
                    aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <Heart className={cn(
                      "h-5 w-5 transition-colors",
                      isInWishlist ? "fill-red-500 text-red-500" : "text-muted-foreground"
                    )} />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-6"
                    onClick={handleShare}
                    aria-label="Share product"
                  >
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>

                {/* Buy Now Button */}
                <Button
                  size="lg"
                  variant="default"
                  className="w-full bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
                  onClick={handleAddToCart}
                  disabled={addToCartLoading}
                >
                  Buy Now
                </Button>
              </div>
            )}

            {/* Product Features */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4 text-orange-500" />
                Free Shipping
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-orange-500" />
                Secure Payment
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 text-orange-500" />
                Easy Returns
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4 text-orange-500" />
                Quality Guarantee
              </div>
            </div>
          </motion.div>
        </div>

        {/* Reviews & Details Tabs */}
        <div className="mt-12">
          <Tabs defaultValue="reviews" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2" aria-label="Product information tabs">
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
            </TabsList>
            <TabsContent value="reviews" className="mt-6">
              <div className="space-y-6">
                <ReviewList productId={product.id} />
                {isAuthenticated && (
                  <div className="mt-8">
                    <h3 className="font-semibold text-lg mb-4">Write a Review</h3>
                    <ReviewForm productId={product.id} />
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="details" className="mt-6">
              <div className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Product ID</p>
                    <p className="font-medium">#{product.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{product.category?.name || 'Uncategorized'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stock Status</p>
                    <p className="font-medium">{isOutOfStock ? 'Out of Stock' : `${product.stock} in stock`}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rating</p>
                    <p className="font-medium">{formatRating(product.averageRating)}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Related Products */}
        <RelatedProducts currentProductId={product.id} categoryId={product.category?.id} />
      </div>
    </ErrorBoundary>
  );
}

// ============================================================
// SKELETON LOADING STATE
// ============================================================

function ProductDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-4 md:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="space-y-4">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="w-20 h-20 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}