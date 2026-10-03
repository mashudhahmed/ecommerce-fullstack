'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { returnService } from '@/services/return.service';
import { ReturnRequest, ReturnStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Search,
  Filter,
  AlertCircle,
  ArrowRight,
  User,
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

export default function VendorReturnsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // Rejection Modal State
  const [rejectingReturn, setRejectingReturn] = useState<ReturnRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Queries
  const { data: returnsData, isLoading } = useQuery({
    queryKey: ['vendor-returns', page],
    queryFn: () => returnService.getVendorReturns(page, 20),
  });

  const rawReturns: ReturnRequest[] =
    (returnsData as any)?.items || (returnsData as any)?.data || (Array.isArray(returnsData) ? returnsData : []);

  // Approve Mutation
  const approveMutation = useMutation({
    mutationFn: (id: number) =>
      returnService.processVendorReturn(id, {
        action: 'approve',
        adminNotes: 'Seller approved return and refund.',
      }),
    onSuccess: () => {
      toast.success('Return approved! Product stock restored and refund recorded.');
      queryClient.invalidateQueries({ queryKey: ['vendor-returns'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-wallet'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to approve return');
    },
  });

  // Reject Mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      returnService.processVendorReturn(id, {
        action: 'reject',
        rejectionReason: reason,
      }),
    onSuccess: () => {
      toast.success('Return request declined.');
      setRejectingReturn(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['vendor-returns'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reject return');
    },
  });

  const filteredReturns = rawReturns.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchPkg = String(r.vendorOrderId || '').includes(q);
      const matchOrder = String(r.orderId || '').includes(q);
      const matchDesc = r.description?.toLowerCase().includes(q);
      return matchPkg || matchOrder || matchDesc;
    }
    return true;
  });

  const pendingCount = rawReturns.filter((r) => r.status === 'pending').length;
  const refundedCount = rawReturns.filter((r) => r.status === 'refunded' || r.status === 'approved').length;
  const rejectedCount = rawReturns.filter((r) => r.status === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Returns & Refunds</h1>
        <p className="text-muted-foreground mt-1">
          Review customer return requests for your packages, inspect issues, and authorize refunds.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting your approval or decision</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Refunded & Closed</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{refundedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Authorized returns restocked to inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Declined</CardTitle>
            <XCircle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Outside return policy or declined</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by package # or issue..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {['all', 'pending', 'refunded', 'rejected'].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(st)}
              className="capitalize h-8 text-xs"
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      {/* Returns List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading returns...</div>
        ) : filteredReturns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <RotateCcw className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
              <h3 className="font-semibold text-base">No return requests found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                {statusFilter !== 'all'
                  ? `No returns currently have status "${statusFilter}".`
                  : 'Great job! Customers have not filed any pending returns on your orders.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredReturns.map((ret) => (
            <Card key={ret.id} className="overflow-hidden border-border/70 shadow-sm">
              <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b bg-muted/20">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">Return #{ret.id}</span>
                    <Badge
                      variant={
                        ret.status === 'refunded' || ret.status === 'approved'
                          ? 'default'
                          : ret.status === 'rejected'
                          ? 'destructive'
                          : 'outline'
                      }
                      className="capitalize"
                    >
                      {ret.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                    <span>Order #{ret.orderId}</span>
                    <span>•</span>
                    <span>Package #{ret.vendorOrderId}</span>
                    <span>•</span>
                    <span>Filed on {formatDate(ret.createdAt)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Requested Refund</div>
                  <div className="text-xl font-bold text-foreground">
                    {formatPrice(ret.refundAmount || 0)}
                  </div>
                </div>
              </div>

              <CardContent className="p-5 space-y-4">
                {/* Reason & Description */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-muted/40 p-4 rounded-xl">
                  <div>
                    <span className="text-xs text-muted-foreground uppercase font-semibold block mb-0.5">
                      Return Reason
                    </span>
                    <span className="font-medium capitalize text-orange-600 dark:text-orange-400">
                      {ret.reason.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-xs text-muted-foreground uppercase font-semibold block mb-0.5">
                      Customer Description
                    </span>
                    <p className="text-foreground text-xs leading-relaxed">
                      &ldquo;{ret.description}&rdquo;
                    </p>
                  </div>
                </div>

                {/* Returned Items */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Items to Restock:
                  </span>
                  <div className="divide-y border rounded-lg overflow-hidden bg-background">
                    {(ret.items || []).map((item, i) => (
                      <div key={i} className="p-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{item.productName}</span>
                        </div>
                        <div className="text-right text-xs">
                          <span className="text-muted-foreground">Qty: {item.quantity} × </span>
                          <span className="font-semibold">{formatPrice(item.price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audit trail */}
                {ret.rejectionReason && (
                  <div className="text-xs rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-red-700 dark:text-red-400">
                    <strong>Rejection Reason: </strong>
                    {ret.rejectionReason}
                  </div>
                )}
                {ret.refundTransactionId && (
                  <div className="text-xs rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-emerald-700 dark:text-emerald-400">
                    <strong>Refund Ref: </strong>
                    {ret.refundTransactionId}
                  </div>
                )}

                {/* Actions for Pending */}
                {ret.status === 'pending' && (
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setRejectingReturn(ret);
                        setRejectionReason('');
                      }}
                      className="text-rose-600 border-rose-500/30 hover:bg-rose-50"
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      Decline Return
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate(ret.id)}
                      disabled={approveMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      {approveMutation.isPending ? 'Processing...' : 'Approve & Refund'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Reject Modal */}
      <Dialog open={!!rejectingReturn} onOpenChange={(open) => !open && setRejectingReturn(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Decline Return Request #{rejectingReturn?.id}</DialogTitle>
            <DialogDescription>
              Please provide a clear reason to the customer explaining why this return request cannot be honored.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground block mb-1.5">
              Reason for Declining
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Return window expired, item damaged by customer, missing parts..."
              rows={3}
              className="w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingReturn(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
              onClick={() => {
                if (rejectingReturn) {
                  rejectMutation.mutate({ id: rejectingReturn.id, reason: rejectionReason });
                }
              }}
            >
              {rejectMutation.isPending ? 'Declining...' : 'Confirm Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
