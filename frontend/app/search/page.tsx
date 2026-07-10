// app/search/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSearch } from '@/hooks/useSearch';
import { ProductCard } from '@/components/products/ProductCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search as SearchIcon, X, Filter } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 500);
  const { results, isLoading, filters, updateFilters } = useSearch();

  useEffect(() => {
    if (debouncedQuery) {
      // Trigger search with debounced query
    }
  }, [debouncedQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Trigger search
  };

  const clearSearch = () => {
    setQuery('');
  };

  const products = results?.data || [];
  const totalResults = results?.total || 0;

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div>
        <h1 className="text-3xl font-bold">Search Products</h1>
        <p className="text-muted-foreground">Find the perfect product</p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for products..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-10"
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button type="submit" className="gap-2">
          <SearchIcon className="h-4 w-4" />
          Search
        </Button>
      </form>

      {/* Results Info */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {totalResults} result{totalResults !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Results Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-xl" />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : query ? (
        <Card className="p-12 text-center">
          <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h3 className="text-xl font-semibold mt-4">No results found</h3>
          <p className="text-muted-foreground mt-2">
            Try adjusting your search terms or browse our categories
          </p>
          <Button variant="outline" className="mt-4" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </Card>
      ) : (
        <Card className="p-12 text-center">
          <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h3 className="text-xl font-semibold mt-4">Start searching</h3>
          <p className="text-muted-foreground mt-2">
            Enter a search term to find products
          </p>
        </Card>
      )}
    </div>
  );
}