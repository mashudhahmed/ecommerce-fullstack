// hooks/useOrders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService, CreateOrderData } from '@/services/order.service';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function useOrders() {
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // ============================================================
  // GET ORDERS - Only fetch if authenticated
  // ============================================================
  const { 
    data: orders = [], 
    isLoading, 
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      // If not authenticated, return empty array
      if (!isAuthenticated) {
        return [];
      }
      
      try {
        const result = await orderService.getOrders();
        if (Array.isArray(result) && result.length > 0) {
          return result;
        }
        return [];
      } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
    },
    enabled: isAuthenticated && !authLoading,
    throwOnError: false,
    initialData: [],
    staleTime: 30 * 1000,
  });

  // ============================================================
  // GET ORDER SUMMARY - Only if authenticated
  // ============================================================
  const { data: orderSummary } = useQuery({
    queryKey: ['orders', 'summary'],
    queryFn: async () => {
      if (!isAuthenticated) {
        return {
          totalOrders: 0,
          totalSpent: 0,
          pendingOrders: 0,
          recentOrders: [],
        };
      }
      
      try {
        const result = await orderService.getOrderSummary();
        return {
          totalOrders: result?.totalOrders || 0,
          totalSpent: result?.totalSpent || 0,
          pendingOrders: result?.pendingOrders || 0,
          recentOrders: result?.recentOrders || [],
        };
      } catch (error) {
        console.error('Error fetching order summary:', error);
        return {
          totalOrders: 0,
          totalSpent: 0,
          pendingOrders: 0,
          recentOrders: [],
        };
      }
    },
    enabled: isAuthenticated && !authLoading,
    throwOnError: false,
    initialData: {
      totalOrders: 0,
      totalSpent: 0,
      pendingOrders: 0,
      recentOrders: [],
    },
  });

  // ============================================================
  // CREATE ORDER
  // ============================================================
  const createOrderMutation = useMutation({
    mutationFn: async (data: CreateOrderData) => {
      if (!isAuthenticated) {
        throw new Error('Please login to create an order');
      }
      
      const idempotencyKey = data.idempotencyKey || 
        (typeof crypto !== 'undefined' && crypto.randomUUID?.()) || 
        `order-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      return orderService.createOrder({ ...data, idempotencyKey });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success(`Order #${data.id} created successfully!`);
    },
    onError: (error: any) => {
      if (error?.statusCode === 429) {
        const retryAfter = error?.retryAfter || 60;
        toast.error(`Too many orders. Please wait ${retryAfter} seconds.`);
        return;
      }
      toast.error(error?.message || 'Failed to create order');
    },
  });

  // ============================================================
  // CANCEL ORDER
  // ============================================================
  const cancelOrderMutation = useMutation({
    mutationFn: orderService.cancelOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'summary'] });
      toast.success('Order cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to cancel order');
    },
  });

  // ============================================================
  // GET ORDER BY ID (lazy)
  // ============================================================
  const getOrder = async (id: number) => {
    if (!isAuthenticated) {
      throw new Error('Please login to view order details');
    }
    return orderService.getOrder(id);
  };

  // ============================================================
  // RETURN
  // ============================================================
  return {
    orders,
    isLoading: isLoading || authLoading,
    isRefetching,
    refetch,
    orderSummary,
    createOrder: createOrderMutation.mutateAsync,
    isCreatingOrder: createOrderMutation.isPending,
    cancelOrder: cancelOrderMutation.mutateAsync,
    isCancellingOrder: cancelOrderMutation.isPending,
    getOrder,
  };
}