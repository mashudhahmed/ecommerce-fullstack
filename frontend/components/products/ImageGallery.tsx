// frontend/components/products/ImageGallery.tsx
'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

// ============================================================
// PROPS
// ============================================================

interface ImageGalleryProps {
  images: string[];
  altText?: string;
  className?: string;
  thumbnailClassName?: string;
  mainImageClassName?: string;
  showThumbnails?: boolean;
  thumbnailColumns?: number;
}

// ============================================================
// IMAGE GALLERY
// ============================================================

export function ImageGallery({
  images,
  altText = 'Product image',
  className,
  thumbnailClassName,
  mainImageClassName,
  showThumbnails = true,
  thumbnailColumns = 4,
}: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });

  const currentImage = useMemo(() => {
    if (!images || images.length === 0) return null;
    return images[selectedIndex] || images[0];
  }, [images, selectedIndex]);

  const handleNext = useCallback(() => {
    if (!images || images.length === 0) return;
    setSelectedIndex((prev) => (prev + 1) % images.length);
  }, [images]);

  const handlePrev = useCallback(() => {
    if (!images || images.length === 0) return;
    setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images]);

  const handleThumbnailClick = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  }, [isZoomed]);

  const handleDownload = useCallback(() => {
    if (!currentImage) return;
    const link = document.createElement('a');
    link.href = currentImage;
    link.download = altText.replace(/\s+/g, '_') || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentImage, altText]);

  if (!images || images.length === 0) {
    return (
      <div className="flex items-center justify-center aspect-square bg-muted/20 rounded-lg">
        <p className="text-muted-foreground">No images available</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Main Image */}
      <div
        className={cn(
          'relative aspect-square overflow-hidden rounded-lg bg-muted/20',
          isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in',
          mainImageClassName
        )}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setIsZoomed(false)}
        onClick={() => setIsZoomed(!isZoomed)}
      >
        <Image
          src={currentImage || '/placeholder-image.png'}
          alt={`${altText} - Image ${selectedIndex + 1}`}
          fill
          className={cn(
            'object-contain transition-transform duration-300',
            isZoomed && 'scale-150'
          )}
          style={isZoomed ? {
            transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
          } : undefined}
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={selectedIndex === 0}
        />

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/80 backdrop-blur-sm px-3 py-1 text-xs font-medium">
            {selectedIndex + 1} / {images.length}
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute right-2 top-2 flex flex-col gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(!isZoomed);
            }}
            aria-label={isZoomed ? 'Zoom out' : 'Zoom in'}
          >
            {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            aria-label="Download image"
          >
            <Download className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
            onClick={(e) => {
              e.stopPropagation();
              setIsLightboxOpen(true);
            }}
            aria-label="View fullscreen"
          >
            <X className="h-4 w-4 rotate-45" />
          </Button>
        </div>
      </div>

      {/* Thumbnails */}
      {showThumbnails && images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={cn(
                'relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                selectedIndex === index
                  ? 'border-primary ring-2 ring-primary/20'
                  : 'border-transparent opacity-60 hover:opacity-100',
                thumbnailClassName
              )}
              aria-label={`View image ${index + 1}`}
              aria-current={selectedIndex === index ? 'true' : 'false'}
            >
              <Image
                src={image || '/placeholder-image.png'}
                alt={`${altText} thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-background/95 backdrop-blur-sm border-none">
          <div className="relative h-[90vh] w-full">
            <Image
              src={currentImage || '/placeholder-image.png'}
              alt={`${altText} - Fullscreen`}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />

            {/* Lightbox Navigation */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
                  onClick={handlePrev}
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
                  onClick={handleNext}
                  aria-label="Next image"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Lightbox Counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background/80 backdrop-blur-sm px-4 py-2 text-sm font-medium">
              {selectedIndex + 1} / {images.length}
            </div>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background/90"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Close fullscreen"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}