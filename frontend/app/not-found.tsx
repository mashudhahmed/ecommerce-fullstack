// app/not-found.tsx
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Search, ShoppingBag } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="space-y-6 max-w-md">
        <div className="relative">
          <h1 className="text-8xl font-bold text-muted-foreground/20">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl animate-bounce">🔍</div>
          </div>
        </div>

        <h2 className="text-2xl font-semibold">Page Not Found</h2>
        <p className="text-muted-foreground">
          Oops! The page you are looking for does not exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Button asChild className="gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              Go Home
            </Link>
          </Button>
          <Button variant="outline" asChild className="gap-2">
            <Link href="/products">
              <Search className="h-4 w-4" />
              Browse Products
            </Link>
          </Button>
          <Button variant="ghost" onClick={() => window.history.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>

        <div className="pt-6 border-t">
          <p className="text-sm text-muted-foreground mb-3">Popular categories:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Toys'].map((category) => (
              <Link
                key={category}
                href={`/products?category=${category.toLowerCase()}`}
                className="text-xs px-3 py-1.5 bg-muted rounded-full hover:bg-muted/80 transition-colors"
              >
                {category}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}