// frontend/components/products/ProductForm.tsx
'use client';

import { useState, useEffect } from 'react';
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
import { Upload, X, Plus, Minus, Star, Image as ImageIcon } from 'lucide-react';
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

interface ProductImageItem {
  id: string;
  file?: File;
  previewUrl: string;
  isExisting: boolean;
}

const MAX_PRODUCT_IMAGES = 6;

export function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
  const { createProduct, updateProduct, createProductLoading, updateProductLoading } = useProducts();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const [images, setImages] = useState<ProductImageItem[]>(() => {
    const list: ProductImageItem[] = [];
    if (product?.imageUrl) {
      list.push({
        id: 'initial-main',
        previewUrl: product.imageUrl,
        isExisting: true,
      });
    }
    if (Array.isArray(product?.additionalImages)) {
      product.additionalImages.forEach((url, idx) => {
        if (url && url !== product?.imageUrl && !list.some((item) => item.previewUrl === url)) {
          list.push({
            id: `initial-add-${idx}`,
            previewUrl: url,
            isExisting: true,
          });
        }
      });
    }
    return list;
  });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (!img.isExisting && img.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(img.previewUrl);
        }
      });
    };
  }, [images]);

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
    onDrop: (acceptedFiles) => {
      if (!acceptedFiles || acceptedFiles.length === 0) return;

      const remainingSlots = MAX_PRODUCT_IMAGES - images.length;
      if (remainingSlots <= 0) {
        toast.warning(`Maximum ${MAX_PRODUCT_IMAGES} images allowed.`);
        return;
      }

      const filesToAdd = acceptedFiles.slice(0, remainingSlots);
      if (acceptedFiles.length > remainingSlots) {
        toast.info(`Added ${remainingSlots} images. Maximum limit is ${MAX_PRODUCT_IMAGES}.`);
      }

      const newItems: ProductImageItem[] = filesToAdd.map((file) => ({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        isExisting: false,
      }));

      setImages((prev) => [...prev, ...newItems]);
    },
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.avif'],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: true,
  });

  const removeImage = (indexToRemove: number) => {
    setImages((prev) => {
      const item = prev[indexToRemove];
      if (item && !item.isExisting && item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  const setAsPrimary = (indexToPromote: number) => {
    if (indexToPromote === 0) return;
    setImages((prev) => {
      const item = prev[indexToPromote];
      const rest = prev.filter((_, idx) => idx !== indexToPromote);
      return [item, ...rest];
    });
    toast.success('Set as primary cover image');
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
      // 1. Separate new files from already uploaded URLs
      const newFileItems = images.filter((img) => !img.isExisting && img.file);
      const uploadedMap = new Map<string, string>();

      if (newFileItems.length > 0) {
        const formData = new FormData();
        newFileItems.forEach((item) => {
          formData.append('images', item.file!);
        });

        const interval = setInterval(() => {
          setUploadProgress((prev) => (prev >= 85 ? 85 : prev + 10));
        }, 150);

        try {
          const res = await apiClient.post(
            '/files/upload-multiple?folder=snapcart/products',
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          );

          clearInterval(interval);
          setUploadProgress(95);

          const returnedUrls: string[] = res.data?.urls || res.data?.data?.urls || [];
          if (!returnedUrls || returnedUrls.length === 0) {
            throw new Error('No URLs returned from upload service');
          }

          newFileItems.forEach((item, idx) => {
            if (returnedUrls[idx]) {
              uploadedMap.set(item.id, returnedUrls[idx]);
            }
          });
        } catch (uploadError: any) {
          clearInterval(interval);
          setUploadProgress(0);
          throw new Error(uploadError?.response?.data?.message || 'Failed to upload images');
        }
      }

      // 2. Reconstruct final ordered list of URLs
      const finalUrls: string[] = [];
      images.forEach((img) => {
        if (img.isExisting) {
          finalUrls.push(img.previewUrl);
        } else if (uploadedMap.has(img.id)) {
          finalUrls.push(uploadedMap.get(img.id)!);
        }
      });

      const primaryImageUrl = finalUrls[0] || '';
      const additionalImages = finalUrls.length > 1 ? finalUrls.slice(1) : [];

      const productData = {
        title: values.title,
        price: Number(values.price),
        description: values.description || '',
        stock: Number(values.stock),
        imageUrl: primaryImageUrl,
        additionalImages: additionalImages,
        categoryId: Number(values.categoryId),
        isActive: values.isActive ?? true,
        isTrending: values.isTrending ?? false,
        isNew: values.isNew ?? false,
        compareAtPrice: values.compareAtPrice ? Number(values.compareAtPrice) : undefined,
        sku: values.sku || undefined,
      };

      if (product) {
        await updateProduct({ id: product.id, data: productData });
        toast.success('Product updated successfully');
      } else {
        await createProduct(productData);
        toast.success('Product created successfully');
      }

      form.reset();
      setImages([]);
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
        {/* Multi-Image Upload & Preview Section */}
        <FormItem>
          <div className="flex items-center justify-between mb-2">
            <div>
              <FormLabel className="text-sm font-semibold">Product Photos</FormLabel>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload up to {MAX_PRODUCT_IMAGES} images. The first image is your primary catalog cover.
              </p>
            </div>
            {images.length > 0 && images.length < MAX_PRODUCT_IMAGES && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-full text-xs gap-1 cursor-pointer"
                onClick={() => openFileDialog()}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Photos
              </Button>
            )}
          </div>

          {images.length === 0 ? (
            <div
              {...getRootProps()}
              className={cn(
                'relative border-2 border-dashed rounded-xl py-7 px-6 text-center cursor-pointer transition-colors',
                isDragActive
                  ? 'border-orange-500 bg-orange-50/10'
                  : 'border-border/80 hover:border-orange-400 hover:bg-muted/30'
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10 text-orange-600 dark:bg-orange-950/40">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {isDragActive ? 'Drop images here' : 'Click to browse or drag & drop product photos'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Select multiple files • PNG, JPG, WebP, AVIF up to 5MB each (Max {MAX_PRODUCT_IMAGES})
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((item, index) => (
                  <div
                    key={item.id}
                    className={cn(
                      'group relative aspect-square rounded-xl overflow-hidden border bg-background shadow-xs transition-all',
                      index === 0
                        ? 'border-orange-500 ring-2 ring-orange-500/25'
                        : 'border-border hover:border-muted-foreground/40'
                    )}
                  >
                    <Image
                      src={item.previewUrl}
                      alt={`Product preview ${index + 1}`}
                      fill
                      className="object-cover"
                    />

                    {/* Primary Badge or Make Cover Button */}
                    {index === 0 ? (
                      <div className="absolute top-2 left-2 z-10">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-bold shadow-xs">
                          <Star className="h-3 w-3 fill-white" />
                          Cover
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAsPrimary(index);
                        }}
                        className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/75 hover:bg-black text-white text-[10px] font-medium backdrop-blur-sm cursor-pointer"
                        title="Set as main cover photo"
                      >
                        Make Cover
                      </button>
                    )}

                    {/* Remove Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1.5 right-1.5 z-10 h-6 w-6 rounded-full bg-black/60 hover:bg-red-600 text-white shadow-xs opacity-80 group-hover:opacity-100 transition-all cursor-pointer p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(index);
                      }}
                      title="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>

                    {/* Index Indicator */}
                    <span className="absolute bottom-1.5 right-1.5 z-10 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white tabular-nums backdrop-blur-sm">
                      #{index + 1}
                    </span>
                  </div>
                ))}

                {/* Additional slot if under limit */}
                {images.length < MAX_PRODUCT_IMAGES && (
                  <div
                    {...getRootProps()}
                    className={cn(
                      'flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed cursor-pointer transition-colors p-2 text-center',
                      isDragActive
                        ? 'border-orange-500 bg-orange-50/10'
                        : 'border-border/80 hover:border-orange-400 hover:bg-muted/30'
                    )}
                  >
                    <input {...getInputProps()} />
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground mb-1">
                      <Plus className="h-4 w-4" />
                    </div>
                    <span className="text-[11px] font-medium text-foreground">
                      Add Photo
                    </span>
                    <span className="text-[9px] text-muted-foreground">
                      {MAX_PRODUCT_IMAGES - images.length} left
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {uploading && (
            <div className="space-y-1.5 mt-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3">
              <div className="flex justify-between text-xs font-medium text-foreground">
                <span>Uploading product photos to Cloudinary...</span>
                <span className="tabular-nums">{uploadProgress}%</span>
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