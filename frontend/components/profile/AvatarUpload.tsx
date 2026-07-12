// frontend/components/profile/AvatarUpload.tsx
'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

// ============================================================
// PROPS
// ============================================================

interface AvatarUploadProps {
  currentAvatar?: string;
  onUploadComplete: (url: string) => void;
  className?: string;
}

// ============================================================
// AVATAR UPLOAD
// ============================================================

export function AvatarUpload({
  currentAvatar,
  onUploadComplete,
  className,
}: AvatarUploadProps) {
  const [avatarPreview, setAvatarPreview] = useState<string>(currentAvatar || '');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      const file = files[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error('Image must be less than 5MB');
          return;
        }

        if (!file.type.startsWith('image/')) {
          toast.error('Please upload an image file');
          return;
        }

        setAvatarPreview(URL.createObjectURL(file));
        handleUpload(file);
      }
    },
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const interval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await apiClient.patch('/users/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      clearInterval(interval);
      setUploadProgress(100);

      const avatarUrl = response.data.avatar || response.data.data?.avatar;
      onUploadComplete(avatarUrl);
      toast.success('Avatar uploaded successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to upload avatar');
      setAvatarPreview(currentAvatar || '');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeAvatar = () => {
    setAvatarPreview('');
    onUploadComplete('');
    toast.info('Avatar removed');
  };

  const getInitials = (): string => {
    // This will be replaced with actual user name from parent
    return 'U';
  };

  return (
    <div className={cn('flex flex-col items-center space-y-4', className)}>
      <div
        {...getRootProps()}
        className="relative cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <input {...getInputProps()} disabled={uploading} />
        
        <Avatar className="h-24 w-24 border-2 border-muted transition-all hover:border-primary">
          <AvatarImage src={avatarPreview || currentAvatar} alt="Avatar" />
          <AvatarFallback className="text-2xl bg-primary/10 text-primary">
            {getInitials()}
          </AvatarFallback>
        </Avatar>

        {/* Upload Overlay */}
        {(isHovered || isDragActive) && !uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white transition-opacity">
            <Upload className="h-6 w-6" />
          </div>
        )}

        {/* Uploading Overlay */}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="w-full max-w-xs">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground text-center mt-1">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          {...getRootProps()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
        {(avatarPreview || currentAvatar) && (
          <Button
            variant="destructive"
            size="sm"
            onClick={removeAvatar}
            disabled={uploading}
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        PNG, JPG, WebP, GIF (max 5MB)
      </p>
    </div>
  );
}