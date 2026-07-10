// app/superadmin/vendors/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';
import { Check, X, Loader2, Search, Ban, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';

interface Vendor {
  id: number;
  name: string;
  email: string;
  vendorBusinessName: string;
  vendorBusinessDescription?: string;
  vendorPhoneNumber?: string;
  vendorAddress?: string;
  vendorBusinessRegistration?: string;
  isVendorApproved: boolean;
  isVendorRejected: boolean;
  vendorRejectionReason?: string;
  createdAt: string;
}

export default function SuperAdminVendorsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Redirect if not superadmin
  if (user?.role !== 'superadmin') {
    return <div>Access Denied</div>;
  }

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['superadmin', 'vendors'],
    queryFn: async () => {
      const { data } = await apiClient.get('/superadmin/vendors');
      return data.data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (vendorId: number) => {
      const { data } = await apiClient.patch(`/auth/vendors/${vendorId}/approve`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'vendors'] });
      toast.success('Vendor approved successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to approve vendor');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ vendorId, reason }: { vendorId: number; reason: string }) => {
      const { data } = await apiClient.patch(`/auth/vendors/${vendorId}/reject`, { reason });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'vendors'] });
      setDialogOpen(false);
      setRejectionReason('');
      toast.success('Vendor rejected');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to reject vendor');
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (vendorId: number) => {
      const { data } = await apiClient.patch(`/admin/vendors/${vendorId}/suspend`, {
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

  const activateMutation = useMutation({
    mutationFn: async (vendorId: number) => {
      const { data } = await apiClient.patch(`/admin/vendors/${vendorId}/suspend`, {
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

  const filteredVendors = vendors?.filter(
    (v: Vendor) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendorBusinessName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatus = (vendor: Vendor) => {
    if (vendor.isVendorRejected) return { label: 'Rejected', variant: 'destructive' };
    if (vendor.isVendorApproved) return { label: 'Approved', variant: 'default' };
    return { label: 'Pending', variant: 'secondary' };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendor Management</h1>
          <p className="text-muted-foreground">Manage all vendor applications</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No vendors found
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors?.map((vendor: Vendor) => {
                const status = getStatus(vendor);
                return (
                  <TableRow key={vendor.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{vendor.vendorBusinessName || 'N/A'}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">
                          {vendor.vendorBusinessDescription || ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p>{vendor.name}</p>
                        <p className="text-sm text-muted-foreground">{vendor.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{vendor.vendorPhoneNumber || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {vendor.vendorAddress || ''}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant as any}>{status.label}</Badge>
                      {vendor.isVendorRejected && vendor.vendorRejectionReason && (
                        <p className="text-xs text-red-500 mt-1">{vendor.vendorRejectionReason}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(vendor.createdAt)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {!vendor.isVendorApproved && !vendor.isVendorRejected && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate(vendor.id)}
                            disabled={approveMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedVendor(vendor);
                                  setRejectionReason('');
                                }}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reject Vendor Application</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 pt-4">
                                <p>
                                  Rejecting <strong>{selectedVendor?.vendorBusinessName}</strong>
                                </p>
                                <Textarea
                                  placeholder="Reason for rejection (optional)"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                />
                                <Button
                                  variant="destructive"
                                  className="w-full"
                                  onClick={() => {
                                    if (selectedVendor) {
                                      rejectMutation.mutate({
                                        vendorId: selectedVendor.id,
                                        reason: rejectionReason || 'No reason provided',
                                      });
                                    }
                                  }}
                                  disabled={rejectMutation.isPending}
                                >
                                  {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                      {vendor.isVendorApproved && (
                        <>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => suspendMutation.mutate(vendor.id)}
                            disabled={suspendMutation.isPending}
                          >
                            <Ban className="h-4 w-4 mr-1" />
                            Suspend
                          </Button>
                        </>
                      )}
                      {vendor.isVendorRejected && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => approveMutation.mutate(vendor.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Reactivate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}