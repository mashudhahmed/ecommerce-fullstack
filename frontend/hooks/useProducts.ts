// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/product.service';
import { Product } from '@/types';
import { fallbackProducts } from '@/lib/fallback-products';

export function useProducts() {
  const queryClient = useQueryClient();

  // ============================================================
  // QUERIES
  // ============================================================

  // ✅ Primary product list – with fallback data
  const {
    data: products = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      try {
        const result = await productService.getProducts();
        // If result is an array and not empty, use it; otherwise fallback
        if (Array.isArray(result) && result.length > 0) {
          return result;
        }
        console.log('ℹ️ No products from API, using fallback data');
        return fallbackProducts;
      } catch (err) {
        console.error('❌ Error fetching products, using fallback:', err);
        return fallbackProducts;
      }
    },
    throwOnError: false,
    staleTime: 5 * 60 * 1000,
    initialData: fallbackProducts, // Show immediately while fetching
  });

  // ✅ In-stock products
  const { data: inStockProducts = [] } = useQuery({
    queryKey: ['products', 'in-stock'],
    queryFn: async (): Promise<Product[]> => {
      try {
        const result = await productService.getInStockProducts();
        return Array.isArray(result) && result.length > 0 ? result : fallbackProducts;
      } catch (err) {
        console.error('❌ Error fetching in-stock products:', err);
        return fallbackProducts;
      }
    },
    throwOnError: false,
    initialData: fallbackProducts,
  });

  // ✅ Low-stock products
  const { data: lowStockProducts = [] } = useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: async (): Promise<Product[]> => {
      try {
        const result = await productService.getLowStockProducts();
        return Array.isArray(result) && result.length > 0 ? result : [];
      } catch (err) {
        console.error('❌ Error fetching low-stock products:', err);
        return [];
      }
    },
    throwOnError: false,
    initialData: [],
  });

  // ✅ Get a single product
  const getProduct = async (id: number): Promise<Product | null> => {
    try {
      return await productService.getProduct(id);
    } catch (error) {
      console.error(`❌ Error fetching product ${id}:`, error);
      return null;
    }
  };

  // ============================================================
  // MUTATIONS
  // ============================================================

  const createProductMutation = useMutation({
    mutationFn: productService.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'in-stock'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'low-stock'] });
    },
    onError: (error: any) => {
      console.error('❌ Error creating product:', error);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      productService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'in-stock'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'low-stock'] });
    },
    onError: (error: any) => {
      console.error('❌ Error updating product:', error);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: productService.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'in-stock'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'low-stock'] });
    },
    onError: (error: any) => {
      console.error('❌ Error deleting product:', error);
    },
  });

  // ============================================================
  // RETURN
  // ============================================================

  return {
    // Data
    products,
    isLoading,
    error,
    refetch,
    inStockProducts,
    lowStockProducts,

    // Single product
    getProduct,

    // Mutations
    createProduct: createProductMutation.mutateAsync,
    createProductLoading: createProductMutation.isPending,

    updateProduct: updateProductMutation.mutateAsync,
    updateProductLoading: updateProductMutation.isPending,

    deleteProduct: deleteProductMutation.mutateAsync,
    deleteProductLoading: deleteProductMutation.isPending,
  };
}