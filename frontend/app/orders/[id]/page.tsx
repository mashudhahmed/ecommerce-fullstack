// app/orders/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { orderService } from '@/services/order.service';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  XCircle,
  Printer,
  Download,
  ShoppingBag,
  MapPin,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  AlertCircle,
  RefreshCw,
  Share2,
} from 'lucide-react';
import { formatPrice, formatDate, formatDateTime, cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
// ORDER STATUS CONFIG
// ============================================================

const STATUS_STEPS = [
  { status: 'pending', label: 'Order Placed', icon: Clock, color: 'bg-yellow-500' },
  { status: 'processing', label: 'Processing', icon: Package, color: 'bg-blue-500' },
  { status: 'shipped', label: 'Shipped', icon: Truck, color: 'bg-purple-500' },
  { status: 'delivered', label: 'Delivered', icon: CheckCircle, color: 'bg-green-500' },
];

const STATUS_COLORS = {
  pending: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
  processing: 'border-blue-500 bg-blue-50 dark:bg-blue-950/20',
  shipped: 'border-purple-500 bg-purple-50 dark:bg-purple-950/20',
  delivered: 'border-green-500 bg-green-50 dark:bg-green-950/20',
  cancelled: 'border-red-500 bg-red-50 dark:bg-red-950/20',
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { cancelOrder, isCancellingOrder } = useOrders();
  const orderId = Number(params.id);

  const [isPrinting, setIsPrinting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // ============================================================
  // FETCH ORDER
  // ============================================================

  const { data: order, isLoading, error, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getOrder(orderId),
    enabled: !isNaN(orderId) && isAuthenticated,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  });

  // ============================================================
  // REDIRECT IF NOT AUTHENTICATED
  // ============================================================

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/orders');
    }
  }, [isAuthenticated, router]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await cancelOrder(orderId);
      toast.success('Order cancelled successfully');
      refetch();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to cancel order');
    }
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 500);
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Order #${orderId}`,
          text: `Check out my order #${orderId}`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      // User cancelled share
    } finally {
      setIsSharing(false);
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success('Order refreshed');
  };

  // ============================================================
  // GET CURRENT STEP INDEX
  // ============================================================

  const getCurrentStep = () => {
    if (!order) return 0;
    if (order.status === 'cancelled') return -1;
    const index = STATUS_STEPS.findIndex((s) => s.status === order.status);
    return index >= 0 ? index : 0;
  };

  const currentStep = getCurrentStep();

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (isLoading) {
    return <OrderDetailSkeleton />;
  }

  // ============================================================
  // ERROR STATE
  // ============================================================

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Order Not Found</h2>
        <p className="text-muted-foreground max-w-md mb-6">
          The order you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => router.push('/orders')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const canCancel = ['pending', 'processing'].includes(order.status);
  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-6 max-w-5xl mx-auto print:max-w-full print:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/orders')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order #{order.id}</h1>
            <p className="text-sm text-muted-foreground">
              Placed on {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            disabled={isPrinting}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            {isPrinting ? 'Printing...' : 'Print'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            disabled={isSharing}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Status & Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
        <Card className="md:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <OrderStatusBadge status={order.status} />
                {isDelivered && (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Delivered
                  </Badge>
                )}
                {isCancelled && (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Cancelled
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canCancel && !isCancelled && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isCancellingOrder}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Order
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{formatPrice(order.total)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Items</p>
              <p className="text-2xl font-bold">{order.items.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Timeline */}
      {!isCancelled && (
        <Card className="print:border-none print:shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-medium">Order Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <div className="absolute left-5 top-0 h-full w-0.5 bg-muted" />
              {STATUS_STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index <= currentStep;
                const isCurrent = index === currentStep;

                return (
                  <div key={step.status} className="relative flex items-start gap-4 pb-8 last:pb-0">
                    <div className={cn(
                      "relative z-10 h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all",
                      isActive ? step.color : "bg-muted border-muted-foreground/20",
                      isCurrent && "ring-4 ring-primary/20"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5",
                        isActive ? "text-white" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "font-medium",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {step.label}
                        </p>
                        {isCurrent && (
                          <Badge variant="default" className="text-xs bg-primary">
                            Current
                          </Badge>
                        )}
                        {isActive && !isCurrent && (
                          <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                      </div>
                      {isCurrent && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {order.status === 'pending' ? 'Your order has been placed and is waiting for processing.' :
                           order.status === 'processing' ? 'Your order is being prepared for shipping.' :
                           order.status === 'shipped' ? 'Your order is on its way!' :
                           'Your order has been delivered. Thank you for shopping with us!'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Order Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-medium">Order Items</CardTitle>
          <span className="text-sm text-muted-foreground">
            {order.items.length} items
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.items.map((item, index) => (
            <div key={item.id} className="flex items-center gap-4 py-3 border-b last:border-0">
              {/* Product Image */}
              <div className="relative h-16 w-16 shrink-0 rounded-lg bg-muted/30 overflow-hidden">
                {item.product.imageUrl ? (
                  <Image
                    src={item.product.imageUrl}
                    alt={item.product.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <Package className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${item.product.id}`}
                  className="font-medium hover:text-primary transition-colors line-clamp-1"
                >
                  {item.product.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  Quantity: {item.quantity} × {formatPrice(item.price)}
                </p>
              </div>

              {/* Subtotal */}
              <div className="text-right shrink-0">
                <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
              </div>
            </div>
          ))}

          {/* Order Summary */}
          <Separator className="my-4" />
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(order.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span>Free</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatPrice(0)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping & Customer Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{order.user?.name || 'Customer'}</p>
            <p className="text-sm text-muted-foreground">{order.user?.email}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {order.shippingAddress || 'No shipping address provided'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{order.user?.email || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Ordered on {formatDate(order.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span>Total: {formatPrice(order.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      <Card className="bg-muted/30 print:hidden">
        <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10">
              <AlertCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Need help with this order?</p>
              <p className="text-sm text-muted-foreground">
                Contact our support team for assistance
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/support">Contact Support</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// SKELETON LOADING STATE
// ============================================================

function OrderDetailSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-20 md:col-span-2" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-96" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}