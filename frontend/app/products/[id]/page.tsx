// app/products/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/product.service';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { useWishlistStore } from '@/store/wishlist-store';
import { useReviews } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  AlertCircle,
  Minus,
  Plus,
  Loader2,
  Store,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { formatPrice, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { VendorChatDrawer } from '@/components/chat/VendorChatDrawer';

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
            return <Star key={i} className="h-4 w-4 fill-orange-500 text-orange-500" />;
          }
          if (i === fullStars && hasHalfStar) {
            return <StarHalf key={i} className="h-4 w-4 fill-orange-500 text-orange-500" />;
          }
          return <Star key={i} className="h-4 w-4 text-muted-foreground/25" />;
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

// ============================================================
// ROUTE ENTRY — keys the content by id so React fully remounts
// (fresh useState, fresh useQuery instance) whenever the product
// id changes. Next.js reuses the same component instance across
// navigations within the same route pattern, so without this key,
// local state and in-flight queries from the previous product can
// bleed into the new one.
// ============================================================

export default function ProductDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const idStr = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!idStr) {
    return <ProductDetailSkeleton />;
  }

  const numericId = parseInt(idStr, 10);
  if (isNaN(numericId) || numericId <= 0) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">Product not found</h2>
        <p className="mx-auto mt-2 mb-8 max-w-sm text-muted-foreground">
          The product you are looking for does not exist or has been removed.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/products">
            <Button className="h-11 gap-2 rounded-full bg-zinc-950 px-6 text-white hover:bg-zinc-800">
              <ArrowLeft className="h-4 w-4" />
              Browse products
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <ProductDetailPageContent key={numericId} id={numericId} />;
}

