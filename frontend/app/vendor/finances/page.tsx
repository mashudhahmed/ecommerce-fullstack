'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorService } from '@/services/vendor.service';
import { VendorWallet, VendorPayout } from '@/types';
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
  Wallet,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  DollarSign,
} from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/utils';
import { toast } from 'sonner';

export default function VendorFinancesPage() {
  const queryClient = useQueryClient();
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  // Form State
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [accountDetails, setAccountDetails] = useState('');

  // Fetch Wallet Overview & Payouts
  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['vendor-wallet'],
    queryFn: () => vendorService.getWallet(),
  });

  const { data: payouts = [], isLoading: payoutsLoading } = useQuery<VendorPayout[]>({
    queryKey: ['vendor-payouts'],
    queryFn: () => vendorService.getPayouts(),
  });

  const wallet = walletData?.wallet;
  const availableBal = Number(wallet?.availableBalance || 0);
  const escrowBal = Number(wallet?.escrowBalance || 0);
  const totalEarned = Number(wallet?.totalEarned || 0);
  const totalWithdrawn = Number(wallet?.totalWithdrawn || 0);

  // Mutation to request payout
  const requestPayoutMutation = useMutation({
    mutationFn: (data: { amount: number; paymentMethod: string; accountDetails: string }) =>
      vendorService.requestPayout(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-wallet'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-payouts'] });
      toast.success('Payout request submitted successfully!');
      setRequestModalOpen(false);
      setAmount('');
      setAccountDetails('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err.message || 'Failed to submit payout request');
    },
  });

  const handleSubmitRequest = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 10) {
      toast.error('Minimum withdrawal amount is $10.00');
      return;
    }
    if (numAmount > availableBal) {
      toast.error(`Insufficient available balance. You can withdraw up to $${availableBal.toFixed(2)}.`);
      return;
    }
    if (!accountDetails.trim()) {
      toast.error('Please provide your bank or payout destination details');
      return;
    }

    requestPayoutMutation.mutate({
      amount: numAmount,
      paymentMethod,
      accountDetails: accountDetails.trim(),
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Finances & Payouts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your escrow balances, net earnings, and withdrawal settlements
          </p>
        </div>

        <Button
          onClick={() => setRequestModalOpen(true)}
          disabled={availableBal < 10}
          className="rounded-full bg-orange-600 hover:bg-orange-700 text-white gap-2 h-11 px-6 shadow-md"
        >
          <ArrowUpRight className="h-4 w-4" /> Request Payout
        </Button>
      </div>

      {/* Metrics Cards */}
      {walletLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Available for Payout */}
          <Card className="border-border/80 shadow-sm bg-gradient-to-br from-card to-emerald-500/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Available for Payout
                </span>
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Wallet className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatPrice(availableBal)}
                </span>
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Ready to withdraw to bank
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Pending Escrow */}
          <Card className="border-border/80 shadow-sm bg-gradient-to-br from-card to-amber-500/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Held in Escrow
                </span>
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                  {formatPrice(escrowBal)}
                </span>
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-amber-600" /> Releases upon package delivery
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Total Earned */}
          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Lifetime Net Earnings
                </span>
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-foreground tabular-nums">
                  {formatPrice(totalEarned)}
                </span>
                <p className="text-xs text-muted-foreground mt-1.5">
                  After 10% platform commission
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Total Withdrawn */}
          <Card className="border-border/80 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Withdrawn
                </span>
                <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Building2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-black text-foreground tabular-nums">
                  {formatPrice(totalWithdrawn)}
                </span>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Settled to your accounts
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payout History Section */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-border/60 py-4 px-6 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Withdrawal History</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              History of your requested payouts and administrative transfers
            </p>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {payoutsLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : payouts.length === 0 ? (
            <div className="text-center py-16 px-4">
              <Wallet className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm font-semibold">No Payout Requests Yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                When you make withdrawals from your available balance, they will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[11px] font-semibold">
                  <tr>
                    <th className="py-3.5 px-6">Payout ID</th>
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-6">Amount</th>
                    <th className="py-3.5 px-6">Method</th>
                    <th className="py-3.5 px-6">Destination</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {payouts.map((po) => (
                    <tr key={po.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-4 px-6 font-semibold">#{po.id}</td>
                      <td className="py-4 px-6 text-muted-foreground">{formatDate(po.createdAt)}</td>
                      <td className="py-4 px-6 font-bold text-sm tabular-nums text-foreground">
                        {formatPrice(po.amount)}
                      </td>
                      <td className="py-4 px-6 font-medium">{po.paymentMethod}</td>
                      <td className="py-4 px-6 text-muted-foreground max-w-xs truncate">
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
                      <td className="py-4 px-6 font-mono text-muted-foreground">
                        {po.transactionReference || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout Request Modal */}
      <Dialog open={requestModalOpen} onOpenChange={setRequestModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-orange-600" />
              Request Fund Withdrawal
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2 text-sm">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex justify-between items-center">
              <span className="text-muted-foreground">Available to Withdraw:</span>
              <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                {formatPrice(availableBal)}
              </span>
            </div>

            <div>
              <Label className="text-xs">Withdrawal Amount ($) *</Label>
              <Input
                type="number"
                step="0.01"
                min="10"
                max={availableBal}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 text-base font-bold"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Minimum withdrawal amount is $10.00
              </p>
            </div>

            <div>
              <Label className="text-xs">Transfer Method</Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full mt-1.5 h-10 px-3 rounded-xl border border-border bg-background text-sm"
              >
                <option value="Bank Transfer">Direct Bank Transfer (ACH / Wire)</option>
                <option value="Stripe Connect">Stripe Connect Direct</option>
                <option value="bKash / Mobile Money">Mobile Financial Service</option>
                <option value="Wise / International">Wise International Wire</option>
              </select>
            </div>

            <div>
              <Label className="text-xs">Beneficiary & Account Details *</Label>
              <textarea
                rows={3}
                value={accountDetails}
                onChange={(e) => setAccountDetails(e.target.value)}
                placeholder="Bank Name, Account Holder Name, Account # / IBAN, Routing / Swift Code"
                className="w-full mt-1.5 p-3 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRequestModalOpen(false)}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRequest}
              className="rounded-full bg-orange-600 hover:bg-orange-700 text-white gap-2"
              disabled={requestPayoutMutation.isPending}
            >
              {requestPayoutMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
