'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { orderService } from '@/services/order.service';
import { VendorOrder } from '@/types';
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
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Printer,
  MapPin,
  DollarSign,
  AlertCircle,
  Loader2,
  Search,
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function VendorOrdersPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubOrder, setSelectedSubOrder] = useState<VendorOrder | null>(null);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [packingSlipOrder, setPackingSlipOrder] = useState<VendorOrder | null>(null);

  // Dispatch Form State
  const [carrierName, setCarrierName] = useState('FedEx');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [notes, setNotes] = useState('');

  // Fetch Vendor Sub-Orders
  const { data: subOrdersData, isLoading } = useQuery({
    queryKey: ['vendor-sub-orders', activeTab],
    queryFn: () =>
      orderService.getVendorSubOrders({
        page: 1,
        limit: 50,
        status: activeTab === 'all' ? undefined : activeTab,
      }),
  });

  const subOrders: VendorOrder[] = subOrdersData?.data || [];

  // Mutation to update sub-order status / dispatch
  const updateStatusMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        status: string;
        carrierName?: string;
        trackingNumber?: string;
        trackingUrl?: string;
        notes?: string;
      };
    }) => orderService.updateVendorSubOrderStatus(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-sub-orders'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-wallet'] });
      toast.success(`Package #${updated.id} status updated to ${updated.status}`);
      setDispatchModalOpen(false);
      setSelectedSubOrder(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to update order');
    },
  });

  const handleOpenDispatch = (so: VendorOrder) => {
    setSelectedSubOrder(so);
    setCarrierName(so.carrierName || 'FedEx');
    setTrackingNumber(so.trackingNumber || '');
    setTrackingUrl(so.trackingUrl || '');
    setNotes(so.notes || '');
    setDispatchModalOpen(true);
  };

  const handleConfirmDispatch = () => {
    if (!selectedSubOrder) return;
    if (!trackingNumber.trim()) {
      toast.error('Please enter a tracking number');
      return;
    }

    updateStatusMutation.mutate({
      id: selectedSubOrder.id,
      data: {
        status: 'shipped',
        carrierName,
        trackingNumber: trackingNumber.trim(),
        trackingUrl: trackingUrl.trim() || undefined,
        notes: notes.trim() || undefined,
      },
    });
  };

  const handleMarkDelivered = (so: VendorOrder) => {
    if (!confirm(`Confirm delivery for Package #${so.id}? This will release funds from escrow to your available balance.`)) {
      return;
    }

    updateStatusMutation.mutate({
      id: so.id,
      data: {
        status: 'delivered',
        carrierName: so.carrierName,
        trackingNumber: so.trackingNumber,
      },
    });
  };

  const handlePrintPackingSlip = (so: VendorOrder) => {
    setPackingSlipOrder(so);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const filteredOrders = subOrders.filter((so) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      String(so.id).includes(q) ||
      String(so.orderId).includes(q) ||
      so.trackingNumber?.toLowerCase().includes(q) ||
      so.order?.shippingAddress?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Order Fulfillment</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage, dispatch, and track your marketplace packages and customer shipments
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-3 rounded-2xl border border-border">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All Orders' },
            { id: 'pending', label: 'Pending' },
            { id: 'processing', label: 'Processing' },
            { id: 'shipped', label: 'Shipped' },
            { id: 'delivered', label: 'Delivered' },
          ].map((tab) => (
            <Button
              key={tab.id}
              size="sm"
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              className="rounded-full text-xs h-8"
              onClick={() => setActiveTab(tab.id)}
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
            placeholder="Search package #, tracking..."
            className="pl-9 h-9 text-xs rounded-xl"
          />
        </div>
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-3xl border border-border/60">
          <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="text-lg font-bold">No Packages Found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            There are currently no orders under the &quot;{activeTab}&quot; filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((so) => (
            <Card key={so.id} className="overflow-hidden border-border/80 shadow-sm">
              {/* Header */}
              <div className="bg-muted/30 border-b border-border/60 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-foreground">
                    Package #{so.id}
                  </span>
                  <span className="text-muted-foreground">
                    (Master Order #{so.orderId})
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{formatDate(so.createdAt)}</span>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      so.status === 'delivered'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                        : so.status === 'shipped'
                        ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                        : so.status === 'processing'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-600'
                        : 'border-zinc-400 bg-zinc-500/10 text-zinc-600'
                    }
                  >
                    {so.status.toUpperCase()}
                  </Badge>

                  <Badge
                    variant="secondary"
                    className="text-[10px] font-medium"
                  >
                    {so.payoutStatus === 'escrow'
                      ? 'Funds in Escrow'
                      : so.payoutStatus === 'ready'
                      ? 'Available in Balance'
                      : 'Settled'}
                  </Badge>
                </div>
              </div>

              {/* Body */}
              <CardContent className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Items Column */}
                  <div className="lg:col-span-2 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Package Items ({(so.items || []).length})
                    </p>

                    <div className="space-y-3">
                      {(so.items || []).map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center gap-3.5 py-2 border-b last:border-0"
                        >
                          <div className="relative h-12 w-12 rounded-lg bg-muted/40 shrink-0 overflow-hidden border">
                            {it.product?.imageUrl ? (
                              <Image
                                src={it.product.imageUrl}
                                alt={it.product.title || 'Product'}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <Package className="h-5 w-5 m-auto text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {it.product?.title || 'Product Item'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {it.quantity} × {formatPrice(it.price)}
                            </p>
                          </div>
                          <p className="font-bold text-sm tabular-nums">
                            {formatPrice(it.price * it.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Tracking details banner if shipped */}
                    {so.trackingNumber && (
                      <div className="mt-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between text-xs flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-blue-600" />
                          <span>
                            Courier: <strong>{so.carrierName || 'Express'}</strong> • Tracking:{' '}
                            <code className="font-mono font-bold text-foreground">{so.trackingNumber}</code>
                          </span>
                        </div>
                        {so.trackingUrl && (
                          <a
                            href={so.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
                          >
                            Track <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Financials & Action Column */}
                  <div className="space-y-4 lg:border-l lg:pl-6 border-border/60 flex flex-col justify-between">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Financial Settlement
                      </p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">{formatPrice(so.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-red-500">
                          <span>Platform Fee ({so.commissionRate}%)</span>
                          <span>-{formatPrice(so.commissionAmount)}</span>
                        </div>
                        <div className="border-t pt-1.5 flex justify-between font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          <span>Your Net Earnings</span>
                          <span>{formatPrice(so.vendorEarnings)}</span>
                        </div>
                      </div>

                      {/* Customer Address */}
                      <div className="mt-4 pt-3 border-t text-xs space-y-1 text-muted-foreground">
                        <div className="flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-orange-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">
                            {so.order?.shippingAddress || 'Standard Delivery Address'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {so.status === 'pending' && (
                        <Button
                          size="sm"
                          className="w-full text-xs h-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() =>
                            updateStatusMutation.mutate({
                              id: so.id,
                              data: { status: 'processing' },
                            })
                          }
                          disabled={updateStatusMutation.isPending}
                        >
                          Confirm & Prepare
                        </Button>
                      )}

                      {(so.status === 'pending' || so.status === 'processing') && (
                        <Button
                          size="sm"
                          className="w-full text-xs h-9 rounded-full bg-orange-600 hover:bg-orange-700 text-white gap-1.5"
                          onClick={() => handleOpenDispatch(so)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Truck className="h-3.5 w-3.5" /> Dispatch Package
                        </Button>
                      )}

                      {so.status === 'shipped' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs h-9 rounded-full border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 gap-1.5"
                          onClick={() => handleMarkDelivered(so)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Delivery
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-xs h-8 rounded-full text-muted-foreground gap-1.5"
                        onClick={() => handlePrintPackingSlip(so)}
                      >
                        <Printer className="h-3.5 w-3.5" /> Print Packing Slip
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dispatch Modal */}
      <Dialog open={dispatchModalOpen} onOpenChange={setDispatchModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-orange-600" />
              Dispatch Package #{selectedSubOrder?.id}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div>
              <Label className="text-xs">Courier / Carrier</Label>
              <select
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                className="w-full mt-1.5 h-10 px-3 rounded-xl border border-border bg-background text-sm"
              >
                <option value="FedEx">FedEx</option>
                <option value="DHL Express">DHL Express</option>
                <option value="UPS">UPS</option>
                <option value="USPS">USPS</option>
                <option value="BlueDart">BlueDart</option>
                <option value="Seller Direct Fleet">Seller Direct Fleet</option>
              </select>
            </div>

            <div>
              <Label className="text-xs">Tracking Number / Waybill *</Label>
              <Input
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. FX-983248239"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-xs">Live Tracking URL (Optional)</Label>
              <Input
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://carrier.com/track/..."
                className="mt-1.5"
              />
            </div>

            <div>
              <Label className="text-xs">Fulfillment Notes</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dispatched via local hub"
                className="mt-1.5"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDispatchModalOpen(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDispatch}
              className="rounded-full bg-orange-600 hover:bg-orange-700 text-white gap-2"
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Confirm Dispatch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}