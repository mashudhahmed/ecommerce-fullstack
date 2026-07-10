// hooks/useWishlist.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistService } from '@/services/wishlist.service';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useWishlist() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: wishlist, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistService.getWishlist(),
    enabled: isAuthenticated,
  });

  const { data: count } = useQuery({
    queryKey: ['wishlist', 'count'],
    queryFn: wishlistService.getWishlistCount,
    enabled: isAuthenticated,
  });

  const addMutation = useMutation({
    mutationFn: wishlistService.addToWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist', 'count'] });
    },
    onError: (error: any) => {
      if (error?.statusCode === 409) {
        toast.info('Already in wishlist');
      } else {
        toast.error(error?.message || 'Failed to add to wishlist');
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: wishlistService.removeFromWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist', 'count'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to remove from wishlist');
    },
  });

  const clearMutation = useMutation({
    mutationFn: wishlistService.clearWishlist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist', 'count'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to clear wishlist');
    },
  });

  const checkInWishlist = async (productId: number): Promise<boolean> => {
    if (!isAuthenticated) return false;
    return wishlistService.isInWishlist(productId);
  };

  return {
    wishlist: wishlist?.data || [],
    total: wishlist?.meta?.total || 0,
    isLoading,
    count: count || 0,
    addToWishlist: addMutation.mutateAsync,
    addLoading: addMutation.isPending,
    removeFromWishlist: removeMutation.mutateAsync,
    removeLoading: removeMutation.isPending,
    clearWishlist: clearMutation.mutateAsync,
    clearLoading: clearMutation.isPending,
    checkInWishlist,
  };
}