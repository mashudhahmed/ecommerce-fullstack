// frontend/components/products/MultiImageUpload.tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, Image as ImageIcon, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// ============================================================
// TYPES
// ============================================================

interface UploadedImage {
  id: string;
  file: File | null;
  preview: string;
  url?: string;
  publicId?: string;
  isUploading: boolean;
  progress: number;
  error?: string;
}

// ============================================================
// PROPS
// ============================================================

interface MultiImageUploadProps {
  initialImages?: string[];
  maxFiles?: number;
  maxSize?: number;
  accept?: Record<string, string[]>;
  onImagesChange?: (images: string[]) => void;
  onUploadComplete?: (uploadedImages: UploadedImage[]) => void;
  className?: string;
}

// ============================================================
// MULTI-IMAGE UPLOAD
// ============================================================

export function MultiImageUpload({
  initialImages = [],
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024,
  accept = {
    'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.avif', '.gif'],
  },
  onImagesChange,
  onUploadComplete,
  className,
}: MultiImageUploadProps) {
  const [images, setImages] = useState<UploadedImage[]>(
    initialImages.map((url, index) => ({
      id: `initial-${index}`,
      file: null,
      preview: url,
      url,
      isUploading: false,
      progress: 100,
    }))
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const remainingSlots = maxFiles - images.length;

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > remainingSlots) {
        toast.error(`You can upload a maximum of ${maxFiles} images`);
        return;
      }

      const newImages: UploadedImage[] = acceptedFiles.map((file) => ({
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
        isUploading: false,
        progress: 0,
      }));

      setImages((prev) => [...prev, ...newImages]);
      setIsDragging(false);

      // Auto-upload
      uploadImages([...images, ...newImages]);
    },
    [images, remainingSlots, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: true,
    disabled: isUploading || remainingSlots <= 0,
  });

  const uploadImages = async (allImages: UploadedImage[]) => {
    const newImages = allImages.filter((img) => !img.url && !img.isUploading);
    if (newImages.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    let completed = 0;
    const uploaded: UploadedImage[] = [];

    for (const image of newImages) {
      try {
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id ? { ...img, isUploading: true, progress: 0 } : img
          )
        );

        const formData = new FormData();
        formData.append('file', image.file!);

        const response = await fetch(`${apiUrl}/files/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Upload failed');
        }

        const result = await response.json();

        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? {
                  ...img,
                  url: result.url,
                  publicId: result.publicId,
                  isUploading: false,
                  progress: 100,
                }
              : img
          )
        );

        uploaded.push({
          ...image,
          url: result.url,
          publicId: result.publicId,
          isUploading: false,
          progress: 100,
        });

        completed++;
        setUploadProgress(Math.round((completed / newImages.length) * 100));
      } catch (error: any) {
        setImages((prev) =>
          prev.map((img) =>
            img.id === image.id
              ? { ...img, isUploading: false, error: error.message }
              : img
          )
        );
        toast.error(`Failed to upload ${image.file?.name}: ${error.message}`);
      }
    }

    setIsUploading(false);

    const uploadedUrls = images
      .filter((img) => img.url)
      .map((img) => img.url as string);

    onImagesChange?.(uploadedUrls);
    onUploadComplete?.(
      images.filter((img) => img.url).map((img) => ({
        ...img,
        url: img.url as string,
      }))
    );
  };

  const removeImage = (id: string) => {
    const image = images.find((img) => img.id === id);
    if (image?.preview && !image.url) {
      URL.revokeObjectURL(image.preview);
    }
    setImages((prev) => prev.filter((img) => img.id !== id));

    const uploadedUrls = images
      .filter((img) => img.id !== id && img.url)
      .map((img) => img.url as string);
    onImagesChange?.(uploadedUrls);
  };

  const reorderImages = (startIndex: number, endIndex: number) => {
    const result = Array.from(images);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    setImages(result);

    const uploadedUrls = result.filter((img) => img.url).map((img) => img.url as string);
    onImagesChange?.(uploadedUrls);
  };

  const retryUpload = (id: string) => {
    const image = images.find((img) => img.id === id);
    if (image) {
      setImages((prev) =>
        prev.map((img) =>
          img.id === id ? { ...img, error: undefined, isUploading: false, progress: 0 } : img
        )
      );
      uploadImages([...images]);
    }
  };

  const getImageUrl = (image: UploadedImage): string => {
    return image.url || image.preview || '/placeholder-image.png';
  };

  const totalUploaded = images.filter((img) => img.url).length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50',
          (isUploading || remainingSlots <= 0) && 'pointer-events-none opacity-50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
        <p className="mt-2 text-sm font-medium">
          {isDragActive ? 'Drop images here' : 'Drag & drop or click to upload'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {remainingSlots} of {maxFiles} slots remaining
        </p>
        <p className="text-xs text-muted-foreground">
          PNG, JPG, WebP, AVIF, GIF (max {Math.round(maxSize / 1024 / 1024)}MB each)
        </p>
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-sm text-muted-foreground text-center">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <DragDropContext onDragEnd={(result) => {
          if (!result.destination) return;
          reorderImages(result.source.index, result.destination.index);
        }}>
          <Droppable droppableId="images" direction="horizontal">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
              >
                {images.map((image, index) => (
                  <Draggable key={image.id} draggableId={image.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          'relative aspect-square group rounded-lg overflow-hidden border bg-muted/20',
                          snapshot.isDragging && 'shadow-lg ring-2 ring-primary'
                        )}
                      >
                        <Image
                          src={getImageUrl(image)}
                          alt={`Upload ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                        />

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className="text-white cursor-grab active:cursor-grabbing"
                          >
                            <GripVertical className="h-5 w-5" />
                          </div>

                          {/* Remove Button */}
                          <button
                            type="button"
                            onClick={() => removeImage(image.id)}
                            className="p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                            aria-label="Remove image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Upload Status */}
                        {image.isUploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <div className="text-center">
                              <div className="h-8 w-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                              <p className="text-white text-xs mt-1">{image.progress}%</p>
                            </div>
                          </div>
                        )}

                        {/* Error */}
                        {image.error && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-500/90">
                            <p className="text-white text-xs text-center px-2">{image.error}</p>
                            <button
                              type="button"
                              onClick={() => retryUpload(image.id)}
                              className="mt-1 text-xs text-white underline hover:no-underline"
                            >
                              Retry
                            </button>
                          </div>
                        )}

                        {/* Uploaded Badge */}
                        {image.url && (
                          <div className="absolute top-1 right-1">
                            <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                              <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          </div>
                        )}

                        {/* Index Badge */}
                        <div className="absolute bottom-1 left-1 rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
                          {index + 1}
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Stats */}
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>
          {totalUploaded} uploaded · {images.length - totalUploaded} pending
        </span>
        <span>
          {images.length} / {maxFiles} images
        </span>
      </div>
    </div>
  );
}