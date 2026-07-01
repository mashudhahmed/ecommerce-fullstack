'use client';

import Link from 'next/link';
import { useProducts } from '@/hooks/useProducts';
import { ProductList } from '@/components/products/ProductList';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShoppingBag, Truck, Shield, Clock } from 'lucide-react';

export default function HomePage() {
  const { products, isLoading } = useProducts();
  const featuredProducts = products?.slice(0, 4);

  const features = [
    {
      icon: ShoppingBag,
      title: 'Premium Products',
      description: 'Curated selection of high-quality items',
    },
    {
      icon: Truck,
      title: 'Fast Delivery',
      description: 'Get your orders delivered within 3-5 days',
    },
    {
      icon: Shield,
      title: 'Secure Payment',
      description: 'Your transactions are safe and secure',
    },
    {
      icon: Clock,
      title: '24/7 Support',
      description: 'We\'re here to help anytime',
    },
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-12 gradient-to-r from-primary/5 to-primary/10 rounded-2xl">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Welcome to Our Store
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Discover amazing products at great prices. Shop the latest trends today!
        </p>
        <Link href="/products">
          <Button size="lg" className="gap-2">
            Start Shopping <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </section>

      {/* Features Section */}
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div key={feature.title} className="text-center p-6 border rounded-lg">
              <feature.icon className="h-12 w-12 mx-auto text-primary mb-4" />
              <h3 className="font-semibold text-lg">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Featured Products</h2>
          <Link href="/products">
            <Button variant="ghost" className="gap-2">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <ProductList products={featuredProducts || []} isLoading={isLoading} />
      </section>
    </div>
  );
}