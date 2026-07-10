// components/reviews/ReviewForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useReviews } from '@/hooks/useReviews';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/ui/star-rating';
import { toast } from 'sonner';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating'),
  title: z.string().optional(),
  comment: z.string().min(10, 'Comment must be at least 10 characters'),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  productId: number;
  onSuccess?: () => void;
}

export function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
  const { createReview, createLoading } = useReviews(productId);
  const [rating, setRating] = useState(0);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      title: '',
      comment: '',
    },
  });

  const onSubmit = async (data: ReviewFormData) => {
    try {
      await createReview({
        productId,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
      });
      form.reset();
      setRating(0);
      onSuccess?.();
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating</FormLabel>
              <FormControl>
                <StarRating
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    setRating(value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Summary of your review" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Review</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share your experience with this product..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={createLoading}>
          {createLoading ? 'Submitting...' : 'Submit Review'}
        </Button>
      </form>
    </Form>
  );
}