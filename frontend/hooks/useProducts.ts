import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/product.service';
import { Product } from '@/types';

export function useProducts() {
  const queryClient = useQueryClient();

  const { data: products = [], isLoading, error, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      try {
        const result = await productService.getProducts();
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error('Error fetching products:', err);
        return [];
      }
    },
    throwOnError: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: inStockProducts = [] } = useQuery({
    queryKey: ['products', 'in-stock'],
    queryFn: async (): Promise<Product[]> => {
      try {
        const result = await productService.getInStockProducts();
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error('Error fetching in-stock products:', err);
        return [];
      }
    },
    throwOnError: false,
  });

  const { data: lowStockProducts = [] } = useQuery({
    queryKey: ['products', 'low-stock'],
    queryFn: async (): Promise<Product[]> => {
      try {
        const result = await productService.getLowStockProducts();
        return Array.isArray(result) ? result : [];
      } catch (err) {
        console.error('Error fetching low-stock products:', err);
        return [];
      }
    },
    throwOnError: false,
  });

  // ✅ Get a single product (with fallback)
  const getProduct = async (id: number): Promise<Product | null> => {
    try {
      return await productService.getProduct(id);
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      return null;
    }
  };

  const createProductMutation = useMutation({
    mutationFn: productService.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'in-stock'] });
      queryClient.invalidateQueries({ queryKey: ['products', 'low-stock'] });
    },
    onError: (error: any) => {
      console.error('Error creating product:', error);
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
      console.error('Error updating product:', error);
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
      console.error('Error deleting product:', error);
    },
  });

  return {
    products,
    isLoading,
    error,
    refetch,
    inStockProducts,
    lowStockProducts,
    getProduct,
    createProduct: createProductMutation.mutateAsync,
    createProductLoading: createProductMutation.isPending,
    updateProduct: updateProductMutation.mutateAsync,
    updateProductLoading: updateProductMutation.isPending,
    deleteProduct: deleteProductMutation.mutateAsync,
    deleteProductLoading: deleteProductMutation.isPending,
  };
}