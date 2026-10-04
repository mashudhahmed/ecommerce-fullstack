// components/reviews/ReviewList.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useReviews } from '@/hooks/useReviews';
import { useAuth } from '@/hooks/useAuth';
import { formatDate, getInitials } from '@/lib/utils';
import { StarRating } from '@/components/ui/star-rating';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ReviewForm } from './ReviewForm';
import {
  ThumbsUp,
  Flag,
  CheckCircle2,
  PenLine,
  Star,
  MessageSquare,
  X,
  LogIn,
} from 'lucide-react';

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

  const { isAuthenticated } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);

  if (statsLoading || isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
        {[...Array(2)].map((_, i) => (
          <div key={i} className="border border-border/70 rounded-2xl p-5 space-y-3 bg-card">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const totalReviews = stats?.total ?? reviews.length;
  const averageRating = stats?.average ?? (reviews.length > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : 0);

  return (
    <div className="space-y-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-foreground">
            Customer Reviews
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {totalReviews > 0
              ? `Based on ${totalReviews} verified ${totalReviews === 1 ? 'review' : 'reviews'}`
              : 'Share your thoughts with other customers'}
          </p>
        </div>

        {isAuthenticated ? (
          <Button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="rounded-full gap-2 bg-orange-600 hover:bg-orange-700 text-white self-start sm:self-auto"
            size="sm"
          >
            {isFormOpen ? (
              <>
                <X className="h-4 w-4" />
                Cancel Review
              </>
            ) : (
              <>
                <PenLine className="h-4 w-4" />
                Write a Review
              </>
            )}
          </Button>
        ) : (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-full gap-2 self-start sm:self-auto"
          >
            <Link href={`/login?redirect=/products/${productId}`}>
              <LogIn className="h-4 w-4" />
              Sign in to Review
            </Link>
          </Button>
        )}
      </div>

      {/* Expandable Review Form */}
      {isFormOpen && (
        <div className="rounded-2xl border border-orange-200/80 bg-orange-50/30 p-6 dark:border-orange-900/40 dark:bg-orange-950/10">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-base font-semibold text-foreground">Write Your Review</h4>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setIsFormOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ReviewForm
            productId={productId}
            onSuccess={() => setIsFormOpen(false)}
          />
        </div>
      )}

      {/* Empty State */}
      {reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-10 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600">
            <MessageSquare className="h-7 w-7" />
          </div>
          <h4 className="text-base font-bold text-foreground">No reviews yet</h4>
          <p className="mt-1 max-w-sm mx-auto text-sm text-muted-foreground">
            Be the first to review this product and help other shoppers make informed choices.
          </p>
          <div className="mt-5">
            {isAuthenticated ? (
              <Button
                onClick={() => setIsFormOpen(true)}
                className="rounded-full gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                size="sm"
              >
                <PenLine className="h-4 w-4" />
                Write the First Review
              </Button>
            ) : (
              <Button asChild size="sm" className="rounded-full gap-2 bg-zinc-950 text-white hover:bg-zinc-800">
                <Link href={`/login?redirect=/products/${productId}`}>
                  <LogIn className="h-4 w-4" />
                  Sign in to Review
                </Link>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Rating Breakdown & Stats */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 rounded-2xl border border-border/80 bg-card p-6">
              <div className="flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-border pb-6 md:pb-0 md:pr-6">
                <p className="text-4xl font-black tabular-nums tracking-tight text-foreground">
                  {averageRating.toFixed(1)}
                </p>
                <div className="my-1.5">
                  <StarRating value={Math.round(averageRating)} readonly size="sm" />
                </div>
                <p className="text-xs text-muted-foreground font-medium">
                  {totalReviews} {totalReviews === 1 ? 'total rating' : 'total ratings'}
                </p>
              </div>

              <div className="space-y-2 justify-center flex flex-col">
                {[5, 4, 3, 2, 1].map((star) => {
                  const starCount = stats.distribution[star as keyof typeof stats.distribution] || 0;
                  const percentage = totalReviews > 0 ? Math.round((starCount / totalReviews) * 100) : 0;

                  return (
                    <div key={star} className="flex items-center gap-3 text-xs">
                      <span className="w-7 font-medium text-muted-foreground flex items-center gap-0.5">
                        {star} <Star className="h-3 w-3 fill-orange-500 text-orange-500 inline" />
                      </span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="w-10 text-right tabular-nums text-muted-foreground">
                        {percentage}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviews List */}
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="rounded-2xl border border-border/70 bg-card p-5 space-y-3 transition-colors hover:border-border"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-orange-600/10 text-orange-700 font-semibold text-xs">
                        {getInitials(review.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-foreground">{review.user.name}</p>
                        {review.metadata?.verifiedPurchase && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 py-0 h-4 gap-1 font-medium"
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
                  <h4 className="font-semibold text-sm text-foreground">{review.title}</h4>
                )}
                <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                  {review.comment}
                </p>

                {review.images && review.images.length > 0 && (
                  <div className="flex gap-2 pt-1 overflow-x-auto custom-scrollbar pb-1">
                    {review.images.map((img: string, idx: number) => (
                      <div
                        key={idx}
                        className="relative h-16 w-16 rounded-xl overflow-hidden border border-border shrink-0 bg-muted/20"
                      >
                        <Image src={img} alt="Customer photo" fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 pt-1 border-t border-border/40">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => markHelpful(review.id)}
                  >
                    <ThumbsUp className="mr-1 h-3.5 w-3.5" />
                    Helpful {review.metadata?.helpfulCount ? `(${review.metadata.helpfulCount})` : ''}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Flag className="mr-1 h-3.5 w-3.5" />
                    Report
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          {hasNextPage && (
            <div className="text-center pt-2">
              <Button
                variant="outline"
                className="rounded-full text-xs h-9 px-6"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Loading reviews...' : 'Load More Reviews'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}