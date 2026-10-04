'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorService } from '@/services/vendor.service';
import { VendorPayout } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DollarSign,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Search,
  Filter,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminPayoutsPage() {
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePayout, setActivePayout] = useState<VendorPayout | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [transactionRef, setTransactionRef] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Fetch Payouts
  const { data: payouts = [], isLoading } = useQuery<VendorPayout[]>({
    queryKey: ['admin-payouts', selectedStatus],
    queryFn: () =>
      vendorService.getAdminPayouts(selectedStatus === 'all' ? undefined : selectedStatus),
  });

  // Process Mutation
  const processMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { action: 'approve' | 'reject'; transactionReference?: string; adminNotes?: string };
    }) => vendorService.processAdminPayout(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      toast.success(
        actionType === 'approve'
          ? `Payout #${updated.id} approved and recorded!`
          : `Payout #${updated.id} rejected and funds refunded to vendor.`
      );
      setModalOpen(false);
      setActivePayout(null);
      setTransactionRef('');
      setAdminNotes('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to process payout');
    },
  });

  const handleOpenAction = (payout: VendorPayout, type: 'approve' | 'reject') => {
    setActivePayout(payout);
    setActionType(type);
    setTransactionRef('');
    setAdminNotes('');
    setModalOpen(true);
  };

  const handleConfirmAction = () => {
    if (!activePayout) return;
    if (actionType === 'approve' && !transactionRef.trim()) {
      toast.error('Please enter a bank wire or transaction reference');
      return;
    }
    if (actionType === 'reject' && !adminNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    processMutation.mutate({
      id: activePayout.id,
      data: {
        action: actionType,
        transactionReference: transactionRef.trim() || undefined,
        adminNotes: adminNotes.trim() || undefined,
      },
    });
  };

  const filteredPayouts = payouts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const vendorName = (p.vendor?.vendorBusinessName || p.vendor?.name || '').toLowerCase();
    const vendorEmail = (p.vendor?.email || '').toLowerCase();
    return (
      String(p.id).includes(q) ||
      vendorName.includes(q) ||
      vendorEmail.includes(q) ||
      p.transactionReference?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight">Vendor Payouts & Settlements</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review, authorize, and mediate merchant withdrawal requests and escrow settlements
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-3 rounded-2xl border border-border">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Requests' },
            { id: 'pending', label: 'Pending Approval' },
            { id: 'completed', label: 'Completed' },
            { id: 'rejected', label: 'Rejected' },
          ].map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={selectedStatus === tab.id ? 'default' : 'ghost'}
              className="rounded-full text-xs h-8"
              onClick={() => setSelectedStatus(tab.id)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor, payout #..."
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>
      </div>

      {/* Payouts Table */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="text-center py-20 px-4">
              <DollarSign className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-base font-bold">No Payout Requests Found</p>
              <p className="text-xs text-muted-foreground mt-1">
                There are no withdrawal requests matching your current filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[11px] font-semibold">
                  <tr>
                    <th className="py-3.5 px-6">ID</th>
                    <th className="py-3.5 px-6">Vendor / Store</th>
                    <th className="py-3.5 px-6">Amount</th>
                    <th className="py-3.5 px-6">Method</th>
                    <th className="py-3.5 px-6">Destination Details</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Reference</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredPayouts.map((po) => {
                    const vendorName =
                      po.vendor?.vendorBusinessName || po.vendor?.name || `Vendor #${po.vendorId}`;
                    return (
                      <tr key={po.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-4 px-6 font-semibold">#{po.id}</td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-bold text-foreground">{vendorName}</p>
                            <p className="text-muted-foreground text-[11px]">{po.vendor?.email}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-bold text-sm tabular-nums text-foreground">
                          {formatPrice(po.amount)}
                        </td>
                        <td className="py-4 px-6 font-medium">{po.paymentMethod}</td>
                        <td className="py-4 px-6 max-w-xs truncate text-muted-foreground" title={po.accountDetails}>
                          {po.accountDetails}
                        </td>
                        <td className="py-4 px-6">
                          <Badge
                            variant="outline"
                            className={
                              po.status === 'completed'
                                ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                                : po.status === 'approved'
                                ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                                : po.status === 'rejected'
                                ? 'border-red-500 bg-red-500/10 text-red-600'
                                : 'border-amber-500 bg-amber-500/10 text-amber-600'
                            }
                          >
                            {po.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 font-mono text-[11px] text-muted-foreground">
                          {po.transactionReference || '—'}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {po.status === 'pending' ? (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                className="h-7 text-xs rounded-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => handleOpenAction(po, 'approve')}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs rounded-full text-red-600 border-red-500/40 hover:bg-red-50 dark:hover:bg-red-950/20"
                                onClick={() => handleOpenAction(po, 'reject')}
                              >
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">Processed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settlement Authorization Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Authorize Payout #{activePayout?.id}
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Reject Payout #{activePayout?.id}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Merchant:</span>
                <span className="font-semibold text-foreground">
                  {activePayout?.vendor?.vendorBusinessName || activePayout?.vendor?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Requested Amount:</span>
                <span className="font-bold text-foreground">
                  {activePayout ? formatPrice(activePayout.amount) : ''}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Transfer Channel:</span>
                <span>{activePayout?.paymentMethod}</span>
              </div>
            </div>

            {actionType === 'approve' ? (
              <div>
                <Label className="text-xs">Transaction Reference / Bank Confirmation Code *</Label>
                <Input
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. WIRE-892348-CONFIRM"
                  className="mt-1.5"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Enter the confirmation receipt code from your bank or transfer gateway.
                </p>
              </div>
            ) : (
              <div>
                <Label className="text-xs">Rejection Rationale *</Label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Explain why this request is rejected (e.g. incorrect bank details, tax ID mismatch)..."
                  className="w-full mt-1.5 p-3 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                />
                <p className="text-[11px] text-amber-600 mt-1">
                  Rejecting will instantly refund the requested amount back to the vendor&apos;s available balance.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              className={
                actionType === 'approve'
                  ? 'rounded-full bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'rounded-full bg-red-600 hover:bg-red-700 text-white'
              }
              disabled={processMutation.isPending}
            >
              {processMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {actionType === 'approve' ? 'Confirm Settlement' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
