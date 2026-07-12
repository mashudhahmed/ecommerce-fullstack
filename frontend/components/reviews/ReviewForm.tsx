// components/reviews/ReviewForm.tsx
'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { useReviews } from '@/hooks/useReviews';
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
import { StarRating } from '@/components/ui/star-rating';
import { Progress } from '@/components/ui/progress';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating'),
  title: z.string().optional(),
  comment: z.string().min(10, 'Comment must be at least 10 characters'),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  productId: number;
  onSuccess?: () => void;
  initialData?: {
    id?: number;
    rating?: number;
    title?: string;
    comment?: string;
    images?: string[];
  };
}

export function ReviewForm({ productId, onSuccess, initialData }: ReviewFormProps) {
  const { createReview, createLoading } = useReviews(productId);
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [uploadedImages, setUploadedImages] = useState<string[]>(initialData?.images || []);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: initialData?.rating || 0,
      title: initialData?.title || '',
      comment: initialData?.comment || '',
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      const remainingSlots = MAX_IMAGES - uploadedImages.length - newImageFiles.length;
      if (files.length > remainingSlots) {
        toast.error(`You can upload a maximum of ${MAX_IMAGES} images`);
        return;
      }

      // Validate file size
      const oversized = files.filter((f) => f.size > MAX_FILE_SIZE);
      if (oversized.length > 0) {
        toast.error(`Some files exceed the 5MB limit`);
        return;
      }

      setNewImageFiles((prev) => [...prev, ...files]);
    },
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.avif'],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    disabled: isUploading || createLoading,
  });

  const removeNewImage = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = useCallback(async (): Promise<string[]> => {
    if (newImageFiles.length === 0) return uploadedImages;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      newImageFiles.forEach((file) => {
        formData.append('images', file);
      });

      // Use the existing review endpoint with multipart
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      
      const xhr = new XMLHttpRequest();
      
      const uploadPromise = new Promise<string[]>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.onload = () => {
          if (xhr.status === 201 || xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            const imageUrls = response.data?.images || response.images || [];
            const allImages = [...uploadedImages, ...imageUrls];
            resolve(allImages);
          } else {
            reject(new Error('Upload failed'));
          }
        };

        xhr.onerror = () => reject(new Error('Network error'));

        // For new review, we need to create the review first then add images
        // For simplicity, we'll return the uploaded URLs
        // The actual review creation will be handled by the backend
        const url = `${apiUrl}/files/upload`;
        xhr.open('POST', url);
        xhr.withCredentials = true;
        xhr.send(formData);
      });

      const results = await uploadPromise;
      return results;
    } catch (error: any) {
      toast.error(`Failed to upload images: ${error.message}`);
      return uploadedImages;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [newImageFiles, uploadedImages]);

  const onSubmit = async (data: ReviewFormData) => {
    try {
      // Upload images first
      const uploadedUrls = await uploadImages();
      
      // Create review with image URLs
      await createReview({
        productId,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        images: uploadedUrls,
      });

      form.reset();
      setRating(0);
      setUploadedImages([]);
      setNewImageFiles([]);
      onSuccess?.();
    } catch (error: any) {
      // Error handled in hook
      console.error('Failed to submit review:', error);
    }
  };

  const totalImages = uploadedImages.length + newImageFiles.length;
  const remainingSlots = MAX_IMAGES - totalImages;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating *</FormLabel>
              <FormControl>
                <StarRating
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    setRating(value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Summary of your review" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Review *</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share your experience with this product..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Image Upload */}
        <FormItem>
          <FormLabel>Images (Optional - Max {MAX_IMAGES})</FormLabel>
          
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50',
              (isUploading || createLoading || remainingSlots <= 0) && 'pointer-events-none opacity-50'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">
              {isDragActive ? 'Drop images here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {remainingSlots} of {MAX_IMAGES} slots remaining
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WebP, AVIF (max 5MB each)
            </p>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">
                Uploading images... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Existing Images */}
          {uploadedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {uploadedImages.map((url, index) => (
                <div key={`existing-${index}`} className="relative group">
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden border bg-muted/20">
                    <Image
                      src={url}
                      alt={`Review image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeExistingImage(index)}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    disabled={isUploading || createLoading}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* New Images */}
          {newImageFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {newImageFiles.map((file, index) => (
                <div key={`new-${index}`} className="relative group">
                  <div className="relative h-16 w-16 rounded-lg overflow-hidden border bg-muted/20">
                    <Image
                      src={URL.createObjectURL(file)}
                      alt={`New image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeNewImage(index)}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                    disabled={isUploading || createLoading}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <FormMessage />
        </FormItem>

        <Button type="submit" disabled={createLoading || isUploading} className="w-full">
          {createLoading || isUploading ? 'Submitting...' : initialData?.id ? 'Update Review' : 'Submit Review'}
        </Button>
      </form>
    </Form>
  );
}