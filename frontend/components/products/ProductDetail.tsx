'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ShoppingCart } from 'lucide-react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import { toast } from 'sonner';

interface ProductDetailProps {
  product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const { addToCart, addToCartLoading } = useCart();
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = async () => {
    try {
      await addToCart({ productId: product.id, quantity });
      toast.success(`${product.title} added to cart`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to add to cart');
    }
  };

  const isOutOfStock = product.stock === 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Product Image */}
      <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            No image available
          </div>
        )}
        {isOutOfStock && (
          <Badge variant="destructive" className="absolute top-4 right-4">
            Out of Stock
          </Badge>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{product.title}</h1>
          <p className="text-2xl font-semibold mt-2">{formatPrice(product.price)}</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {product.stock > 0 ? (
              <span className="text-green-600 font-medium">In Stock ({product.stock} available)</span>
            ) : (
              <span className="text-red-600 font-medium">Out of Stock</span>
            )}
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground">{product.description}</p>
          </CardContent>
        </Card>

        {!isOutOfStock && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-lg">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-none"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                <span className="w-12 text-center font-medium">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-none"
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                >
                  +
                </Button>
              </div>
              <Button
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
                disabled={addToCartLoading}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {addToCartLoading ? 'Adding...' : 'Add to Cart'}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {quantity > 0 && quantity <= product.stock
                ? `Total: ${formatPrice(product.price * quantity)}`
                : 'Select a valid quantity'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}