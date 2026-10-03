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
import { Upload, X, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
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
  onCancel?: () => void;
}

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const { createProduct, updateProduct, createProductLoading, updateProductLoading } = useProducts();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>(product?.imageUrl || '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Dedicated string state for smooth decimal typing in price field
  const [priceInput, setPriceInput] = useState<string>(
    product?.price !== undefined ? String(product.price) : ''
  );

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      title: product?.title || '',
      price: product?.price || ('' as any),
      description: product?.description || '',
      stock: product?.stock !== undefined ? product.stock : 0,
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

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
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
    noClick: Boolean(imagePreview), // disable clicking container if preview is active (use Replace button instead)
  });

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    form.setValue('imageUrl', '');
  };

  const handlePriceChange = (val: string) => {
    // Allow digits and up to 2 decimal places
    if (val === '' || /^\d*\.?\d{0,2}$/.test(val)) {
      setPriceInput(val);
      if (val === '') {
        form.setValue('price', '' as any, { shouldValidate: true });
      } else {
        const num = parseFloat(val);
        if (!isNaN(num)) {
          form.setValue('price', num, { shouldValidate: true });
        }
      }
    }
  };

  const handlePriceBlur = () => {
    if (priceInput && !isNaN(parseFloat(priceInput))) {
      const formatted = parseFloat(priceInput).toFixed(2);
      setPriceInput(formatted);
      form.setValue('price', parseFloat(formatted), { shouldValidate: true });
    }
  };

  const handleStockChange = (val: string) => {
    if (val === '') {
      form.setValue('stock', 0, { shouldValidate: true });
      return;
    }
    const intVal = parseInt(val, 10);
    if (!isNaN(intVal) && intVal >= 0) {
      form.setValue('stock', intVal, { shouldValidate: true });
    }
  };

  const incrementStock = () => {
    const current = Number(form.getValues('stock')) || 0;
    form.setValue('stock', current + 1, { shouldValidate: true, shouldDirty: true });
  };

  const decrementStock = () => {
    const current = Number(form.getValues('stock')) || 0;
    form.setValue('stock', Math.max(0, current - 1), { shouldValidate: true, shouldDirty: true });
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
          setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
        }, 100);

        try {
          const res = await apiClient.post('/files/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          clearInterval(interval);
          setUploadProgress(100);

          imageUrl = res.data?.data?.url || res.data?.url;
        } catch (uploadError) {
          clearInterval(interval);
          setUploadProgress(0);
          throw new Error('Failed to upload image');
        }
      }

      const productData = {
        title: values.title,
        price: Number(values.price),
        description: values.description || '',
        stock: Number(values.stock),
        imageUrl: imageUrl || '',
        categoryId: values.categoryId,
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Compact Image Upload Preview Card */}
        <FormItem>
          <FormLabel>Product Image</FormLabel>
          <div {...getRootProps()}>
            <input {...getInputProps()} />
            {imagePreview ? (
              <div className="flex items-center gap-3.5 p-3 rounded-xl border border-border bg-muted/30">
                <div className="relative h-16 w-16 shrink-0 rounded-lg overflow-hidden border border-border/80 bg-background shadow-xs">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground">
                    {imageFile?.name || 'Selected product image'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {imageFile
                      ? `${(imageFile.size / 1024 / 1024).toFixed(2)} MB • Ready to upload`
                      : 'Active catalog image'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-full text-xs cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      openFileDialog();
                    }}
                  >
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage();
                    }}
                    title="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  'relative border-2 border-dashed rounded-xl py-4 px-6 text-center cursor-pointer transition-colors',
                  isDragActive
                    ? 'border-orange-500 bg-orange-50/10'
                    : 'border-border/80 hover:border-orange-400 hover:bg-muted/30'
                )}
              >
                <div className="flex flex-col items-center justify-center gap-1">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-semibold text-foreground">
                    {isDragActive ? 'Drop image here' : 'Click to browse or drag & drop image'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    PNG, JPG, WebP, AVIF up to 5MB
                  </p>
                </div>
              </div>
            )}
          </div>
          {uploading && (
            <div className="space-y-1 mt-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading image...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          )}
          <FormMessage />
        </FormItem>

        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <Input placeholder="Product title" className="rounded-xl" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category */}
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
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-xl">
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

        {/* Price & Stock Fields (Typeable + Stepper Controls) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={() => (
              <FormItem>
                <FormLabel>Price ($) *</FormLabel>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm select-none">
                      $
                    </span>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="pl-8 font-semibold rounded-xl"
                      value={priceInput}
                      onChange={(e) => handlePriceChange(e.target.value)}
                      onBlur={handlePriceBlur}
                    />
                  </div>
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
                <FormLabel>Stock Quantity *</FormLabel>
                <FormControl>
                  <div className="flex items-center rounded-xl border border-input bg-background shadow-xs focus-within:ring-2 focus-within:ring-ring overflow-hidden">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-none border-r text-muted-foreground hover:bg-muted cursor-pointer"
                      onClick={decrementStock}
                      disabled={Number(field.value) <= 0}
                      title="Decrease stock"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      className="h-9 border-0 text-center font-semibold shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={field.value ?? 0}
                      onChange={(e) => handleStockChange(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 rounded-none border-l text-muted-foreground hover:bg-muted cursor-pointer"
                      onClick={incrementStock}
                      title="Increase stock"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Product description and key specifications"
                  rows={3}
                  className="rounded-xl resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Sticky Actions Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-end gap-3 sticky bottom-0 bg-background/95 backdrop-blur-xs py-2">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-5 cursor-pointer"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            className="rounded-full bg-zinc-950 text-white hover:bg-zinc-800 px-6 cursor-pointer"
            disabled={isLoading}
          >
            {isLoading
              ? product
                ? 'Updating…'
                : 'Creating…'
              : product
              ? 'Update Product'
              : 'Create Product'}
          </Button>
        </div>
      </form>
    </Form>
  );
}