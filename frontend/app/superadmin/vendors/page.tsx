// app/superadmin/vendors/page.tsx
'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, cn } from '@/lib/utils';
import { Check, X, Loader2, Search, Ban, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
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

// ============================================================
// STATUS PILL — small helper, matches the badge language used
// across the storefront (rounded-full, text-[11px], semantic color)
// ============================================================

function StatusPill({ vendor }: { vendor: Vendor }) {
  if (vendor.isVendorRejected) {
    return (
      <span className="rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
        Rejected
      </span>
    );
  }
  if (vendor.isVendorApproved) {
    return (
      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
        Approved
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
      Pending
    </span>
  );
}

export default function SuperAdminVendorsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // ✅ These hooks must always run in the same order on every render —
  // moved the role guard below all hooks (was previously an early
  // `return` placed before useQuery/useMutation, which breaks React's
  // Rules of Hooks the moment `user` transitions from loading/null to
  // a resolved superadmin role between renders).
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

  // ✅ Role guard, now safely after every hook call. In practice
  // app/superadmin/layout.tsx already redirects non-superadmins away
  // before this page ever mounts — this is just a defensive backstop.
  if (user?.role !== 'superadmin') {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        Access denied
      </div>
    );
  }

  const filteredVendors = vendors?.filter(
    (v: Vendor) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendorBusinessName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Vendor management</h1>
        <p className="text-muted-foreground">Review and manage all vendor applications</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search vendors…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="h-10 rounded-full border-border bg-muted/40 pl-10 focus-visible:border-orange-300"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Business
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Owner
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Contact
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Registered
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVendors?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No vendors found
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors?.map((vendor: Vendor) => (
                <TableRow key={vendor.id} className="hover:bg-muted/30">
                  <TableCell>
                    <p className="font-semibold">{vendor.vendorBusinessName || 'N/A'}</p>
                    <p className="max-w-xs truncate text-sm text-muted-foreground">
                      {vendor.vendorBusinessDescription || ''}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p>{vendor.name}</p>
                    <p className="text-sm text-muted-foreground">{vendor.email}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{vendor.vendorPhoneNumber || 'N/A'}</p>
                    <p className="max-w-xs truncate text-xs text-muted-foreground">
                      {vendor.vendorAddress || ''}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusPill vendor={vendor} />
                    {vendor.isVendorRejected && vendor.vendorRejectionReason && (
                      <p className="mt-1 max-w-40 text-xs text-red-600">
                        {vendor.vendorRejectionReason}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-muted-foreground">
                    {formatDate(vendor.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {!vendor.isVendorApproved && !vendor.isVendorRejected && (
                        <>
                          <Button
                            size="sm"
                            className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800"
                            onClick={() => approveMutation.mutate(vendor.id)}
                            disabled={approveMutation.isPending}
                          >
                            <Check className="mr-1 h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400"
                                onClick={() => {
                                  setSelectedVendor(vendor);
                                  setRejectionReason('');
                                }}
                              >
                                <X className="mr-1 h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-2xl">
                              <DialogHeader>
                                <DialogTitle>Reject vendor application</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 pt-2">
                                <p className="text-sm text-muted-foreground">
                                  Rejecting <strong className="text-foreground">{selectedVendor?.vendorBusinessName}</strong>
                                </p>
                                <Textarea
                                  placeholder="Reason for rejection (optional)"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  className="rounded-xl"
                                />
                                <Button
                                  className="w-full rounded-full bg-red-600 text-white hover:bg-red-700"
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
                                  {rejectMutation.isPending ? 'Rejecting…' : 'Confirm rejection'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                      {vendor.isVendorApproved && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400"
                          onClick={() => suspendMutation.mutate(vendor.id)}
                          disabled={suspendMutation.isPending}
                        >
                          <Ban className="mr-1 h-3.5 w-3.5" />
                          Suspend
                        </Button>
                      )}
                      {vendor.isVendorRejected && (
                        <Button
                          size="sm"
                          className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800"
                          onClick={() => approveMutation.mutate(vendor.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          Reactivate
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}