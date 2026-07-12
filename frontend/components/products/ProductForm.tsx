// frontend/components/products/ProductForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { productSchema, type ProductInput } from '@/validations/schemas';
import { useProducts } from '@/hooks/useProducts';
import { Product } from '@/types';
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
import { Progress } from '@/components/ui/progress';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategories } from '@/hooks/useCategories';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProductFormProps {
  product?: Product | null;
  onSuccess?: () => void;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const { createProduct, updateProduct, createProductLoading, updateProductLoading } = useProducts();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(product?.imageUrl || '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      title: product?.title || '',
      price: product?.price || 0,
      description: product?.description || '',
      stock: product?.stock || 0,
      imageUrl: product?.imageUrl || '',
      categoryId: product?.category?.id ?? undefined,
      compareAtPrice: undefined,
      sku: '',
      isActive: true,
      isTrending: false,
      isNew: false,
      additionalImages: [],
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

  const isLoading = createProductLoading || updateProductLoading || uploading;

  const onSubmit = async (values: ProductInput) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      let imageUrl = product?.imageUrl;

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
          throw new Error(error.message || 'Upload failed');
        }

        const result = await response.json();
        imageUrl = result.url;
      }

      // ✅ Fix: Properly handle compareAtPrice
      // Check if it's a valid positive number
      const productData = {
        title: values.title,
        price: values.price,
        description: values.description || '',
        stock: values.stock,
        imageUrl: imageUrl || '',
        categoryId: values.categoryId,
        compareAtPrice: typeof values.compareAtPrice === 'number' && values.compareAtPrice > 0 
          ? values.compareAtPrice 
          : undefined,
        sku: values.sku ?? '',
        isActive: values.isActive ?? true,
        isTrending: values.isTrending ?? false,
        isNew: values.isNew ?? false,
        additionalImages: values.additionalImages ?? [],
      };

      if (product) {
        await updateProduct({ id: product.id, data: productData });
        toast.success('Product updated successfully');
      } else {
        await createProduct(productData);
        toast.success('Product created successfully');
      }

      form.reset();
      setImageFile(null);
      setImagePreview('');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save product');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormItem>
          <FormLabel>Product Image</FormLabel>
          <div
            {...getRootProps()}
            className={cn(
              "relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50",
              imagePreview && "border-green-500"
            )}
          >
            <input {...getInputProps()} />
            {imagePreview ? (
              <div className="relative aspect-square max-w-50 mx-auto">
                <Image
                  src={imagePreview}
                  alt="Preview"
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="Product title" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category *</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value ? Number(value) : undefined)}
                value={field.value?.toString() ?? ''}
                disabled={categoriesLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="19.99"
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
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="100"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Product description" rows={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading
            ? product
              ? 'Updating...'
              : 'Creating...'
            : product
            ? 'Update Product'
            : 'Create Product'}
        </Button>
      </form>
    </Form>
  );
}