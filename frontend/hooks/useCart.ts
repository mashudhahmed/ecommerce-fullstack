// hooks/useCart.ts
import { useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '@/store/cart-store';
import { cartService } from '@/services/cart.service';
import { productService } from '@/services/product.service';
import { useAuth } from './useAuth';
import { Product } from '@/types';
import { toast } from 'sonner';

export function useCart() {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    items,
    isSynced,
    addItem: storeAddItem,
    removeItem: storeRemoveItem,
    updateQuantity: storeUpdateQuantity,
    clearCart: storeClearCart,
    getTotalItems,
    getTotalPrice,
    syncWithServer,
    resetSync,
  } = useCartStore();

  const isMergingRef = useRef(false);

  // ============================================================
  // SERVER QUERY
  // ============================================================
  const {
    data: serverCart = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      try {
        const result = await cartService.getCart();
        return Array.isArray(result) ? result : [];
      } catch (error) {
        console.error('Error fetching cart:', error);
        return [];
      }
    },
    enabled: isAuthenticated && !authLoading,
    staleTime: 60 * 1000,
    retry: false,
    initialData: [],
  });

  // ============================================================
  // GUEST CART MERGE ON LOGIN
  // When user logs in with guest items, merge them to the server
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
      const guestItems = items.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      cartService
        .mergeCart(guestItems)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['cart'] });
        })
        .catch((error) => {
          console.error('Failed to merge guest cart on login:', error);
        })
        .finally(() => {
          isMergingRef.current = false;
        });
    }
  }, [isAuthenticated, authLoading, isSynced, items, queryClient]);

  // ============================================================
  // SERVER SYNC
  // When authenticated, sync serverCart into local store
  // ============================================================
  useEffect(() => {
    if (isAuthenticated && !authLoading && Array.isArray(serverCart)) {
      syncWithServer(serverCart);
    }
  }, [isAuthenticated, authLoading, serverCart, syncWithServer]);

  // ============================================================
  // LOGOUT CLEANUP
  // Clear local store on logout so next user doesn't see old items
  // ============================================================
  useEffect(() => {
    if (!isAuthenticated && !authLoading && isSynced) {
      storeClearCart();
      resetSync();
    }
  }, [isAuthenticated, authLoading, isSynced, storeClearCart, resetSync]);

  // ============================================================
  // MUTATIONS (Server Persistence)
  // ============================================================
  const addToCartMutation = useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: number;
      quantity: number;
    }) => cartService.addToCart(productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({
      productId,
      quantity,
    }: {
      productId: number;
      quantity: number;
    }) => cartService.updateQuantity(productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (productId: number) => cartService.removeItem(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: () => cartService.clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // ============================================================
  // UNIFIED ACTIONS (Optimistic + Guest/Auth Adaptive)
  // ============================================================

  const addToCart = useCallback(
    async (
      params:
        | { productId: number; quantity?: number; product?: Product }
        | number,
      explicitQty: number = 1
    ) => {
      const productId = typeof params === 'number' ? params : params.productId;
      const quantity =
        typeof params === 'number' ? explicitQty : params.quantity || 1;
      let product = typeof params === 'object' ? params.product : undefined;

      // 1. If guest user:
      if (!isAuthenticated) {
        if (!product) {
          try {
            product = (await productService.getProduct(productId)) || undefined;
          } catch {
            // ignore
          }
        }
        if (product) {
          try {
            storeAddItem(product, quantity);
            toast.success(`${product.title} added to cart`);
          } catch (err: any) {
            toast.error(err?.message || 'Failed to add item to cart');
          }
        } else {
          toast.error('Product not found');
        }
        return;
      }

      // 2. If authenticated user:
      if (product) {
        storeAddItem(product, quantity);
      }
      try {
        await addToCartMutation.mutateAsync({ productId, quantity });
        const title = product?.title || 'Item';
        toast.success(`${title} added to cart`);
      } catch (error: any) {
        if (product) {
          storeRemoveItem(productId);
        }
        toast.error(error?.message || 'Failed to add item to cart');
        throw error;
      }
    },
    [isAuthenticated, storeAddItem, storeRemoveItem, addToCartMutation]
  );

  const updateQuantity = useCallback(
    async (productId: number, quantity: number) => {
      storeUpdateQuantity(productId, quantity);
      if (isAuthenticated) {
        try {
          await updateQuantityMutation.mutateAsync({ productId, quantity });
        } catch (error: any) {
          if (error?.statusCode === 404 || error?.response?.status === 404) {
            try {
              await addToCartMutation.mutateAsync({ productId, quantity });
              return;
            } catch {
              // fallback to query invalidation
            }
          }
          queryClient.invalidateQueries({ queryKey: ['cart'] });
          toast.error(error?.message || 'Failed to update quantity');
        }
      }
    },
    [isAuthenticated, storeUpdateQuantity, updateQuantityMutation, addToCartMutation, queryClient]
  );

  const removeItem = useCallback(
    async (productId: number) => {
      storeRemoveItem(productId);
      toast.success('Item removed from cart');
      if (isAuthenticated) {
        try {
          await removeItemMutation.mutateAsync(productId);
        } catch (error: any) {
          if (error?.statusCode !== 404 && error?.response?.status !== 404) {
            queryClient.invalidateQueries({ queryKey: ['cart'] });
            toast.error(error?.message || 'Failed to remove item');
          }
        }
      }
    },
    [isAuthenticated, storeRemoveItem, removeItemMutation, queryClient]
  );

  const clearCart = useCallback(async (options?: { silent?: boolean }) => {
    storeClearCart();
    if (!options?.silent) {
      toast.success('Cart cleared');
    }
    if (isAuthenticated) {
      try {
        await clearCartMutation.mutateAsync();
      } catch (error: any) {
        if (error?.statusCode !== 404 && error?.response?.status !== 404) {
          queryClient.invalidateQueries({ queryKey: ['cart'] });
          if (!options?.silent) {
            toast.error(error?.message || 'Failed to clear cart');
          }
        }
      }
    }
  }, [isAuthenticated, storeClearCart, clearCartMutation, queryClient]);

  return {
    items,
    serverCart,
    isLoading: isLoading || authLoading,
    totalItems: getTotalItems(),
    totalPrice: getTotalPrice(),
    refetch,
    addToCart,
    addToCartLoading: addToCartMutation.isPending,
    updateQuantity,
    removeItem,
    clearCart,
    // Aliases for backwards compatibility:
    addItem: storeAddItem,
    updateQuantityServer: updateQuantityMutation.mutateAsync,
    removeItemServer: removeItemMutation.mutateAsync,
    clearCartServer: clearCartMutation.mutateAsync,
  };
}