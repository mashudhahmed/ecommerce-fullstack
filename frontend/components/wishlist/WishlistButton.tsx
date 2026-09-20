// components/wishlist/WishlistButton.tsx
'use client';

import { useState } from 'react';
import { useWishlist } from '@/hooks/useWishlist';
import { useWishlistStore } from '@/store/wishlist-store';
import { Button } from '@/components/ui/button';
import { Heart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface WishlistButtonProps {
  productId: number;
  className?: string;
}

export function WishlistButton({ productId, className }: WishlistButtonProps) {
  const { addToWishlist, removeFromWishlist } = useWishlist();
  const isInWishlist = useWishlistStore((state) =>
    state.items.some((item) => item.id === productId)
  );
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;
    setLoading(true);

    try {
      if (isInWishlist) {
        await removeFromWishlist(productId);
        toast.success('Removed from wishlist');
      } else {
        await addToWishlist({ id: productId } as any);
        toast.success('Added to wishlist');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update wishlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={isInWishlist ? 'default' : 'outline'}
      size="icon"
      className={className}
      onClick={handleClick}
      disabled={loading}
      aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={`h-4 w-4 ${isInWishlist ? 'fill-current text-white' : ''}`} />
      )}
    </Button>
  );
}