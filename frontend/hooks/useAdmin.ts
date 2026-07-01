import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '@/services/admin.service';
import { toast } from 'sonner';

export function useAdmin() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: adminService.getStats,
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adminService.getAllUsers,
  });

  const { data: allOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: adminService.getAllOrders,
  });

  const { data: allProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['admin', 'products'],
    queryFn: adminService.getAllProducts,
  });

  const deleteUserMutation = useMutation({
    mutationFn: adminService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('User deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete user');
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      adminService.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      toast.success('Order status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update order status');
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: adminService.createAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      toast.success('Admin created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create admin');
    },
  });

  return {
    stats,
    statsLoading,
    users,
    usersLoading,
    allOrders,
    ordersLoading,
    allProducts,
    productsLoading,
    deleteUser: deleteUserMutation.mutateAsync,
    updateOrderStatus: updateOrderStatusMutation.mutateAsync,
    createAdmin: createAdminMutation.mutateAsync,
  };
}