// components/reviews/ReviewList.tsx
'use client';

import Image from 'next/image';
import { useReviews } from '@/hooks/useReviews';
import { formatDate } from '@/lib/utils';
import { StarRating } from '@/components/ui/star-rating';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ThumbsUp, Flag, CheckCircle2 } from 'lucide-react';

interface ReviewListProps {
  productId: number;
}

export function ReviewList({ productId }: ReviewListProps) {
  const {
    reviews,
    stats,
    statsLoading,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
    markHelpful,
  } = useReviews(productId);

  if (statsLoading || isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border rounded-lg p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="flex items-center gap-6 p-4 bg-muted/20 rounded-lg">
          <div className="text-center">
            <p className="text-3xl font-bold">{stats.average.toFixed(1)}</p>
            <StarRating value={Math.round(stats.average)} readonly size="sm" />
            <p className="text-sm text-muted-foreground">{stats.total} reviews</p>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => (
              <div key={star} className="flex items-center gap-2">
                <span className="text-sm w-8">{star}★</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full"
                    style={{
                      width: `${(stats.distribution[star as keyof typeof stats.distribution] / stats.total) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-12">
                  {stats.distribution[star as keyof typeof stats.distribution]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <div key={review.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{getInitials(review.user.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{review.user.name}</p>
                    {review.metadata?.verifiedPurchase && (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 py-0 h-4 gap-1"
                      >
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Verified Purchase
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                </div>
              </div>
              <StarRating value={review.rating} readonly size="sm" />
            </div>

            {review.title && (
              <h4 className="font-semibold text-sm">{review.title}</h4>
            )}
            <p className="text-sm leading-relaxed">{review.comment}</p>

            {review.images && review.images.length > 0 && (
              <div className="flex gap-2 pt-1 overflow-x-auto custom-scrollbar pb-1">
                {review.images.map((img, idx) => (
                  <div key={idx} className="relative h-16 w-16 rounded-md overflow-hidden border shrink-0 bg-muted/20">
                    <Image src={img} alt="Customer photo" fill className="object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markHelpful(review.id)}
              >
                <ThumbsUp className="mr-1 h-4 w-4" />
                Helpful
              </Button>
              <Button variant="ghost" size="sm">
                <Flag className="mr-1 h-4 w-4" />
                Report
              </Button>
            </div>
          </div>
        ))}
      </div>

      {hasNextPage && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading...' : 'Load More Reviews'}
          </Button>
        </div>
      )}
    </div>
  );
}