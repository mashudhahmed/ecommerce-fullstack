'use client';

import { useProducts } from '@/hooks/useProducts';
import { ProductList } from '@/components/products/ProductList';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function ProductsPage() {
  const { products, isLoading } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products?.filter((product) =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Products</h1>
        <div className="w-64">
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <ProductList products={filteredProducts || []} isLoading={isLoading} />
    </div>
  );
}