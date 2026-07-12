// components/categories/CategoryForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { Category } from '@/types';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategories } from '@/hooks/useCategories';

// ============================================================
// SCHEMA
// ============================================================

const categoryFormSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s\-&]+$/, 'Name contains invalid characters'),
  
  description: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .default(''),
  
  parentId: z.number().nullable().default(null),
  
  sortOrder: z.number()
    .min(0, 'Sort order must be 0 or greater')
    .default(0),
  
  isActive: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

// ============================================================
// PROPS
// ============================================================

interface CategoryFormProps {
  category?: Category | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ============================================================
// CATEGORY FORM
// ============================================================

export function CategoryForm({ category, onSuccess, onCancel }: CategoryFormProps) {
  const { categories, createCategory, updateCategory, createCategoryLoading, updateCategoryLoading } = useCategories();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(category?.imageUrl || '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ✅ Fix: Use type assertion to resolve the type mismatch
  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema) as any,
    defaultValues: {
      name: category?.name || '',
      description: category?.description || '',
      parentId: category?.parentId ?? null,
      sortOrder: category?.sortOrder ?? 0,
      isActive: category?.isActive ?? true,
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      const file = files[0];
      if (file) {
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
      }
    },
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.avif'],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  });

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const isLoading = createCategoryLoading || updateCategoryLoading || uploading;

  const onSubmit = async (data: CategoryFormData) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      let imageUrl = category?.imageUrl;

      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);

        const interval = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        const response = await fetch(`${apiUrl}/files/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        clearInterval(interval);
        setUploadProgress(100);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Image upload failed');
        }

        const result = await response.json();
        imageUrl = result.url;
      }

      const categoryData = {
        name: data.name,
        description: data.description || '',
        imageUrl: imageUrl || '',
        parentId: data.parentId ?? undefined,
        sortOrder: data.sortOrder || 0,
        isActive: data.isActive ?? true,
      };

      if (category) {
        await updateCategory({ id: category.id, data: categoryData });
        toast.success('Category updated successfully');
      } else {
        await createCategory(categoryData);
        toast.success('Category created successfully');
      }

      form.reset();
      setImageFile(null);
      setImagePreview('');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save category');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const parentOptions = categories.filter((cat) => cat.id !== category?.id);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormItem>
          <FormLabel>Category Image</FormLabel>
          <div
            {...getRootProps()}
            className={cn(
              'relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50',
              imagePreview && 'border-green-500'
            )}
          >
            <input {...getInputProps()} />
            {imagePreview ? (
              <div className="relative aspect-square max-w-50 mx-auto">
                <Image
                  src={imagePreview}
                  alt="Category preview"
                  fill
                  className="object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage();
                  }}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {isDragActive ? 'Drop image here' : 'Click or drag to upload'}
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, WebP, AVIF (max 5MB)
                </p>
              </div>
            )}
          </div>
          {uploading && <Progress value={uploadProgress} className="h-2" />}
          <FormMessage />
        </FormItem>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name *</FormLabel>
              <FormControl>
                <Input placeholder="Category name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parentId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Category</FormLabel>
              <FormControl>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    field.onChange(value ? Number(value) : null);
                  }}
                >
                  <option value="">None (Root Category)</option>
                  {parentOptions.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Category description"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sortOrder"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sort Order</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Active</FormLabel>
                <p className="text-sm text-muted-foreground">
                  Inactive categories will not be visible to customers
                </p>
              </div>
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading
              ? category ? 'Updating...' : 'Creating...'
              : category ? 'Update Category' : 'Create Category'}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}