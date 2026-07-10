// components/upload/FileUpload.tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, File, Image, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  maxFiles?: number;
  maxSize?: number;
  accept?: Record<string, string[]>;
  className?: string;
}

export function FileUpload({
  onUpload,
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024, // 5MB
  accept,
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setFiles((prev) => [...prev, ...acceptedFiles].slice(0, maxFiles));
    },
    [maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Simulate progress
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      await onUpload(files);
      clearInterval(interval);
      setProgress(100);
      toast.success('Files uploaded successfully');
      setFiles([]);
    } catch (error: any) {
      toast.error(error?.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20',
          uploading && 'pointer-events-none opacity-50'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          {isDragActive
            ? 'Drop files here...'
            : 'Drag & drop files here, or click to select'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Max {maxFiles} files, up to {Math.round(maxSize / 1024 / 1024)}MB each
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-2 border rounded-lg bg-muted/20"
            >
              {file.type.startsWith('image/') ? (
                <Image className="h-5 w-5 text-muted-foreground" />
              ) : (
                <File className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="flex-1 text-sm truncate">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => removeFile(index)}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground text-center">
            Uploading... {progress}%
          </p>
        </div>
      )}

      {files.length > 0 && !uploading && (
        <Button onClick={handleUpload} className="w-full">
          <Upload className="mr-2 h-4 w-4" />
          Upload {files.length} file{files.length > 1 ? 's' : ''}
        </Button>
      )}

      {progress === 100 && (
        <div className="flex items-center justify-center gap-2 text-green-500">
          <CheckCircle className="h-5 w-5" />
          <span>Upload complete!</span>
        </div>
      )}
    </div>
  );
}