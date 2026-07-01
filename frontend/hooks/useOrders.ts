import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orderService } from '@/services/order.service';
import { toast } from 'sonner';

export function useOrders() {
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      try {
        const result = await orderService.getOrders();
        return result || [];
      } catch (error) {
        console.error('Error fetching orders:', error);
        return [];
      }
    },
    throwOnError: false,
  });

  // ✅ FIXED: Always return an object with default values
  const { data: orderSummary } = useQuery({
    queryKey: ['orders', 'summary'],
    queryFn: async () => {
      try {
        const result = await orderService.getOrderSummary();
        // ✅ Ensure we always return a valid object
        return {
          totalOrders: result?.totalOrders || 0,
          totalSpent: result?.totalSpent || 0,
          pendingOrders: result?.pendingOrders || 0,
          recentOrders: result?.recentOrders || [],
          ...(result || {}),
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
    throwOnError: false,
    // ✅ Provide initial data to prevent undefined
    initialData: {
      totalOrders: 0,
      totalSpent: 0,
      pendingOrders: 0,
      recentOrders: [],
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: orderService.createOrder,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'summary'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success(`Order #${data.id} created successfully!`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create order');
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: orderService.cancelOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'summary'] });
      toast.success('Order cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to cancel order');
    },
  });

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