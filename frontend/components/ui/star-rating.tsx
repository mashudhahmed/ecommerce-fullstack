// components/ui/star-rating.tsx
'use client';

import { Star, StarHalf } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-6 w-6',
};

export function StarRating({ 
  value, 
  onChange, 
  readonly = false, 
  size = 'md',
  className 
}: StarRatingProps) {
  const fullStars = Math.floor(value);
  const hasHalfStar = value % 1 >= 0.5;
  const starSize = sizeMap[size];

  const handleClick = (index: number) => {
    if (readonly || !onChange) return;
    onChange(index + 1);
  };

  const handleHover = (index: number) => {
    if (readonly || !onChange) return;
    // We'll use the value directly
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {[...Array(5)].map((_, i) => {
        if (i < fullStars) {
          return (
            <Star
              key={i}
              className={cn(
                starSize,
                "fill-yellow-400 text-yellow-400",
                !readonly && "cursor-pointer hover:scale-110 transition-transform"
              )}
              onClick={() => handleClick(i)}
            />
          );
        }
        if (i === fullStars && hasHalfStar) {
          return (
            <StarHalf
              key={i}
              className={cn(
                starSize,
                "fill-yellow-400 text-yellow-400",
                !readonly && "cursor-pointer hover:scale-110 transition-transform"
              )}
              onClick={() => handleClick(i)}
            />
          );
        }
        return (
          <Star
            key={i}
            className={cn(
              starSize,
              "text-muted-foreground/30",
              !readonly && "cursor-pointer hover:scale-110 hover:text-yellow-400 transition-all"
            )}
            onClick={() => handleClick(i)}
          />
        );
      })}
    </div>
  );
}