// app/products/page.tsx
'use client';

import { useState, useMemo, useTransition } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productService, ProductFilters } from '@/services/product.service';
import { useCategories } from '@/hooks/useCategories';
import { ProductList } from '@/components/products/ProductList';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  ArrowUpDown, 
  Star, 
  Check, 
  Filter, 
  PackageCheck,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProductsPage() {
  const { categories, isLoading: isCategoriesLoading } = useCategories();
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>(undefined);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'popular'>('newest');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Debounced search / filter parameters for React Query
  const filters: ProductFilters = useMemo(() => {
    return {
      search: searchTerm.trim() || undefined,
      categoryId: selectedCategoryId,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      inStock: inStockOnly ? true : undefined,
      sortBy: sortBy === 'popular' ? 'newest' : sortBy,
    };
  }, [searchTerm, selectedCategoryId, minPrice, maxPrice, inStockOnly, sortBy]);

  // Query products with active filters
  const { data: rawProducts = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productService.getProducts(filters),
    staleTime: 30 * 1000,
  });

  // Client-side rating filter
  const products = useMemo(() => {
    if (!minRating) return rawProducts;
    return rawProducts.filter((p) => (p.averageRating || 0) >= minRating);
  }, [rawProducts, minRating]);

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategoryId(undefined);
    setMinPrice('');
    setMaxPrice('');
    setInStockOnly(false);
    setMinRating(0);
    setSortBy('newest');
  };

  const hasActiveFilters = Boolean(
    searchTerm ||
    selectedCategoryId ||
    minPrice ||
    maxPrice ||
    inStockOnly ||
    minRating > 0 ||
    sortBy !== 'newest'
  );

  return (
    <div className="space-y-6">
      {/* Top Banner & Search Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Marketplace Catalog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Discover verified merchant offerings across all categories
          </p>
        </div>

        {/* Global Search Bar */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search title, brand, details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 h-10 rounded-full border-border/80 bg-background focus-visible:ring-orange-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Mobile Filter Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            className="md:hidden h-10 rounded-full gap-1.5 shrink-0"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="h-2 w-2 rounded-full bg-orange-600" />
            )}
          </Button>
        </div>
      </div>

      {/* Main Grid: Sidebar Filters + Products Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        {/* Left Filter Sidebar (Desktop + Mobile drawer toggle) */}
        <aside className={cn(
          "space-y-6 md:block",
          isMobileFiltersOpen ? "block" : "hidden"
        )}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold flex items-center gap-2">
              <Filter className="h-4 w-4 text-orange-600" />
              Filter By
            </h2>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50 px-2"
              >
                Reset All
              </Button>
            )}
          </div>

          {/* Categories Facet */}
          <Card className="border-border/60 shadow-none">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Departments
              </h3>
              <div className="space-y-1 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                <button
                  onClick={() => setSelectedCategoryId(undefined)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between",
                    selectedCategoryId === undefined
                      ? "bg-orange-50 text-orange-600 font-semibold dark:bg-orange-950/30"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  <span>All Categories</span>
                  {selectedCategoryId === undefined && <Check className="h-3 w-3" />}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between",
                      selectedCategoryId === cat.id
                        ? "bg-orange-50 text-orange-600 font-semibold dark:bg-orange-950/30"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <span className="truncate">{cat.name}</span>
                    {selectedCategoryId === cat.id && <Check className="h-3 w-3 shrink-0" />}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Price Range Facet */}
          <Card className="border-border/60 shadow-none">
            <CardContent className="p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Price ($)
              </h3>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="h-8 text-xs"
                />
                <span className="text-muted-foreground text-xs">to</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: 'Under $25', min: '', max: '25' },
                  { label: '$25 to $100', min: '25', max: '100' },
                  { label: 'Over $100', min: '100', max: '' },
                ].map((tier) => (
                  <Button
                    key={tier.label}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMinPrice(tier.min);
                      setMaxPrice(tier.max);
                    }}
                    className={cn(
                      "h-6 text-[11px] px-2 rounded-full",
                      minPrice === tier.min && maxPrice === tier.max && "border-orange-500 bg-orange-50 text-orange-600"
                    )}
                  >
                    {tier.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Customer Reviews Rating Facet */}
          <Card className="border-border/60 shadow-none">
            <CardContent className="p-4 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Customer Rating
              </h3>
              {[4, 3, 2, 1].map((stars) => (
                <button
                  key={stars}
                  onClick={() => setMinRating(minRating === stars ? 0 : stars)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                    minRating === stars ? "bg-orange-50 dark:bg-orange-950/30 text-orange-600 font-semibold" : "hover:bg-muted"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="flex text-amber-500">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={idx}
                          className={cn(
                            "h-3.5 w-3.5",
                            idx < stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-muted-foreground text-[11px]">& Up</span>
                  </div>
                  {minRating === stars && <Check className="h-3 w-3 shrink-0" />}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Availability / In Stock */}
          <Card className="border-border/60 shadow-none">
            <CardContent className="p-4">
              <label className="flex items-center gap-2.5 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded border-input text-orange-600 focus:ring-orange-500 h-4 w-4"
                />
                <span className="flex items-center gap-1.5">
                  <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />
                  In Stock Only
                </span>
              </label>
            </CardContent>
          </Card>
        </aside>

        {/* Catalog Main Content */}
        <div className="md:col-span-3 space-y-4">
          {/* Active Chips & Sort Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-3 rounded-2xl border border-border/60">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Showing <strong className="text-foreground">{products.length}</strong> items</span>
              {isFetching && <span className="animate-spin text-orange-600">●</span>}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="newest">Featured & Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="popular">Popularity</option>
              </select>
            </div>
          </div>

          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-1.5">
              {searchTerm && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Query: {searchTerm}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchTerm('')} />
                </Badge>
              )}
              {selectedCategoryId && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Category: {categories.find((c) => c.id === selectedCategoryId)?.name || selectedCategoryId}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategoryId(undefined)} />
                </Badge>
              )}
              {(minPrice || maxPrice) && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Price: ${minPrice || '0'} - ${maxPrice || '∞'}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => { setMinPrice(''); setMaxPrice(''); }} />
                </Badge>
              )}
              {minRating > 0 && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Rating: {minRating}★+
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setMinRating(0)} />
                </Badge>
              )}
              {inStockOnly && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  In Stock Only
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setInStockOnly(false)} />
                </Badge>
              )}
            </div>
          )}

          {/* Product Cards Grid */}
          <ProductList products={products} isLoading={isLoading} columns={3} />
        </div>
      </div>
    </div>
  );
}