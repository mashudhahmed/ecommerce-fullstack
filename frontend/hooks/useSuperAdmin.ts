// hooks/useSuperAdmin.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ApiResponse, User, AdminStatsExtended, SystemStatus } from '@/types';
import { toast } from 'sonner';

export function useSuperAdmin() {
  const queryClient = useQueryClient();

  // ============================================================
  // STATISTICS
  // ============================================================

  const { data: statistics, isLoading: statisticsLoading } = useQuery({
    queryKey: ['superadmin', 'statistics'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<AdminStatsExtended>>('/superadmin/statistics');
      return data.data;
    },
  });

  const { data: systemStatus, isLoading: systemStatusLoading } = useQuery({
    queryKey: ['superadmin', 'system-status'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<SystemStatus>>('/superadmin/system/status');
      return data.data;
    },
  });

  // ============================================================
  // ADMIN MANAGEMENT
  // ============================================================

  const { data: admins, isLoading: adminsLoading } = useQuery({
    queryKey: ['superadmin', 'admins'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<User[]>>('/superadmin/admins');
      return data.data;
    },
  });

  const createAdmin = useMutation({
    mutationFn: async (adminData: { name: string; email: string; password: string }) => {
      const { data } = await apiClient.post<ApiResponse<User>>('/superadmin/admins', adminData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'admins'] });
      toast.success('Admin created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create admin');
    },
  });

  const deleteAdmin = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/superadmin/admins/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'admins'] });
      toast.success('Admin deleted');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete admin');
    },
  });

  // ============================================================
  // USER MANAGEMENT
  // ============================================================

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['superadmin', 'users'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<User[]>>('/superadmin/users');
      return data.data;
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/superadmin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'users'] });
      toast.success('User deleted');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete user');
    },
  });

  const updateUserStatus = useMutation({
    mutationFn: async ({ id, isVerified }: { id: number; isVerified: boolean }) => {
      const { data } = await apiClient.patch<ApiResponse<User>>(
        `/superadmin/users/${id}/status`,
        { isVerified }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'users'] });
      toast.success('User status updated');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update status');
    },
  });

  const changeUserRole = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const { data } = await apiClient.patch<ApiResponse<User>>(
        `/superadmin/users/${id}/role`,
        { role }
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'users'] });
      toast.success('User role updated');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update role');
    },
  });

  const bulkDeleteUsers = useMutation({
    mutationFn: async (userIds: number[]) => {
      const { data } = await apiClient.post('/superadmin/users/bulk-delete', { userIds });
      return data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'users'] });
      toast.success(data.message || 'Users deleted');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete users');
    },
  });

  // ============================================================
  // VENDOR MANAGEMENT (SuperAdmin specific)
  // ============================================================

  const { data: vendors, isLoading: vendorsLoading } = useQuery({
    queryKey: ['superadmin', 'vendors'],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<User[]>>('/superadmin/vendors');
      return data.data;
    },
  });

  // These use the auth endpoints (or admin endpoints) but we can call them here.
  // We'll just use the same as admin but with superadmin access.
  const approveVendor = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.patch(`/auth/vendors/${id}/approve`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'vendors'] });
      toast.success('Vendor approved');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to approve vendor');
    },
  });

  const rejectVendor = useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
      const { data } = await apiClient.patch(`/auth/vendors/${id}/reject`, { reason });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'vendors'] });
      toast.success('Vendor rejected');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to reject vendor');
    },
  });

  const suspendVendor = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.patch(`/admin/vendors/${id}/suspend`, {
        suspended: true,
        reason: 'Suspended by superadmin',
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'vendors'] });
      toast.success('Vendor suspended');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to suspend vendor');
    },
  });

  const activateVendor = useMutation({
    mutationFn: async (id: number) => {
      const { data } = await apiClient.patch(`/admin/vendors/${id}/suspend`, {
        suspended: false,
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'vendors'] });
      toast.success('Vendor activated');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to activate vendor');
    },
  });

  return {
    // Stats
    statistics,
    statisticsLoading,
    systemStatus,
    systemStatusLoading,

    // Admins
    admins,
    adminsLoading,
    createAdmin: createAdmin.mutateAsync,
    createAdminPending: createAdmin.isPending,
    deleteAdmin: deleteAdmin.mutateAsync,
    deleteAdminPending: deleteAdmin.isPending,

    // Users
    users,
    usersLoading,
    deleteUser: deleteUser.mutateAsync,
    deleteUserPending: deleteUser.isPending,
    updateUserStatus: updateUserStatus.mutateAsync,
    updateUserStatusPending: updateUserStatus.isPending,
    changeUserRole: changeUserRole.mutateAsync,
    changeUserRolePending: changeUserRole.isPending,
    bulkDeleteUsers: bulkDeleteUsers.mutateAsync,
    bulkDeleteUsersPending: bulkDeleteUsers.isPending,

    // Vendors
    vendors,
    vendorsLoading,
    approveVendor: approveVendor.mutateAsync,
    approveVendorPending: approveVendor.isPending,
    rejectVendor: rejectVendor.mutateAsync,
    rejectVendorPending: rejectVendor.isPending,
    suspendVendor: suspendVendor.mutateAsync,
    suspendVendorPending: suspendVendor.isPending,
    activateVendor: activateVendor.mutateAsync,
    activateVendorPending: activateVendor.isPending,
  };
}