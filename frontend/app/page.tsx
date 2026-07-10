// app/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ProductList } from '@/components/products/ProductList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  Star,
  Truck,
  Shield,
  Clock,
  Package,
  Sparkles,
  ShoppingBag,
  Zap,
  Gem,
  Crown,
  Award,
  ChevronRight,
  Send,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

// ============================================================
// MARKET PULSE — signature ticker
// ============================================================

const TICKER_ITEMS = [
  'Wireless Earbuds Pro',
  'Minimalist Desk Setup',
  'Ceramic Pour-Over Kit',
  'Trail Running Shoes',
  'Linen Weekend Bag',
  'Smart Home Hub',
  'Vintage Vinyl Records',
  'Organic Skincare Set',
];

const MarketPulse = () => (
  <div className="relative overflow-hidden rounded-full border border-white/10 bg-zinc-950 py-2.5">
    <div className="flex items-center gap-3 px-4 md:px-5">
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-500 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
      </span>
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
        Trending now
      </span>
      <div className="flex-1 overflow-hidden">
        <div className="animate-marquee flex gap-8 whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="text-sm text-white/80">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
    <style jsx>{`
      @keyframes marquee {
        from {
          transform: translateX(0);
        }
        to {
          transform: translateX(-50%);
        }
      }
      .animate-marquee {
        animation: marquee 26s linear infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        .animate-marquee {
          animation: none;
        }
      }
    `}</style>
  </div>
);

// ============================================================
// HERO SECTION
// ============================================================

