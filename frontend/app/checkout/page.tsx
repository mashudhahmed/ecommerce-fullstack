// app/checkout/page.tsx
'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useCart } from '@/hooks/useCart';
import { useOrders } from '@/hooks/useOrders';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { formatPrice, cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import {
  ArrowLeft,
  ShoppingBag,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  LayoutDashboard,
  MapPin,
  Store,
  Truck,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

function CheckoutItemRow({ item }: { item: any }) {
  const [imageError, setImageError] = useState(false);
  const imageSrc = useMemo(() => {
    if (!item?.product?.imageUrl || imageError) {
      return '/placeholder-image.png';
    }
    return item.product.imageUrl;
  }, [item?.product?.imageUrl, imageError]);

  if (!item?.product) return null;

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted/20">
          <Image
            src={imageSrc}
            alt={item.product.title || 'Product'}
            fill
            className="object-cover"
            sizes="56px"
            onError={() => setImageError(true)}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{item.product.title}</p>
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatPrice(item.product.price)} × {item.quantity}
          </p>
        </div>
        <p className="font-bold tabular-nums">
          {formatPrice((item.product.price || 0) * item.quantity)}
        </p>
      </div>
      <Separator className="mt-4" />
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, refetchUser } = useAuth();
  const { items, totalPrice, clearCart, isLoading: cartLoading } = useCart();
  const { createOrder, isCreatingOrder } = useOrders();

  const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  // Recipient & Contact Details State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  // Structured Delivery Address State
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('United States');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Profile Sync
  const [saveToProfile, setSaveToProfile] = useState(true);
  const [isProfileSynced, setIsProfileSynced] = useState(false);
  const hasSyncedFromProfileRef = useRef(false);

  // Field validation error states
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isPlacing, setIsPlacing] = useState(false);
  const isOrderPlacedRef = useRef(false);

  // Group items by vendor into multi-vendor packages
  const packages = useMemo(() => {
    const map = new Map<
      string,
      {
        sellerName: string;
        sellerId?: number;
        items: typeof items;
      }
    >();

    items?.forEach((item) => {
      const sellerId = item.product?.owner?.id;
      const key = sellerId ? String(sellerId) : 'official';
      const sellerName =
        item.product?.owner?.vendorBusinessName ||
        item.product?.owner?.name ||
        'SnapCart Official Store';

      if (!map.has(key)) {
        map.set(key, { sellerName, sellerId, items: [] });
      }
      map.get(key)!.items.push(item);
    });

    return Array.from(map.values());
  }, [items]);

  // Sync profile data on mount / when user loads
  useEffect(() => {
    if (user && !hasSyncedFromProfileRef.current) {
      if (user.name) setFullName(user.name);
      if (user.email) setEmail(user.email);
      if (user.phoneNumber || user.vendorPhoneNumber) {
        setPhoneNumber(user.phoneNumber || user.vendorPhoneNumber || '');
      }

      const existingAddress = user.address || user.vendorAddress;
      if (existingAddress) {
        const parts = existingAddress.split(',').map((p) => p.trim());
        if (parts.length >= 3) {
          setStreetAddress(parts[0] || '');
          setCity(parts[1] || '');
          const stateZip = parts[2] || '';
          const stateZipMatch = stateZip.match(/^([A-Za-z\s]+)\s+([A-Za-z0-9-]+)$/);
          if (stateZipMatch) {
            setState(stateZipMatch[1].trim());
            setPostalCode(stateZipMatch[2].trim());
          } else {
            setState(stateZip);
          }
          if (parts[3]) setCountry(parts[3]);
        } else {
          setStreetAddress(existingAddress);
        }
      }

      setIsProfileSynced(Boolean(user.name && user.email));
      hasSyncedFromProfileRef.current = true;
    }
  }, [user]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/checkout');
    }
  }, [authLoading, isAuthenticated, router]);

  // Redirect to cart if cart is empty
  useEffect(() => {
    if (!cartLoading && items.length === 0 && isAuthenticated && !isOrderPlacedRef.current && !isAdminOrSuperAdmin) {
      router.push('/cart');
    }
  }, [cartLoading, items.length, isAuthenticated, isAdminOrSuperAdmin, router]);

  // Input change handler with real-time error clearance
  const handleInputChange = (field: string, setter: (val: string) => void) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setter(e.target.value);
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Form validator for mandatory fields
  const validateDeliveryForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!fullName.trim()) {
      errs.fullName = 'Recipient name is required';
    } else if (fullName.trim().length < 2) {
      errs.fullName = 'Please enter a valid full name';
    }

    if (!email.trim()) {
      errs.email = 'Email address is required for receipts';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (!phoneNumber.trim()) {
      errs.phoneNumber = 'Phone number is required for courier alerts';
    } else if (phoneNumber.replace(/[^\d+]/g, '').length < 7) {
      errs.phoneNumber = 'Please enter a valid phone number (min 7 digits)';
    }

    if (!streetAddress.trim()) {
      errs.streetAddress = 'Street address is required';
    } else if (streetAddress.trim().length < 5) {
      errs.streetAddress = 'Please enter a complete street address';
    }

    if (!city.trim()) {
      errs.city = 'City is required';
    }

    if (!state.trim()) {
      errs.state = 'State / Province is required';
    }

    if (!postalCode.trim()) {
      errs.postalCode = 'Postal / ZIP code is required';
    } else if (postalCode.trim().length < 3) {
      errs.postalCode = 'Please enter a valid postal code';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Formatted shipping address combining contact and physical destination
  const formattedShippingAddress = useMemo(() => {
    const addressLine = `${streetAddress.trim()}, ${city.trim()}, ${state.trim()} ${postalCode.trim()}, ${country.trim()}`;
    const contactLine = `${fullName.trim()} (Phone: ${phoneNumber.trim()} | Email: ${email.trim()})`;
    const notesLine = deliveryNotes.trim() ? ` [Delivery Note: ${deliveryNotes.trim()}]` : '';
    return `${contactLine}\n${addressLine}${notesLine}`;
  }, [fullName, phoneNumber, email, streetAddress, city, state, postalCode, country, deliveryNotes]);

  const handlePlaceOrder = async () => {
    if (items.length === 0 || isPlacing || isCreatingOrder) return;

    if (!validateDeliveryForm()) {
      toast.error('Please enter a complete delivery address to place your order.');
      const addressSection = document.getElementById('delivery-section');
      if (addressSection) {
        addressSection.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // Filter only valid items with valid IDs
    const validOrderItems = items
      .filter((item) => item?.product?.id && item.quantity > 0)
      .map((item) => ({
        productId: Number(item.product.id),
        quantity: Number(item.quantity),
      }));

    if (validOrderItems.length === 0) {
      toast.error('No valid products in your cart to order.');
      return;
    }

    setIsPlacing(true);
    isOrderPlacedRef.current = true;

    try {
      // Sync address & contact info back to profile if user selected it
      if (saveToProfile) {
        try {
          const profileAddress = `${streetAddress.trim()}, ${city.trim()}, ${state.trim()} ${postalCode.trim()}, ${country.trim()}`;
          await apiClient.patch('/users/profile', {
            name: fullName.trim(),
            phoneNumber: phoneNumber.trim(),
            address: profileAddress,
          });
          if (refetchUser) {
            await refetchUser();
          }
        } catch (profileErr) {
          console.warn('Profile auto-sync notice:', profileErr);
        }
      }

      await createOrder({
        items: validOrderItems,
        shippingAddress: formattedShippingAddress,
      });

      // Clear cart silently so it doesn't trigger a separate "Cart cleared" toast
      await clearCart({ silent: true });
      toast.success('Order placed successfully!');

      // Navigate straight to orders page
      router.replace('/orders');
    } catch (error: any) {
      isOrderPlacedRef.current = false;
      setIsPlacing(false);
      // Error toast handled centrally in useOrders hook
    }
  };

  if (authLoading || cartLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isAdminOrSuperAdmin) {
    const dashboardHref = user?.role === 'superadmin' ? '/superadmin' : '/admin';
    return (
      <div className="mx-auto max-w-md py-20 px-4 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 mb-3">
          Administrative Account
        </div>
        <h2 className="text-2xl font-black tracking-tight">Checkout Disabled</h2>
        <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
          Administrative and operational staff accounts cannot place consumer orders. Please test checkout using a customer account or manage store orders from the staff dashboard.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            className="w-full sm:w-auto rounded-full bg-zinc-950 text-white hover:bg-zinc-800 gap-2 cursor-pointer"
            asChild
          >
            <Link href={dashboardHref}>
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto rounded-full gap-2 cursor-pointer"
            asChild
          >
            <Link href="/products">
              <ArrowLeft className="h-4 w-4" />
              Browse Catalog
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // If order was just placed, render transition screen while redirecting
  if (isOrderPlacedRef.current || isPlacing) {
    return (
      <div className="container mx-auto flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <h2 className="text-2xl font-bold">Placing your order…</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirming order items and preparing your receipt.
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const subtotal = totalPrice;
  const shipping = subtotal > 50 ? 0 : 5.99;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;
  const isBusy = isPlacing || isCreatingOrder;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        href="/cart"
        className="mb-6 inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to cart
      </Link>

      <h1 className="mb-8 text-3xl font-black tracking-tight">Checkout</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Shipping Address & Order Items */}
        <div className="space-y-6 lg:col-span-2">
          {/* Delivery & Contact Information Card */}
          <div id="delivery-section" className="rounded-2xl border border-border p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                  <MapPin className="h-5 w-5 text-orange-600" />
                  Delivery & Contact Information
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Mandatory destination and contact details required for dispatch and delivery
                </p>
              </div>

              {isProfileSynced ? (
                <Badge variant="secondary" className="gap-1.5 py-1 px-2.5 text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Synced with profile
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1.5 py-1 px-2.5 text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border-amber-300">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Enter recipient info
                </Badge>
              )}
            </div>

            {/* Recipient Contact Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span>Recipient Contact Details</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="fullName" className="text-xs font-semibold">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="Recipient's full name"
                    value={fullName}
                    onChange={handleInputChange('fullName', setFullName)}
                    className={cn('mt-1.5 h-10', errors.fullName && 'border-destructive focus-visible:ring-destructive')}
                    disabled={isBusy}
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-xs text-destructive">{errors.fullName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="For order receipts"
                    value={email}
                    onChange={handleInputChange('email', setEmail)}
                    className={cn('mt-1.5 h-10', errors.email && 'border-destructive focus-visible:ring-destructive')}
                    disabled={isBusy}
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="sm:col-span-2 md:col-span-1">
                  <Label htmlFor="phoneNumber" className="text-xs font-semibold">
                    Phone Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="Courier contact e.g. +1..."
                    value={phoneNumber}
                    onChange={handleInputChange('phoneNumber', setPhoneNumber)}
                    className={cn('mt-1.5 h-10', errors.phoneNumber && 'border-destructive focus-visible:ring-destructive')}
                    disabled={isBusy}
                  />
                  {errors.phoneNumber && (
                    <p className="mt-1 text-xs text-destructive">{errors.phoneNumber}</p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Shipping Destination Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>Shipping Destination</span>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="streetAddress" className="text-xs font-semibold">
                    Street Address & Apartment / Unit <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="streetAddress"
                    placeholder="e.g. 742 Evergreen Terrace, Apt 4B"
                    value={streetAddress}
                    onChange={handleInputChange('streetAddress', setStreetAddress)}
                    className={cn('mt-1.5 h-10', errors.streetAddress && 'border-destructive focus-visible:ring-destructive')}
                    disabled={isBusy}
                  />
                  {errors.streetAddress && (
                    <p className="mt-1 text-xs text-destructive">{errors.streetAddress}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city" className="text-xs font-semibold">
                      City <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="city"
                      placeholder="e.g. Springfield"
                      value={city}
                      onChange={handleInputChange('city', setCity)}
                      className={cn('mt-1.5 h-10', errors.city && 'border-destructive focus-visible:ring-destructive')}
                      disabled={isBusy}
                    />
                    {errors.city && (
                      <p className="mt-1 text-xs text-destructive">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="state" className="text-xs font-semibold">
                      State / Province <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="state"
                      placeholder="e.g. Oregon or OR"
                      value={state}
                      onChange={handleInputChange('state', setState)}
                      className={cn('mt-1.5 h-10', errors.state && 'border-destructive focus-visible:ring-destructive')}
                      disabled={isBusy}
                    />
                    {errors.state && (
                      <p className="mt-1 text-xs text-destructive">{errors.state}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="postalCode" className="text-xs font-semibold">
                      ZIP / Postal Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="postalCode"
                      placeholder="e.g. 97477"
                      value={postalCode}
                      onChange={handleInputChange('postalCode', setPostalCode)}
                      className={cn('mt-1.5 h-10', errors.postalCode && 'border-destructive focus-visible:ring-destructive')}
                      disabled={isBusy}
                    />
                    {errors.postalCode && (
                      <p className="mt-1 text-xs text-destructive">{errors.postalCode}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country" className="text-xs font-semibold">
                      Country
                    </Label>
                    <Input
                      id="country"
                      value={country}
                      onChange={handleInputChange('country', setCountry)}
                      className="mt-1.5 h-10"
                      disabled={isBusy}
                    />
                  </div>

                  <div>
                    <Label htmlFor="deliveryNotes" className="text-xs font-semibold">
                      Delivery Instructions (Optional)
                    </Label>
                    <Input
                      id="deliveryNotes"
                      placeholder="Gate code, leave at porch, etc."
                      value={deliveryNotes}
                      onChange={handleInputChange('deliveryNotes', setDeliveryNotes)}
                      className="mt-1.5 h-10"
                      disabled={isBusy}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Sync Checkbox */}
            <div className="pt-2">
              <div className="flex items-start gap-3 rounded-xl border border-border/80 bg-muted/30 p-3.5">
                <Checkbox
                  id="saveToProfile"
                  checked={saveToProfile}
                  onCheckedChange={(checked) => setSaveToProfile(Boolean(checked))}
                  disabled={isBusy}
                  className="mt-0.5 cursor-pointer"
                />
                <div className="space-y-0.5">
                  <Label htmlFor="saveToProfile" className="text-xs font-semibold cursor-pointer">
                    Save this address and contact information to my profile
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Automatically pre-fill these details for faster, 1-click checkouts in future sessions.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Packages Card */}
          <div className="rounded-2xl border border-border p-6 shadow-sm space-y-5">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
                <ShoppingBag className="h-5 w-5 text-orange-600" />
                Review Packages ({packages.length} {packages.length === 1 ? 'Package' : 'Packages'})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Items grouped by seller for separate fulfillment and dispatch
              </p>
            </div>

            <div className="space-y-4">
              {packages.map((pkg, idx) => (
                <div
                  key={pkg.sellerId || idx}
                  className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-orange-600" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Package {idx + 1}:
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        Sold by {pkg.sellerName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <Truck className="h-3 w-3" />
                      <span>Free Delivery</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    {pkg.items.map((item) => (
                      <CheckoutItemRow key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4 rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-lg font-bold tracking-tight">Order summary</h2>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className={shipping === 0 ? 'font-medium text-emerald-600' : 'font-medium tabular-nums'}>
                  {shipping === 0 ? 'Free' : formatPrice(shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (8%)</span>
                <span className="font-medium tabular-nums">{formatPrice(tax)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="tabular-nums text-orange-600">{formatPrice(total)}</span>
            </div>

            <Button
              className="w-full rounded-full bg-orange-600 text-white hover:bg-orange-700 cursor-pointer"
              size="lg"
              onClick={handlePlaceOrder}
              disabled={isBusy}
            >
              {isBusy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Placing order…
                </>
              ) : (
                `Place order · ${formatPrice(total)}`
              )}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              Verified checkout · 100% Buyer Protection
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}