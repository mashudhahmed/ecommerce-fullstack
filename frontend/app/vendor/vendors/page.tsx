// app/admin/vendors/page.tsx
'use client';

import { useState } from 'react';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { formatDate } from '@/lib/utils';
import { Search, Check, X, Loader2, Ban, CheckCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

interface Vendor {
  id: number;
  name: string;
  email: string;
  vendorBusinessName: string;
  vendorBusinessDescription?: string;
  vendorPhoneNumber?: string;
  vendorAddress?: string;
  isVendorApproved: boolean;
  isVendorRejected: boolean;
  vendorRejectionReason?: string;
  createdAt: string;
}

export default function AdminVendorsPage() {
  const { user } = useAuth();
  const { users, usersLoading, deleteUser } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <div>Access denied</div>;
  }

  // Filter vendors only
  const vendors = users?.filter((u: any) => u.role === 'vendor') || [];

  const filteredVendors = vendors.filter(
    (v: any) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vendorBusinessName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatus = (vendor: any) => {
    if (vendor.isVendorRejected) return { label: 'Rejected', variant: 'destructive' };
    if (vendor.isVendorApproved) return { label: 'Approved', variant: 'default' };
    return { label: 'Pending', variant: 'secondary' };
  };

  const handleApprove = async (vendorId: number) => {
    setLoading(true);
    try {
      // API call to approve vendor
      // await approveVendor(vendorId);
      toast.success('Vendor approved successfully');
    } catch (error) {
      toast.error('Failed to approve vendor');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (vendorId: number) => {
    setLoading(true);
    try {
      // API call to reject vendor
      // await rejectVendor(vendorId, rejectionReason);
      toast.success('Vendor rejected');
      setDialogOpen(false);
      setRejectionReason('');
    } catch (error) {
      toast.error('Failed to reject vendor');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (vendorId: number) => {
    setLoading(true);
    try {
      // API call to suspend vendor
      // await suspendVendor(vendorId);
      toast.success('Vendor suspended');
    } catch (error) {
      toast.error('Failed to suspend vendor');
    } finally {
      setLoading(false);
    }
  };

  if (usersLoading) {
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
            {filteredVendors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No vendors found
                </TableCell>
              </TableRow>
            ) : (
              filteredVendors.map((vendor: any) => {
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
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant as any}>{status.label}</Badge>
                      {vendor.isVendorRejected && vendor.vendorRejectionReason && (
                        <p className="text-xs text-red-500 mt-1">{vendor.vendorRejectionReason}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(vendor.createdAt)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        asChild
                      >
                        <Link href={`/admin/users/${vendor.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      {!vendor.isVendorApproved && !vendor.isVendorRejected && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleApprove(vendor.id)}
                            disabled={loading}
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
                                  onClick={() => handleReject(selectedVendor!.id)}
                                  disabled={loading}
                                >
                                  {loading ? 'Rejecting...' : 'Confirm Rejection'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                      {vendor.isVendorApproved && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleSuspend(vendor.id)}
                          disabled={loading}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Suspend
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