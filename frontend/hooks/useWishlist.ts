// hooks/useWishlist.ts
import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wishlistService } from '@/services/wishlist.service';
import { useWishlistStore } from '@/store/wishlist-store';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useWishlist() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const {
    items,
    isSynced,
    addItem,
    removeItem,
    clear,
    isInWishlist,
    getTotal,
    syncWithServer,
    resetSync,
  } = useWishlistStore();

  const isMergingRef = useRef(false);

  // ============================================================
  // SERVER FETCH — source of truth for persistence for logged-in users.
  // ============================================================
  const { data: serverWishlist, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistService.getWishlist(),
    enabled: isAuthenticated && !authLoading,
    staleTime: 60 * 1000,
  });

  // ============================================================
  // GUEST WISHLIST MERGE ON LOGIN
  // When a guest logs in with saved wishlist items, merge them to server
  // ============================================================
  useEffect(() => {
    if (
      isAuthenticated &&
      !authLoading &&
      !isSynced &&
      items.length > 0 &&
      !isMergingRef.current
    ) {
      isMergingRef.current = true;
      const guestProductIds = items.map((item) => item.id);

      wishlistService
        .mergeWishlist(guestProductIds)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['wishlist'] });
        })
        .catch((error) => {
          console.error('Failed to merge guest wishlist on login:', error);
        })
        .finally(() => {
          isMergingRef.current = false;
        });
    }
  }, [isAuthenticated, authLoading, isSynced, items, queryClient]);

  // ============================================================
  // SERVER SYNC
  // When authenticated, sync server wishlist items into local store
  // ============================================================
  useEffect(() => {
    if (isAuthenticated && !authLoading && serverWishlist?.data) {
      syncWithServer(serverWishlist.data);
    }
  }, [isAuthenticated, authLoading, serverWishlist, syncWithServer]);

  // ============================================================
  // LOGOUT CLEANUP
  // Clear local store only on logout from a synced authenticated session
  // ============================================================
  useEffect(() => {
    if (!isAuthenticated && !authLoading && isSynced) {
      clear();
      resetSync();
    }
  }, [isAuthenticated, authLoading, isSynced, clear, resetSync]);

  // ============================================================
  // ADD MUTATION (authenticated only)
  // ============================================================
  const addMutation = useMutation({
    mutationFn: wishlistService.addToWishlist,
    onError: (error: any, productId) => {
      const status = error?.response?.status || error?.statusCode;
      if (status === 409) {
        // Already in wishlist on server; keep in local store
        return;
      }
      removeItem(productId as unknown as number); // revert optimistic add on real error
      toast.error(error?.message || 'Failed to add to wishlist');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  // ============================================================
  // REMOVE MUTATION (authenticated only)
  // ============================================================
  const removeMutation = useMutation({
    mutationFn: wishlistService.removeFromWishlist,
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to remove from wishlist');
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  // ============================================================
  // CLEAR MUTATION (authenticated only)
  // ============================================================
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

  // ============================================================
  // PUBLIC ACTIONS (work seamlessly for both guests and auth users)
  // ============================================================
  const addToWishlist = async (product: Parameters<typeof addItem>[0]) => {
    addItem(product);
    if (isAuthenticated) {
      return addMutation.mutateAsync(product.id);
    }
  };

  const removeFromWishlist = async (productId: number) => {
    removeItem(productId);
    if (isAuthenticated) {
      return removeMutation.mutateAsync(productId);
    }
  };

  const clearWishlist = async () => {
    clear();
    if (isAuthenticated) {
      return clearMutation.mutateAsync();
    }
  };

  const checkInWishlist = async (productId: number): Promise<boolean> => {
    return isInWishlist(productId);
  };

  return {
    wishlist: items,
    total: getTotal(),
    isLoading: isAuthenticated ? isLoading : false,
    count: getTotal(),
    addToWishlist,
    addLoading: addMutation.isPending,
    removeFromWishlist,
    removeLoading: removeMutation.isPending,
    clearWishlist,
    clearLoading: clearMutation.isPending,
    checkInWishlist,
    isInWishlist,
  };
}