function ProductDetailPageContent({ id }: { id: number }) {
  const router = useRouter();

  const { isAuthenticated } = useAuth();
  const { addToCart, addToCartLoading } = useCart();
  const { addToWishlist, removeFromWishlist } = useWishlist();
  const { reviews, stats, statsLoading } = useReviews(id);

  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const isInWishlist = useWishlistStore((state) =>
    state.items.some((item) => item.id === id)
  );
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

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
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });



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

  const discount = useMemo(
    () =>
      product?.compareAtPrice
        ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
        : 0,
    [product?.compareAtPrice, product?.price]
  );

  const images = useMemo(() => {
    const list: string[] = [];
    if (product?.imageUrl && typeof product.imageUrl === 'string') {
      list.push(product.imageUrl);
    }
    if (Array.isArray(product?.additionalImages)) {
      product.additionalImages.forEach((img) => {
        if (img && typeof img === 'string' && !list.includes(img)) {
          list.push(img);
        }
      });
    }
    if (Array.isArray(product?.images)) {
      product.images.forEach((img: any) => {
        const url = typeof img === 'string' ? img : img?.url;
        if (url && typeof url === 'string' && !list.includes(url)) {
          list.push(url);
        }
      });
    }
    return list;
  }, [product]);

  const averageRating = useMemo(
    () => (typeof product?.averageRating === 'number' ? product.averageRating : Number(product?.averageRating) || 0),
    [product?.averageRating]
  );

  // Provide fallback image & support thumbnail selection
  const mainImageSrc = useMemo(() => {
    if (imageError) return '/placeholder-image.png';
    if (images.length > 0 && selectedImage < images.length) {
      const img = images[selectedImage];
      if (typeof img === 'string') return img;
      if (img && typeof img === 'object' && 'url' in img) return (img as any).url;
    }
    return product?.imageUrl || '/placeholder-image.png';
  }, [images, selectedImage, product?.imageUrl, imageError]);

  // ============================================================
  // MEMOIZED HANDLERS
  // ============================================================

  const handleQuantityChange = useCallback(
    (value: number) => {
      if (value < 1) return;
      if (product && value > product.stock) {
        toast.error(`Only ${product.stock} items available`);
        return;
      }
      setQuantity(value);
    },
    [product]
  );

  const handleAddToCart = useCallback(async () => {
    if (!product) return;
    try {
      await addToCart({ productId: product.id, quantity, product });
    } catch {
      // toast is handled centrally in useCart
    }
  }, [addToCart, product, quantity]);

  const handleWishlistToggle = useCallback(async () => {
    if (!product) return;
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
      toast.error(error?.message || 'Failed to update wishlist');
    } finally {
      setIsWishlistLoading(false);
    }
  }, [isInWishlist, isWishlistLoading, addToWishlist, removeFromWishlist, product]);

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

  if (isLoading || (isFetching && !product)) {
    return <ProductDetailSkeleton />;
  }

  // ============================================================
  // ERROR STATE
  // ============================================================

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="h-7 w-7 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">Product not found</h2>
        <p className="mx-auto mt-2 mb-8 max-w-sm text-muted-foreground">
          The product you are looking for does not exist or has been removed.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/products">
            <Button className="h-11 gap-2 rounded-full bg-zinc-950 px-6 text-white hover:bg-zinc-800">
              <ArrowLeft className="h-4 w-4" />
              Browse products
            </Button>
          </Link>
          <Button
            variant="outline"
            className="h-11 rounded-full px-6"
            onClick={() => router.back()}
          >
            Go back
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
      <div className="container mx-auto px-4 py-6 md:py-10">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/" className="transition-colors hover:text-foreground">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link href="/products" className="transition-colors hover:text-foreground">
            Products
          </Link>
          <span aria-hidden="true">/</span>
          <span className="max-w-48 truncate font-medium text-foreground" aria-current="page">
            {product.title}
          </span>
        </nav>

        {/* Product Grid */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
          {/* Left Column – Images */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted/20 transition-opacity duration-300">
              <Image
                src={mainImageSrc}
                alt={product.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                onError={() => setImageError(true)}
              />

              {/* Badges */}
              <div className="absolute left-4 top-4 z-10 flex flex-col items-start gap-1.5">
                {isOutOfStock && (
                  <span className="rounded-full bg-zinc-950/90 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
                    Out of stock
                  </span>
                )}
                {isLowStock && !isOutOfStock && (
                  <span className="rounded-full border border-orange-200 bg-white/90 px-3 py-1.5 text-xs font-semibold text-orange-700 backdrop-blur-sm">
                    Only {product.stock} left
                  </span>
                )}
              </div>
              {discount > 0 && (
                <span className="absolute right-4 top-4 z-10 rounded-full bg-orange-600 px-3 py-1.5 text-xs font-semibold tabular-nums text-white">
                  −{discount}%
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1" role="tablist" aria-label="Product images">
                {images.map((img: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={cn(
                      'relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                      selectedImage === index
                        ? 'border-orange-600 ring-2 ring-orange-600/15'
                        : 'border-transparent opacity-80 hover:border-border hover:opacity-100'
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
          <div className="space-y-7">
            {/* Title, rating, price */}
            <div className="space-y-3">
              <h1 className="text-3xl font-black leading-tight tracking-tight md:text-4xl">
                {product.title}
              </h1>

              <Rating rating={averageRating} count={product.totalReviews || 0} />

              <div className="flex items-center gap-3 pt-1">
                <span className="text-3xl font-bold tabular-nums">{formatPrice(product.price)}</span>
                {product.compareAtPrice && (
                  <span className="text-lg text-muted-foreground line-through tabular-nums">
                    {formatPrice(product.compareAtPrice)}
                  </span>
                )}
                {discount > 0 && (
                  <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                    Save {discount}%
                  </span>
                )}
              </div>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2 text-sm">
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-orange-500' : 'bg-emerald-500'
                )}
              />
              {isOutOfStock ? (
                <span className="font-medium text-muted-foreground">Currently unavailable</span>
              ) : (
                <span className="font-medium text-foreground">
                  In stock · {product.stock} available
                </span>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2 border-t border-border pt-6">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Description
              </h3>
              <p className="leading-relaxed text-muted-foreground">{product.description}</p>
            </div>

            {/* Quantity & Add to Cart */}
            {!isOutOfStock && (
              <div className="space-y-4 border-t border-border pt-6">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Quantity</span>
                  <div className="flex items-center rounded-full border border-border">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-full"
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-10 text-center text-sm font-semibold tabular-nums" aria-label={`Quantity: ${quantity}`}>
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-full"
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= product.stock}
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    className="h-12 min-w-45 flex-1 gap-2 rounded-full bg-zinc-950 text-white hover:bg-zinc-800"
                    onClick={handleAddToCart}
                    disabled={addToCartLoading}
                  >
                    {addToCartLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                    Add to cart
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-12 w-12 rounded-full hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                    onClick={handleWishlistToggle}
                    disabled={isWishlistLoading}
                    aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <Heart
                      className={cn(
                        'h-5 w-5 transition-colors',
                        isInWishlist ? 'fill-orange-600 text-orange-600' : 'text-muted-foreground'
                      )}
                    />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-12 w-12 rounded-full hover:border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                    onClick={handleShare}
                    aria-label="Share product"
                  >
                    <Share2 className="h-5 w-5 text-muted-foreground" />
                  </Button>
                </div>

                {/* Buy Now Button */}
                <Button
                  size="lg"
                  className="h-12 w-full rounded-full bg-orange-600 text-white hover:bg-orange-700"
                  onClick={handleAddToCart}
                  disabled={addToCartLoading}
                >
                  Buy now
                </Button>
              </div>
            )}

            {/* Marketplace Buy Box: Seller Info & Delivery */}
            <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-sm">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Sold by</span>
                      <span className="text-sm font-bold text-foreground">
                        {product.owner?.vendorBusinessName || product.owner?.name || 'SnapCart Official Store'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Verified Marketplace Seller</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {product.owner?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsChatOpen(true)}
                      className="h-8 rounded-full text-xs gap-1 border-orange-500/30 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/20"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Ask Seller
                    </Button>
                  )}
                  {product.owner?.id && (
                    <Link href={`/stores/${product.owner.id}`}>
                      <Button variant="outline" size="sm" className="h-8 rounded-full text-xs gap-1">
                        Visit Store <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>

              <div className="border-t border-border/60 pt-2.5 text-xs text-muted-foreground space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-orange-600" />
                    Delivery: <strong className="text-foreground font-semibold">FREE Standard Delivery</strong>
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">In 2–4 Business Days</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span>Ships from</span>
                  <span className="font-medium text-foreground">SnapCart Logistics Network</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span>Buyer Protection</span>
                  <span className="font-medium text-foreground">30-day hassle-free returns</span>
                </div>
              </div>
            </div>

            {/* Product Features */}
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-6 text-center sm:grid-cols-4">
              <div className="flex flex-col items-center gap-1.5">
                <Truck className="h-4 w-4 text-orange-600" />
                <p className="text-[11px] text-muted-foreground">Free shipping</p>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Shield className="h-4 w-4 text-orange-600" />
                <p className="text-[11px] text-muted-foreground">Secure payment</p>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <RefreshCw className="h-4 w-4 text-orange-600" />
                <p className="text-[11px] text-muted-foreground">Easy returns</p>
              </div>
              <div className="flex flex-col items-center gap-1.5">
                <Package className="h-4 w-4 text-orange-600" />
                <p className="text-[11px] text-muted-foreground">Quality guarantee</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews & Details Tabs */}
        <div className="mt-16">
          <Tabs defaultValue="reviews" className="w-full">
            <TabsList
              className="grid w-full max-w-md grid-cols-2 rounded-full bg-muted p-1"
              aria-label="Product information tabs"
            >
              <TabsTrigger value="reviews" className="rounded-full data-[state=active]:shadow-sm">
                Reviews
              </TabsTrigger>
              <TabsTrigger value="details" className="rounded-full data-[state=active]:shadow-sm">
                Details
              </TabsTrigger>
            </TabsList>
            <TabsContent value="reviews" className="mt-8">
              <div className="space-y-6">
                <ReviewList productId={product.id} />
                {isAuthenticated && (
                  <div className="mt-8 border-t border-border pt-8">
                    <h3 className="mb-4 text-lg font-semibold">Write a review</h3>
                    <ReviewForm productId={product.id} />
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="details" className="mt-8">
              <div className="max-w-2xl space-y-4">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Product ID
                    </p>
                    <p className="font-semibold tabular-nums">#{product.id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Category
                    </p>
                    <p className="font-semibold">{product.category?.name || 'Uncategorized'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Stock status
                    </p>
                    <p className="font-semibold">
                      {isOutOfStock ? 'Out of stock' : `${product.stock} in stock`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Rating
                    </p>
                    <p className="font-semibold tabular-nums">{formatRating(product.averageRating)}</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Related Products */}
        <div className="mt-16">
          <RelatedProducts currentProductId={product.id} categoryId={product.category?.id} />
        </div>

        {/* Real-time Seller Inquiries Drawer */}
        {isChatOpen && product.owner && (
          <VendorChatDrawer
            partner={product.owner}
            productId={product.id}
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

// ============================================================
// SKELETON LOADING STATE
// ============================================================

function ProductDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
      <Skeleton className="mb-6 h-4 w-56 rounded-full" />
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-14">
        <div className="space-y-4">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="flex gap-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-20 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-7">
          <div className="space-y-3">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-40" />
          </div>
          <Skeleton className="h-5 w-40" />
          <div className="space-y-2 border-t border-border pt-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-4 border-t border-border pt-6">
            <Skeleton className="h-11 w-full rounded-full" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-6 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}