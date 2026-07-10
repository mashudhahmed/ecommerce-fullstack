import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService, Category } from '@/services/category.service';
import { toast } from 'sonner';

export function useCategories() {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoryService.getCategories,
  });

  const { data: categoryTree = [] } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: categoryService.getCategoryTree,
  });

  const createCategoryMutation = useMutation({
    mutationFn: categoryService.createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'tree'] });
      toast.success('Category created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create category');
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      categoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'tree'] });
      toast.success('Category updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update category');
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: categoryService.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories', 'tree'] });
      toast.success('Category deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete category');
    },
  });

  return {
    categories,
    categoryTree,
    isLoading,
    createCategory: createCategoryMutation.mutateAsync,
    createCategoryLoading: createCategoryMutation.isPending,
    updateCategory: updateCategoryMutation.mutateAsync,
    updateCategoryLoading: updateCategoryMutation.isPending,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    deleteCategoryLoading: deleteCategoryMutation.isPending,
  };
}