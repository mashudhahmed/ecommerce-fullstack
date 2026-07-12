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
      toast.success('Item removed from cart');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to remove item');
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background p-4 transition-colors hover:border-orange-200">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted/20">
        <Image
          src={imageSrc}
          alt={item.product.title}
          fill
          className="object-cover"
          sizes="80px"
          onError={() => setImageError(true)}
        />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold">{item.product.title}</h3>
        <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
          {formatPrice(item.product.price)}
        </p>
      </div>

      <div className="flex items-center rounded-full border border-border">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={() => handleUpdateQuantity(item.quantity - 1)}
          disabled={item.quantity <= 1}
          aria-label="Decrease quantity"
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="w-8 text-center text-sm font-semibold tabular-nums">
          {item.quantity}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          onClick={() => handleUpdateQuantity(item.quantity + 1)}
          disabled={item.quantity >= item.product.stock}
          aria-label="Increase quantity"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="min-w-20 text-right">
        <p className="font-bold tabular-nums">{formatPrice(item.subtotal)}</p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-600"
        onClick={handleRemove}
        aria-label="Remove item"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}