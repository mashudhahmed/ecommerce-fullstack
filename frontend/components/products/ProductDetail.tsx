'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ShoppingCart, Minus, Plus, Shield, Truck, RotateCcw } from 'lucide-react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { toast } from 'sonner';

interface ProductDetailProps {
  product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const { addToCart, addToCartLoading } = useCart();
  const [quantity, setQuantity] = useState(1);

  // ✅ Reset quantity whenever the product being viewed changes.
  // Without this, navigating client-side from one product to another
  // keeps the previous product's stepper value, which can look like
  // stale/incorrect product state even though the displayed data is right.
  useEffect(() => {
    setQuantity(1);
  }, [product.id]);

  const handleAddToCart = async () => {
    try {
      await addToCart({ productId: product.id, quantity });
      toast.success(`${product.title} added to cart`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add to cart');
    }
  };

  const isOutOfStock = product.stock === 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:gap-14">
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted/20">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            No image available
          </div>
        )}

        <div className="absolute left-4 top-4 z-10 flex flex-col items-start gap-1.5">
          {isOutOfStock && (
            <span className="rounded-full bg-zinc-950/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
              Out of stock
            </span>
          )}
          {isLowStock && !isOutOfStock && (
            <span className="rounded-full border border-orange-200 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-orange-700 backdrop-blur-sm">
              Only {product.stock} left
            </span>
          )}
        </div>
        {discount > 0 && (
          <span className="absolute right-4 top-4 z-10 rounded-full bg-orange-600 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white">
            −{discount}%
          </span>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-7">
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">{product.title}</h1>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold tabular-nums">{formatPrice(product.price)}</p>
            {product.compareAtPrice && (
              <p className="text-base text-muted-foreground line-through tabular-nums">
                {formatPrice(product.compareAtPrice)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isOutOfStock ? 'bg-red-500' : isLowStock ? 'bg-orange-500' : 'bg-emerald-500'
            }`}
          />
          {product.stock > 0 ? (
            <span className="font-medium text-foreground">
              In stock · {product.stock} available
            </span>
          ) : (
            <span className="font-medium text-muted-foreground">Currently unavailable</span>
          )}
        </div>

        <div className="space-y-2 border-t border-border pt-6">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Description
          </h3>
          <p className="leading-relaxed text-muted-foreground">{product.description}</p>
        </div>

        {!isOutOfStock && (
          <div className="space-y-4 border-t border-border pt-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-full border border-border">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-full"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-10 text-center text-sm font-semibold tabular-nums">
                  {quantity}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 rounded-full"
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                  aria-label="Increase quantity"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button
                size="lg"
                className="h-11 flex-1 gap-2 rounded-full bg-zinc-950 text-white hover:bg-zinc-800"
                onClick={handleAddToCart}
                disabled={addToCartLoading}
              >
                <ShoppingCart className="h-4 w-4" />
                {addToCartLoading ? 'Adding…' : 'Add to cart'}
              </Button>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {quantity > 0 && quantity <= product.stock
                ? `Total: ${formatPrice(product.price * quantity)}`
                : 'Select a valid quantity'}
            </p>
          </div>
        )}

        {/* Trust strip */}
        <div className="grid grid-cols-3 gap-3 border-t border-border pt-6 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <Truck className="h-4 w-4 text-orange-600" />
            <p className="text-[11px] text-muted-foreground">Free shipping $50+</p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Shield className="h-4 w-4 text-orange-600" />
            <p className="text-[11px] text-muted-foreground">Buyer protection</p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <RotateCcw className="h-4 w-4 text-orange-600" />
            <p className="text-[11px] text-muted-foreground">Easy 30-day returns</p>
          </div>
        </div>
      </div>
    </div>
  );
}