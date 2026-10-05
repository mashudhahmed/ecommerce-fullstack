// frontend/components/cart/CartItem.tsx
'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { CartItem as CartItemType } from '@/types';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { toast } from 'sonner';

interface CartItemProps {
  item: CartItemType;
}

export function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem } = useCart();
  const [imageError, setImageError] = useState(false);

  const imageSrc = useMemo(() => {
    if (!item.product.imageUrl || imageError) {
      return '/placeholder-image.png';
    }
    return item.product.imageUrl;
  }, [item.product.imageUrl, imageError]);

  const handleUpdateQuantity = async (quantity: number) => {
    try {
      await updateQuantity(item.product.id, quantity);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update quantity');
    }
  };

  const handleRemove = async () => {
    try {
      await removeItem(item.product.id);
    } catch {
      // toast is handled in useCart
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 rounded-2xl border border-border/60 bg-background p-3 sm:p-4 transition-colors hover:border-orange-200">
      {/* Product Image & Title Row on mobile / inline on desktop */}
      <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl bg-muted/20">
          <Image
            src={imageSrc}
            alt={item.product.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 64px, 80px"
            onError={() => setImageError(true)}
          />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 sm:truncate font-semibold text-sm sm:text-base leading-snug">
            {item.product.title}
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground tabular-nums">
            {formatPrice(item.product.price)} each
          </p>
        </div>

        {/* Mobile Trash button (top-right of card) */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-600 sm:hidden"
          onClick={handleRemove}
          aria-label="Remove item"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Controls row: Quantity + Subtotal + Desktop Delete button */}
      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-2 sm:pt-0 border-t border-border/40 sm:border-t-0">
        {/* Quantity Controls */}
        <div className="flex items-center rounded-full border border-border">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full"
            onClick={() => handleUpdateQuantity(item.quantity - 1)}
            disabled={item.quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-7 sm:w-8 text-center text-xs sm:text-sm font-semibold tabular-nums">
            {item.quantity}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-full"
            onClick={() => handleUpdateQuantity(item.quantity + 1)}
            disabled={item.quantity >= item.product.stock}
            aria-label="Increase quantity"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Subtotal */}
        <div className="sm:min-w-20 text-right">
          <span className="text-[11px] text-muted-foreground sm:hidden block">Total</span>
          <p className="font-bold text-sm sm:text-base tabular-nums">{formatPrice(item.subtotal)}</p>
        </div>

        {/* Desktop Trash button */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden sm:inline-flex rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-600"
          onClick={handleRemove}
          aria-label="Remove item"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}