// hooks/useReviews.ts
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { reviewsService, Review } from '@/services/reviews.service';
import { toast } from 'sonner';

export function useReviews(productId: number) {
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['reviews', 'stats', productId],
    queryFn: () => reviewsService.getProductReviewStats(productId),
    enabled: !!productId,
  });

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['reviews', 'list', productId],
    queryFn: ({ pageParam = 1 }) =>
      reviewsService.getProductReviews(productId, pageParam, 10),
    getNextPageParam: (lastPage: any) => {
      const meta = lastPage?.meta;
      if (!meta || typeof meta.page !== 'number' || typeof meta.totalPages !== 'number') {
        return undefined;
      }
      return meta.page < meta.totalPages ? meta.page + 1 : undefined;
    },
    enabled: !!productId,
    initialPageParam: 1,
  });

  const createMutation = useMutation({
    mutationFn: reviewsService.createReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'list', productId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'stats', productId] });
      toast.success('Review submitted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to submit review');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: reviewsService.deleteReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'list', productId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'stats', productId] });
      toast.success('Review deleted');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete review');
    },
  });

  const helpfulMutation = useMutation({
    mutationFn: reviewsService.markHelpful,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'list', productId] });
    },
  });

  // ✅ Safe: support both { data: Review[] } and direct Review[] array pages
  const allReviews =
    data?.pages?.flatMap((page: any) => {
      if (Array.isArray(page?.data)) return page.data;
      if (Array.isArray(page)) return page;
      return [];
    }) || [];

  return {
    reviews: allReviews,
    stats,
    statsLoading,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    createReview: createMutation.mutateAsync,
    createLoading: createMutation.isPending,
    deleteReview: deleteMutation.mutateAsync,
    deleteLoading: deleteMutation.isPending,
    markHelpful: helpfulMutation.mutateAsync,
  };
}