const HeroSection = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-6">
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600">
          <span className="h-px w-6 bg-orange-600" />
          Marketplace · Est. 2024
        </div>

        <h1 className="text-[2.75rem] font-black leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-[4.5rem]">
          Shop the internet&apos;s
          <br />
          best <span className="font-serif font-medium italic text-orange-600">independent</span>
          <br />
          storefronts.
        </h1>

        <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
          15,000+ products from 500 vetted vendors. No middleman markups, no guesswork —
          just things worth buying, delivered fast.
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link href="/products">
            <Button
              size="lg"
              className="h-12 gap-2 rounded-full bg-zinc-950 px-7 text-[15px] text-white hover:bg-zinc-800"
            >
              Browse products
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          {!isAuthenticated && (
            <Link
              href="/register"
              className="text-[15px] font-medium text-foreground underline decoration-muted-foreground/40 underline-offset-4 transition-colors hover:decoration-foreground"
            >
              Become a vendor →
            </Link>
          )}
        </div>

        <div className="flex items-center gap-5 pt-4">
          <div className="flex -space-x-3">
            {['A', 'M', 'J', 'R'].map((letter, i) => (
              <div
                key={i}
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-orange-50 text-xs font-semibold text-orange-700"
              >
                {letter}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">10,000+</span> customers shop
            with us weekly
          </p>
        </div>
      </div>

      {/* Image mosaic */}
      <div className="relative hidden h-105 md:block lg:h-130">
        <div className="absolute right-0 top-0 h-[62%] w-[65%] overflow-hidden rounded-3xl shadow-xl">
          <Image
            src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80"
            alt="Curated product from a marketplace vendor"
            fill
            sizes="(min-width: 1024px) 35vw, 40vw"
            className="object-cover"
            priority
          />
        </div>
        <div className="absolute bottom-0 left-0 h-[48%] w-[55%] overflow-hidden rounded-3xl shadow-xl">
          <Image
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80"
            alt="Curated product from a marketplace vendor"
            fill
            sizes="(min-width: 1024px) 30vw, 35vw"
            className="object-cover"
          />
        </div>
        <div className="absolute bottom-6 right-6 flex aspect-square w-[38%] flex-col justify-between rounded-2xl bg-zinc-950 p-4 text-white shadow-xl">
          <Shield className="h-5 w-5 text-orange-500" />
          <div>
            <p className="text-2xl font-bold">
              4.9<span className="text-sm font-normal text-white/60">/5</span>
            </p>
            <p className="text-[11px] uppercase tracking-wide text-white/60">
              Vendor rating
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================================
// FEATURES SECTION
// ============================================================

const FeaturesSection = () => {
  const features = [
    { icon: Truck, label: 'Free shipping', description: 'On orders $50+' },
    { icon: Shield, label: 'Buyer protection', description: 'Full refund guarantee' },
    { icon: Clock, label: '2-day delivery', description: 'On most items' },
    { icon: Star, label: 'Vetted vendors', description: 'Reviewed & verified' },
  ];

  return (
    <section className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-2xl border border-border md:grid-cols-4 md:divide-y-0">
      {features.map((feature) => (
        <div key={feature.label} className="flex items-center gap-3 p-5 md:p-6">
          <feature.icon className="h-5 w-5 shrink-0 text-orange-600" />
          <div>
            <p className="text-sm font-semibold leading-tight">{feature.label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{feature.description}</p>
          </div>
        </div>
      ))}
    </section>
  );
};

// ============================================================
// STATS SECTION
// ============================================================

const StatsSection = () => {
  const [counts, setCounts] = useState({ products: 0, users: 0, orders: 0, vendors: 0 });

  useEffect(() => {
    const target = { products: 15000, users: 10000, orders: 25000, vendors: 500 };
    const duration = 1800;
    const steps = 60;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      setCounts({
        products: Math.floor(target.products * progress),
        users: Math.floor(target.users * progress),
        orders: Math.floor(target.orders * progress),
        vendors: Math.floor(target.vendors * progress),
      });
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const stats = [
    { label: 'Products listed', value: counts.products },
    { label: 'Happy customers', value: counts.users },
    { label: 'Orders delivered', value: counts.orders },
    { label: 'Trusted vendors', value: counts.vendors },
  ];

  return (
    <section className="rounded-2xl bg-zinc-950 px-6 py-10 text-white md:px-12 md:py-12">
      <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label}>
            <p className="text-3xl font-black tracking-tight tabular-nums md:text-5xl">
              {stat.value.toLocaleString()}
              <span className="text-orange-500">+</span>
            </p>
            <p className="mt-1.5 text-xs text-white/50 md:text-sm">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

// ============================================================
// CATEGORY SECTION
// ============================================================

const CategorySection = () => {
  const { categories, isLoading } = useCategories();

  const displayCategories = useMemo(() => {
    if (!categories) return [];
    return categories.slice(0, 6);
  }, [categories]);

  const categoryIcons: Record<string, React.ReactNode> = {
    electronics: <Zap className="h-5 w-5" />,
    clothing: <ShoppingBag className="h-5 w-5" />,
    books: <Sparkles className="h-5 w-5" />,
    'home-garden': <Gem className="h-5 w-5" />,
    'toys-games': <Crown className="h-5 w-5" />,
    'sports-outdoors': <Award className="h-5 w-5" />,
  };

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600">
            Browse
          </p>
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">Shop by category</h2>
        </div>
        <Link
          href="/categories"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : displayCategories.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
          {displayCategories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.slug}`}
              className="group relative flex h-28 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 transition-colors hover:border-orange-300"
            >
              <div className="absolute -right-3 -top-3 h-16 w-16 rounded-full bg-orange-500/0 transition-colors group-hover:bg-orange-500/10" />
              <div className="relative text-muted-foreground transition-colors group-hover:text-orange-600">
                {categoryIcons[category.slug] || <Package className="h-5 w-5" />}
              </div>
              <p className="relative line-clamp-1 text-sm font-semibold">{category.name}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border py-10 text-center text-muted-foreground">
          <Package className="mx-auto mb-2 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm">No categories yet</p>
        </div>
      )}
    </section>
  );
};

// ============================================================
// NEW ARRIVALS SECTION
// ============================================================

const NewArrivalsSection = () => {
  const { products, isLoading } = useProducts();

  const newArrivals = useMemo(() => {
    if (!products) return [];
    return [...products]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);
  }, [products]);

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600">
            Just landed
          </p>
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">New arrivals</h2>
        </div>
        <Link
          href="/products?sortBy=newest"
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          View all
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <ProductList products={newArrivals} isLoading={isLoading} columns={4} />
    </section>
  );
};

// ============================================================
// NEWSLETTER SECTION
// ============================================================

const NewsletterSection = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setIsSuccess(true);
      setEmail('');
      toast.success('Subscribed successfully!');
    } catch {
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl bg-zinc-950 text-white">
      <div className="grid grid-cols-1 items-center gap-8 p-8 md:grid-cols-2 md:p-12">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-500">
            Newsletter
          </p>
          <h2 className="mb-3 text-3xl font-black leading-tight tracking-tight md:text-4xl">
            First look at new drops.
          </h2>
          <p className="max-w-sm text-white/60">
            One email a week. New vendors, restocks, and prices that won&apos;t last.
          </p>
        </div>

        <div>
          {isSuccess ? (
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">You&apos;re on the list.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-full border-white/15 bg-white/5 px-5 text-white placeholder:text-white/40 focus-visible:border-white/40"
                required
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 whitespace-nowrap rounded-full bg-orange-600 px-6 text-white hover:bg-orange-700"
              >
                {isSubmitting ? (
                  'Subscribing…'
                ) : (
                  <>
                    Subscribe
                    <Send className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

// ============================================================
// MAIN HOME PAGE
// ============================================================

export default function HomePage() {
  const { products, isLoading } = useProducts();

  const featuredProducts = useMemo(() => {
    if (!products) return [];
    return products.slice(0, 4);
  }, [products]);

  return (
    <div className="space-y-14 pb-12 md:space-y-20">
      <MarketPulse />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <CategorySection />

      {/* Featured Products */}
      <section className="space-y-6">
        <div className="flex items-end justify-between">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-600">
              Curated
            </p>
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">
              Featured products
            </h2>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <ProductList products={featuredProducts} isLoading={isLoading} columns={4} />
      </section>

      <NewArrivalsSection />
      <NewsletterSection />
    </div>
  );
}