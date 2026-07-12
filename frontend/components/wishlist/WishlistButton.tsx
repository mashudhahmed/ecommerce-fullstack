// components/wishlist/WishlistButton.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWishlist } from '@/hooks/useWishlist';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface WishlistButtonProps {
  productId: number;
  className?: string;
}

export function WishlistButton({ productId, className }: WishlistButtonProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { 
    addToWishlist, 
    removeFromWishlist, 
    addLoading, 
    removeLoading, 
    checkInWishlist,
    wishlist 
  } = useWishlist();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      checkInWishlist(productId)
        .then((result) => setIsInWishlist(result))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [productId, isAuthenticated, checkInWishlist]);

  const handleClick = async () => {
    if (!isAuthenticated) {
      toast.info('Please login to add to wishlist');
      router.push('/login?redirect=/products');
      return;
    }

    try {
      if (isInWishlist) {
        await removeFromWishlist(productId);
        setIsInWishlist(false);
      } else {
        // ✅ Fix: Find the product from wishlist or use productId
        // The addToWishlist expects a Product object, but we only have productId
        // So we'll create a minimal product object
        await addToWishlist({ id: productId } as any);
        setIsInWishlist(true);
      }
    } catch (error) {
      // Errors handled in hook
    }
  };

  const isLoading = loading || addLoading || removeLoading;

  return (
    <Button
      variant={isInWishlist ? 'default' : 'outline'}
      size="icon"
      className={className}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-current text-white' : ''}`} />
      )}
    </Button>
  );
}