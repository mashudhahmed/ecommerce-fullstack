// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { ProductCard } from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  ShoppingBag,
  Truck,
  Shield,
  Clock,
  Star,
  TrendingUp,
  Sparkles,
  Zap,
  Package,
  ChevronRight,
  MoveRight,
  Users,
  Award,
  Headphones,
  Rocket,
  Laptop,
  Shirt,
  BookOpen,
  Home,
  Gamepad2,
  Bike,
  Smartphone,
  Watch,
  Sofa,
  Camera,
  Dumbbell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

// ============================================================
// ANIMATION VARIANTS
// ============================================================

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// ============================================================
// CATEGORY ICONS MAPPING
// ============================================================

const categoryIcons: Record<string, React.ReactNode> = {
  electronics: <Laptop className="h-6 w-6" />,
  clothing: <Shirt className="h-6 w-6" />,
  books: <BookOpen className="h-6 w-6" />,
  'home-garden': <Home className="h-6 w-6" />,
  'toys-games': <Gamepad2 className="h-6 w-6" />,
  'sports-outdoors': <Bike className="h-6 w-6" />,
  smartphones: <Smartphone className="h-6 w-6" />,
  accessories: <Watch className="h-6 w-6" />,
  furniture: <Sofa className="h-6 w-6" />,
  photography: <Camera className="h-6 w-6" />,
  audio: <Headphones className="h-6 w-6" />,
  fitness: <Dumbbell className="h-6 w-6" />,
};

// ============================================================
// HOMEPAGE COMPONENT
// ============================================================

