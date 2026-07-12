// frontend/components/vendor/VendorBulkUpload.tsx
'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVendor } from '@/hooks/useVendor';

// ============================================================
// TYPES
// ============================================================

interface BulkUploadResult {
  success: number;
  failed: number;
  errors: { row: number; error: string }[];
  created: { id: number; title: string }[];
  skipped: { row: number; reason: string }[];
}

// ============================================================
// BULK UPLOAD COMPONENT
// ============================================================

export function VendorBulkUpload() {
  const { bulkUploadProducts, bulkUploadLoading } = useVendor();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const selectedFile = acceptedFiles[0];
      if (selectedFile) {
        const validTypes = [
          'application/json',
          'text/csv',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        const isValid = validTypes.includes(selectedFile.type) || 
                        selectedFile.name.endsWith('.csv') ||
                        selectedFile.name.endsWith('.json') ||
                        selectedFile.name.endsWith('.xlsx');

        if (!isValid) {
          toast.error('Please upload a CSV, JSON, or Excel file');
          return;
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
          toast.error('File must be less than 10MB');
          return;
        }

        setFile(selectedFile);
        setResult(null);
        setError(null);
      }
    },
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const removeFile = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Read and parse file based on type
      let products: any[] = [];

      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const data = JSON.parse(text);
        products = Array.isArray(data) ? data : data.products || [];
      } else if (file.name.endsWith('.csv')) {
        const text = await file.text();
        products = parseCSV(text);
      } else {
        toast.error('File format not supported for parsing. Please use CSV or JSON.');
        setUploading(false);
        return;
      }

      if (products.length === 0) {
        toast.error('No products found in the file');
        setUploading(false);
        return;
      }

      // Validate products
      const validatedProducts = products.map((p: any) => ({
        title: p.title || p.name || '',
        price: parseFloat(p.price) || 0,
        description: p.description || '',
        stock: parseInt(p.stock) || 0,
        imageUrl: p.imageUrl || p.image || '',
        categoryId: p.categoryId || p.category_id || undefined,
      }));

      // Simulate progress
      const interval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 90));
      }, 300);

      const result = await bulkUploadProducts(validatedProducts);
      
      clearInterval(interval);
      setUploadProgress(100);
      setResult(result);

      if (result.failed === 0) {
        toast.success(`Successfully uploaded ${result.success} products`);
      } else {
        toast.warning(`Uploaded ${result.success} products, ${result.failed} failed`);
      }

      setFile(null);
    } catch (error: any) {
      setError(error.message || 'Failed to upload products');
      toast.error(error.message || 'Failed to upload products');
    } finally {
      setUploading(false);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const results: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',').map((v) => v.trim());
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      results.push(obj);
    }

    return results;
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Bulk Upload Products</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/20 hover:border-primary/50',
            file && 'border-green-500 bg-green-50/50'
          )}
        >
          <input {...getInputProps()} disabled={uploading} />
          
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <File className="h-8 w-8 text-green-500" />
              <div className="text-left">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div>
              <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">
                {isDragActive ? 'Drop files here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                CSV, JSON, or Excel files (max 10MB)
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Required columns: title, price, stock, description, imageUrl, categoryId
              </p>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">
              Uploading... {uploadProgress}%
            </p>
          </div>
        )}

        {/* Upload Button */}
        {file && !uploading && (
          <Button onClick={handleUpload} className="w-full" disabled={bulkUploadLoading}>
            {bulkUploadLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {file.name}
              </>
            )}
          </Button>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-3 border rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">{result.success} created</span>
              </div>
              {result.failed > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">{result.failed} failed</span>
                </div>
              )}
            </div>

            {result.created.length > 0 && (
              <div className="text-sm">
                <p className="font-medium mb-1">Created Products:</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {result.created.slice(0, 5).map((p) => (
                    <li key={p.id}>{p.title}</li>
                  ))}
                  {result.created.length > 5 && (
                    <li>+ {result.created.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="text-sm">
                <p className="font-medium text-red-600 mb-1">Errors:</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {result.errors.slice(0, 5).map((e, i) => (
                    <li key={i}>Row {e.row}: {e.error}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>+ {result.errors.length - 5} more errors</li>
                  )}
                </ul>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setResult(null)}
              className="mt-2"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Template Download */}
        <div className="border-t pt-4">
          <p className="text-sm text-muted-foreground mb-2">Need a template?</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const csv = 'title,price,description,stock,imageUrl,categoryId\nProduct 1,19.99,Description here,100,https://example.com/image.jpg,1\nProduct 2,29.99,Another product,50,,2';
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'product_template.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download CSV Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const json = {
                  products: [
                    {
                      title: 'Product 1',
                      price: 19.99,
                      description: 'Description here',
                      stock: 100,
                      imageUrl: 'https://example.com/image.jpg',
                      categoryId: 1,
                    },
                  ],
                };
                const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'product_template.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download JSON Template
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}