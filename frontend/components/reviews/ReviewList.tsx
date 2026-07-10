// components/reviews/ReviewList.tsx
'use client';

import { useReviews } from '@/hooks/useReviews';
import { formatDate } from '@/lib/utils';
import { StarRating } from '@/components/ui/star-rating';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { ThumbsUp, Flag } from 'lucide-react';

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
                  <p className="font-semibold">{review.user.name}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(review.createdAt)}</p>
                </div>
              </div>
              <StarRating value={review.rating} readonly size="sm" />
            </div>

            {review.title && (
              <h4 className="font-semibold">{review.title}</h4>
            )}
            <p className="text-sm">{review.comment}</p>

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