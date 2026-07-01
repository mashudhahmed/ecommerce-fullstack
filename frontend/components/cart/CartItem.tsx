'use client';

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
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-white">
      <div className="relative h-20 w-20 shrink-0 bg-muted rounded-md overflow-hidden">
        {item.product.imageUrl ? (
          <Image
            src={item.product.imageUrl}
            alt={item.product.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            No image
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">{item.product.title}</h3>
        <p className="text-sm text-muted-foreground">
          {formatPrice(item.product.price)}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleUpdateQuantity(item.quantity - 1)}
          disabled={item.quantity <= 1}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="w-8 text-center font-medium">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => handleUpdateQuantity(item.quantity + 1)}
          disabled={item.quantity >= item.product.stock}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="text-right min-w-20">
        <p className="font-semibold">{formatPrice(item.subtotal)}</p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-destructive"
        onClick={handleRemove}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}