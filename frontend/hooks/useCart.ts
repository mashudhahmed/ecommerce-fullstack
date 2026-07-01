import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCartStore } from '@/store/cart-store';
import { cartService } from '@/services/cart.service';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useCart() {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { items, addItem, removeItem, updateQuantity, clearCart, getTotalItems, getTotalPrice } =
    useCartStore();

  // ✅ Only fetch cart if authenticated and not loading
  const { data: serverCart, isLoading, refetch } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      try {
        const result = await cartService.getCart();
        return result || [];
      } catch (error) {
        console.error('Error fetching cart:', error);
        return [];
      }
    },
    enabled: isAuthenticated && !authLoading,
    staleTime: 60 * 1000,
    retry: false,
    // ✅ Provide initial data to prevent undefined
    initialData: [],
  });

  const addToCartMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      cartService.addToCart(productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Item added to cart');
    },
    onError: (error: any) => {
      // ✅ Handle auth errors gracefully
      if (error?.statusCode === 401 || error?.statusCode === 403) {
        toast.error('Please login to add items to cart');
        return;
      }
      toast.error(error?.message || 'Failed to add to cart');
    },
  });

  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      cartService.updateQuantity(productId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (error: any) => {
      if (error?.statusCode === 401 || error?.statusCode === 403) {
        toast.error('Please login to update cart');
        return;
      }
      toast.error(error?.message || 'Failed to update quantity');
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: cartService.removeItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Item removed from cart');
    },
    onError: (error: any) => {
      if (error?.statusCode === 401 || error?.statusCode === 403) {
        toast.error('Please login to remove items');
        return;
      }
      toast.error(error?.message || 'Failed to remove item');
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: cartService.clearCart,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('Cart cleared');
    },
    onError: (error: any) => {
      if (error?.statusCode === 401 || error?.statusCode === 403) {
        return;
      }
      toast.error(error?.message || 'Failed to clear cart');
    },
  });

  return {
    items,
    serverCart,
    isLoading: isLoading || authLoading,
    totalItems: getTotalItems(),
    totalPrice: getTotalPrice(),
    refetch,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    addToCart: addToCartMutation.mutateAsync,
    addToCartLoading: addToCartMutation.isPending,
    updateQuantityServer: updateQuantityMutation.mutateAsync,
    removeItemServer: removeItemMutation.mutateAsync,
    clearCartServer: clearCartMutation.mutateAsync,
  };
}