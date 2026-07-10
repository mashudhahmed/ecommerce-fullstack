// hooks/useVendor.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorService } from '@/services/vendor.service';
import { toast } from 'sonner';

export function useVendor() {
  const queryClient = useQueryClient();

  // Dashboard
  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['vendor', 'dashboard'],
    queryFn: vendorService.getDashboard,
  });

  const { data: performance, isLoading: performanceLoading } = useQuery({
    queryKey: ['vendor', 'performance'],
    queryFn: () => vendorService.getPerformance('month'),
  });

  // Products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['vendor', 'products'],
    queryFn: () => vendorService.getProducts(1, 20),
  });

  // Orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['vendor', 'orders'],
    queryFn: () => vendorService.getOrders(),
  });

  // Mutations
  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) =>
      vendorService.updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', 'dashboard'] });
      toast.success('Order status updated');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update order status');
    },
  });

  const bulkUploadMutation = useMutation({
    mutationFn: vendorService.bulkUploadProducts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'products'] });
      toast.success('Products uploaded successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to upload products');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: vendorService.bulkDeleteProducts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'products'] });
      toast.success('Products deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete products');
    },
  });

  return {
    dashboard,
    dashboardLoading,
    performance,
    performanceLoading,
    productsData,
    productsLoading,
    ordersData,
    ordersLoading,
    updateOrderStatus: updateOrderStatusMutation.mutateAsync,
    updateOrderStatusLoading: updateOrderStatusMutation.isPending,
    bulkUploadProducts: bulkUploadMutation.mutateAsync,
    bulkUploadLoading: bulkUploadMutation.isPending,
    bulkDeleteProducts: bulkDeleteMutation.mutateAsync,
    bulkDeleteLoading: bulkDeleteMutation.isPending,
    refetchDashboard,
  };
}