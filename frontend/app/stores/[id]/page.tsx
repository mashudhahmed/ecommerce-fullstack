'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { vendorService } from '@/services/vendor.service';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  CheckCircle2,
  Star,
  Package,
  Calendar,
  Search,
  ArrowLeft,
  Mail,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react';

export default function PublicStorefrontPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const vendorId = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured');

  const { data: storeData, isLoading, error } = useQuery({
    queryKey: ['public-store', vendorId],
    queryFn: () => vendorService.getPublicVendor(vendorId),
    enabled: !isNaN(vendorId) && vendorId > 0,
    staleTime: 60 * 1000,
  });

  const products = useMemo(() => {
    if (!storeData?.products) return [];
    return storeData.products;
  }, [storeData]);

  // Extract unique categories from vendor's products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p: any) => {
      if (p.category?.name) set.add(p.category.name);
    });
    return Array.from(set);
  }, [products]);

  // Filter & sort products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p: any) =>
          p.title?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'all') {
      list = list.filter((p: any) => p.category?.name === selectedCategory);
    }

    if (sortBy === 'price-asc') {
      list.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === 'rating') {
      list.sort((a, b) => Number(b.averageRating || 0) - Number(a.averageRating || 0));
    }

    return list;
  }, [products, searchQuery, selectedCategory, sortBy]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="flex gap-6 items-center">
          <Skeleton className="h-24 w-24 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !storeData) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <Store className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">Seller Store Not Found</h2>
        <p className="mt-2 text-sm text-muted-foreground mb-6">
          This seller storefront is either unavailable or has not been activated yet.
        </p>
        <Button onClick={() => router.push('/products')} className="rounded-full">
          <ArrowLeft className="mr-2 h-4 w-4" /> Browse All Products
        </Button>
      </div>
    );
  }

  const storeName =
    storeData.businessName || storeData.vendorBusinessName || storeData.name || 'Marketplace Seller';
  const memberSince = storeData.createdAt
    ? new Date(storeData.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      {/* Store Header Banner */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-gradient-to-r from-zinc-900 via-zinc-800 to-orange-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.15),transparent_50%)]" />
        <div className="container mx-auto px-4 h-full flex flex-col justify-between py-6 relative z-10 max-w-7xl">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full w-fit"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Marketplace
          </Link>

          <div className="text-white space-y-1">
            <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30 gap-1.5">
              <CheckCircle2 className="h-3 w-3" /> Verified Marketplace Merchant
            </Badge>
          </div>
        </div>
      </div>

      {/* Seller Profile Bar */}
      <div className="container mx-auto px-4 max-w-7xl -mt-16 relative z-20">
        <div className="bg-background rounded-3xl border border-border/60 shadow-xl p-6 sm:p-8">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-orange-600/10 border-2 border-orange-500/20 flex items-center justify-center text-orange-600 font-black text-3xl shadow-inner shrink-0 overflow-hidden">
                {storeData.avatar ? (
                  <Image
                    src={storeData.avatar}
                    alt={storeName}
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  storeName.slice(0, 2).toUpperCase()
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{storeName}</h1>
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                    <CheckCircle2 className="h-3 w-3" /> Official Store
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs sm:text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
                    4.9 · High Seller Rating
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    {products.length} Products listed
                  </span>
                  {memberSince && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Seller since {memberSince}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Seller Contact & Bio */}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground max-w-sm">
              {storeData.businessDescription && (
                <p className="line-clamp-2 text-xs leading-relaxed">{storeData.businessDescription}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Search & Filter Controls */}
      <div className="container mx-auto px-4 max-w-7xl mt-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-background p-4 rounded-2xl border border-border/60">
          {/* Store search input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search in ${storeName}...`}
              className="pl-10 h-10 rounded-xl"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
            <Button
              size="sm"
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              className="rounded-full text-xs h-8"
              onClick={() => setSelectedCategory('all')}
            >
              All ({products.length})
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={selectedCategory === cat ? 'default' : 'outline'}
                className="rounded-full text-xs h-8"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <SlidersHorizontal className="h-3 w-3" /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs font-medium rounded-xl border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Catalog Grid */}
      <div className="container mx-auto px-4 max-w-7xl mt-8">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-background rounded-3xl border border-border/60">
            <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-lg font-bold">No Products Found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              No products match your current search query or category filter.
            </p>
            {(searchQuery || selectedCategory !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 rounded-full"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((prod: any) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
