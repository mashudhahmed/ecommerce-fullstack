import { useState, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { searchService } from '@/services/search.service';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from 'sonner';

export function useSearch() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    categoryId: undefined as number | undefined,
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    inStock: undefined as boolean | undefined,
    minRating: undefined as number | undefined,
    sortBy: undefined as string | undefined,
    sortOrder: undefined as 'asc' | 'desc' | undefined,
  });

  const debouncedQuery = useDebounce(query, 500);

  const { data: results, isLoading } = useQuery({
    queryKey: ['search', debouncedQuery, filters],
    queryFn: () => searchService.search(debouncedQuery, filters),
    enabled: debouncedQuery.length > 0,
  });

  const { data: suggestions } = useQuery({
    queryKey: ['search', 'autocomplete', query],
    queryFn: () => searchService.autocomplete(query),
    enabled: query.length > 2,
  });

  const { data: popularTerms } = useQuery({
    queryKey: ['search', 'popular'],
    queryFn: searchService.getPopularTerms,
  });

  const reindexMutation = useMutation({
    mutationFn: searchService.reindex,
    onSuccess: () => {
      toast.success('Reindex started successfully');
    },
  });

  const handleSearch = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setFilters((prev) => ({ ...prev, page: 1 }));
  }, []);

  const updateFilters = useCallback((newFilters: Partial<typeof filters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: 1 }));
  }, []);

  const goToPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  }, []);

  return {
    query,
    setQuery: handleSearch,
    filters,
    updateFilters,
    goToPage,
    results,
    suggestions,
    popularTerms,
    isLoading,
    reindex: reindexMutation.mutateAsync,
    reindexLoading: reindexMutation.isPending,
  };
}