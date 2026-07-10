// hooks/useOrders.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService, CreateOrderData } from '@/services/order.service';
import { toast } from 'sonner';
import { fallbackOrders } from '@/lib/fallback-orders';

// ✅ EXPORTED
export function useOrders() {
  const queryClient = useQueryClient();

  // ============================================================
  // GET ORDERS
  // ============================================================
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        const result = await orderService.getOrders();
        if (Array.isArray(result) && result.length > 0) {
          return result;
        }
        console.log('ℹ️ No orders from API, using fallback data');
        return fallbackOrders;
      } catch (error) {
        console.error('❌ Error fetching orders, using fallback:', error);
        return fallbackOrders;
      }
    },
    throwOnError: false,
    initialData: fallbackOrders,
  });

  // ============================================================
  // GET ORDER SUMMARY
  // ============================================================
  const { data: orderSummary } = useQuery({
    queryKey: ['orders', 'summary'],
    queryFn: async () => {
      try {
        const result = await orderService.getOrderSummary();
        return {
          totalOrders: result?.totalOrders || 0,
          totalSpent: result?.totalSpent || 0,
          pendingOrders: result?.pendingOrders || 0,
          recentOrders: result?.recentOrders || [],
        };
      } catch (error) {
        console.error('❌ Error fetching order summary:', error);
        return {
          totalOrders: 0,
          totalSpent: 0,
          pendingOrders: 0,
          recentOrders: [],
        };
      }
    },
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
      // Generate idempotency key if not provided
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
  // RETURN
  // ============================================================
  return {
    orders,
    isLoading,
    orderSummary,
    createOrder: createOrderMutation.mutateAsync,
    isCreatingOrder: createOrderMutation.isPending,
    cancelOrder: cancelOrderMutation.mutateAsync,
    isCancellingOrder: cancelOrderMutation.isPending,
    getOrder: orderService.getOrder,
  };
}