export default function HomePage() {
  const { products, isLoading } = useProducts();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  // ✅ Featured products (first 6)
  const featuredProducts = products?.slice(0, 6) || [];

  // ✅ Trending products (next 4)
  const trendingProducts = products?.slice(6, 10) || [];

  // ✅ Top selling products (simulated - based on rating or stock)
  const topSellingProducts = products?.filter(p => p.stock < 20).slice(0, 4) || [];

  // ============================================================
  // STATS
  // ============================================================

  const stats = [
    { label: 'Happy Customers', value: '10K+', icon: Users },
    { label: 'Products Sold', value: '50K+', icon: Package },
    { label: 'Awards Won', value: '12', icon: Award },
    { label: 'Support Hours', value: '24/7', icon: Headphones },
  ];

  // ============================================================
  // FEATURES
  // ============================================================

  const features = [
    {
      icon: ShoppingBag,
      title: 'Premium Products',
      description: 'Curated selection of high-quality items',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      icon: Truck,
      title: 'Fast Delivery',
      description: 'Get your orders delivered within 3-5 days',
      color: 'bg-green-50 text-green-600',
    },
    {
      icon: Shield,
      title: 'Secure Payment',
      description: 'Your transactions are safe and secure',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      icon: Clock,
      title: '24/7 Support',
      description: "We're here to help anytime",
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  // ============================================================
  // NEWSLETTER SUBSCRIPTION
  // ============================================================

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setIsSubscribing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Subscribed successfully!');
      setEmail('');
    } catch (error) {
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-16 pb-16">
      {/* ============================================================
          1. HERO SECTION – Dynamic & Animated
      ============================================================ */}
      <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-orange-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-16 md:py-24 px-6 md:px-12">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-orange-200/30 dark:bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-200/30 dark:bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-200/20 dark:bg-purple-500/5 rounded-full blur-3xl animate-pulse delay-2000" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              {/* Badge */}
              <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0 px-4 py-1.5 text-sm w-fit">
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                New Collection 2024
              </Badge>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Welcome to{' '}
                <span className="bg-linear-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                  SnapCart
                </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-lg">
                Discover amazing products at great prices. Shop the latest trends today!
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/products">
                  <Button size="lg" className="gap-2 group">
                    Start Shopping
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/categories">
                  <Button size="lg" variant="outline" className="gap-2">
                    Browse Categories
                    <MoveRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 pt-4">
                {stats.map((stat, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <stat.icon className="h-4 w-4 text-orange-500" />
                    <div>
                      <span className="font-bold">{stat.value}</span>
                      <span className="text-sm text-muted-foreground ml-1">
                        {stat.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right Content – Hero Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative flex justify-center"
            >
              <div className="relative w-full max-w-md aspect-square">
                <div className="absolute inset-0 bg-linear-to-br from-orange-200 to-orange-300 dark:from-orange-800 dark:to-orange-900 rounded-3xl rotate-6 scale-95" />
                <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 flex flex-col items-center justify-center">
                  <div className="text-7xl mb-4">🛍️</div>
                  <h3 className="text-2xl font-bold text-center">Shop Smarter</h3>
                  <p className="text-muted-foreground text-center text-sm max-w-xs">
                    Discover thousands of products at the best prices
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Badge className="bg-orange-100 text-orange-700">10K+ Products</Badge>
                    <Badge className="bg-blue-100 text-blue-700">Free Shipping</Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================================================
          2. FEATURES SECTION
      ============================================================ */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="text-center p-6 border rounded-xl hover:shadow-lg transition-all duration-300 group hover:-translate-y-1 bg-background"
            >
              <div className={cn("w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4", feature.color)}>
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg group-hover:text-orange-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ============================================================
          3. CATEGORIES SECTION – ✅ UPDATED WITH LUCIDE ICONS
      ============================================================ */}
      {!categoriesLoading && categories?.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Shop by Category</h2>
            <Link
              href="/categories"
              className="text-sm text-orange-500 hover:text-orange-600 flex items-center gap-1"
            >
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="group relative overflow-hidden rounded-xl border p-4 text-center hover:shadow-lg transition-all hover:-translate-y-1 bg-background"
              >
                <div className="flex items-center justify-center h-12 w-12 mx-auto mb-2 rounded-full bg-muted/50 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                  {categoryIcons[category.slug] || <Package className="h-6 w-6 text-muted-foreground group-hover:text-orange-600 transition-colors" />}
                </div>
                <h4 className="font-medium text-sm group-hover:text-orange-600 transition-colors">
                  {category.name}
                </h4>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============================================================
          4. FEATURED PRODUCTS
      ============================================================ */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <p className="text-sm text-muted-foreground">Handpicked just for you</p>
          </div>
          <Link href="/products">
            <Button variant="ghost" className="gap-2 group">
              View All <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-80 w-full rounded-xl" />
            ))}
          </div>
        ) : featuredProducts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No featured products available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ============================================================
          5. TRENDING PRODUCTS
      ============================================================ */}
      {trendingProducts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-500" />
                Trending Now
              </h2>
              <p className="text-sm text-muted-foreground">Most popular products this week</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trendingProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ============================================================
          6. TOP SELLING PRODUCTS
      ============================================================ */}
      {topSellingProducts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                Top Selling
              </h2>
              <p className="text-sm text-muted-foreground">Bestsellers you'll love</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {topSellingProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* ============================================================
    7. BRAND TRUST SECTION – SLIM & ELEGANT (FIXED)
=========================================================== */}
<section className="relative overflow-hidden rounded-2xl py-10 px-6 md:py-12 md:px-10">
  {/* Background */}
  <div className="absolute inset-0 bg-linear-to-r from-orange-500 to-orange-600" />
  
  {/* Subtle Accent Glow */}
  <div className="absolute -top-20 -right-20 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
  <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

  <div className="relative z-10 max-w-4xl mx-auto">
    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
      {/* Left Content */}
      <div className="text-center md:text-left">
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          Ready to Start Shopping?
        </h2>
        <p className="text-orange-50/80 text-sm md:text-base mt-1">
          Join thousands of happy customers
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Primary Button */}
        <Link href="/products">
          <Button 
            className="bg-white text-orange-600 hover:bg-orange-50 hover:text-orange-700 shadow-md hover:shadow-lg transition-all duration-300 px-6 py-2.5 text-sm font-semibold rounded-lg"
          >
            <span className="flex items-center gap-1.5">
              Shop Now
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Button>
        </Link>

        {/* Secondary Button – Dark Text (Alternative) */}
<Link href="/register">
  <Button 
    variant="outline" 
    className="border-white/30 bg-white text-orange-600 hover:bg-orange-50 hover:text-orange-700 transition-all duration-300 px-6 py-2.5 text-sm font-semibold rounded-lg shadow-sm"
  >
    <span className="flex items-center gap-1.5">
      Create Account
      <Rocket className="h-3.5 w-3.5" />
    </span>
  </Button>
</Link>
      </div>
    </div>

    {/* Trust Indicators – Slim */}
    <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 md:gap-6 mt-4 pt-4 border-t border-white/15">
      <span className="flex items-center gap-1.5 text-white/80 text-xs">
        <Shield className="h-3.5 w-3.5" />
        Secure Checkout
      </span>
      <span className="flex items-center gap-1.5 text-white/80 text-xs">
        <Truck className="h-3.5 w-3.5" />
        Free Returns
      </span>
      <span className="flex items-center gap-1.5 text-white/80 text-xs">
        <Star className="h-3.5 w-3.5 fill-white/30" />
        4.8/5 Rating
      </span>
    </div>
  </div>
</section>
    </div>
  );
}