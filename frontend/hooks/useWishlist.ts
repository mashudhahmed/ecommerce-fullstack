// hooks/useWishlist.ts
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistService } from '@/services/wishlist.service';
import { useWishlistStore } from '@/store/wishlist-store';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useWishlist() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { items, addItem, removeItem, clear, isInWishlist, getTotal, syncWithServer } =
    useWishlistStore();

  // ============================================================
  // SERVER FETCH — source of truth for persistence, hydrates the
  // local store once so subsequent reads are instant/synchronous.
  // ============================================================
  const { data: serverWishlist, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistService.getWishlist(),
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (serverWishlist?.data) {
      syncWithServer(serverWishlist.data);
    }
  }, [serverWishlist, syncWithServer]);

  // ✅ Clear the local store on logout so a subsequent user on the
  // same device doesn't see a stale wishlist before the next sync.
  useEffect(() => {
    if (!isAuthenticated) {
      clear();
    }
  }, [isAuthenticated, clear]);

  // ============================================================
  // ADD — optimistic: updates the store immediately, then persists.
  // Reverts the optimistic update if the server call fails.
  // ============================================================
  const addMutation = useMutation({
    mutationFn: wishlistService.addToWishlist,
    onError: (error: any, productId) => {
      removeItem(productId as unknown as number); // revert optimistic add
      if (error?.statusCode === 409) {
        toast.info('Already in wishlist');
      } else {
        toast.error(error?.message || 'Failed to add to wishlist');
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  // ============================================================
  // REMOVE — optimistic
  // ============================================================
  const removeMutation = useMutation({
    mutationFn: wishlistService.removeFromWishlist,
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to remove from wishlist');
      queryClient.invalidateQueries({ queryKey: ['wishlist'] }); // resync on failure
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: wishlistService.clearWishlist,
    onSuccess: () => {
      clear();
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to clear wishlist');
    },
  });

  // ✅ Wraps the server mutation with an instant local update so the
  // header badge / product cards update in the same tick, instead of
  // waiting on a round-trip + query invalidation.
  const addToWishlist = async (product: Parameters<typeof addItem>[0]) => {
    addItem(product);
    return addMutation.mutateAsync(product.id);
  };

  const removeFromWishlist = async (productId: number) => {
    removeItem(productId);
    return removeMutation.mutateAsync(productId);
  };

  // ✅ Synchronous under the hood now (store lookup) but kept async in
  // signature so existing callers (e.g. ProductCard, ProductDetail)
  // that do `checkInWishlist(id).then(setState)` keep working as-is.
  const checkInWishlist = async (productId: number): Promise<boolean> => {
    if (!isAuthenticated) return false;
    return isInWishlist(productId);
  };

  return {
    wishlist: items,
    total: getTotal(),
    isLoading,
    count: getTotal(),
    addToWishlist,
    addLoading: addMutation.isPending,
    removeFromWishlist,
    removeLoading: removeMutation.isPending,
    clearWishlist: clearMutation.mutateAsync,
    clearLoading: clearMutation.isPending,
    checkInWishlist,
    isInWishlist, // new: synchronous store check, prefer this in new code
  };
}