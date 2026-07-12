// frontend/components/vendor/BulkUploadWithImages.tsx
'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, File, X, CheckCircle, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVendor } from '@/hooks/useVendor';
import { MultiImageUpload } from '@/components/products/MultiImageUpload';

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

interface ProductWithImage {
  title: string;
  price: number;
  description: string;
  stock: number;
  imageUrl?: string;
  categoryId?: number;
}

// ============================================================
// BULK UPLOAD WITH IMAGES
// ============================================================

export function BulkUploadWithImages() {
  const { bulkUploadProducts, bulkUploadLoading } = useVendor();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductWithImage[]>([]);
  const [activeTab, setActiveTab] = useState<'file' | 'manual'>('file');

  // ============================================================
  // FILE UPLOAD
  // ============================================================

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      const selectedFile = acceptedFiles[0];
      if (selectedFile) {
        const validTypes = ['application/json', 'text/csv'];
        const isValid = validTypes.includes(selectedFile.type) || 
                        selectedFile.name.endsWith('.csv') ||
                        selectedFile.name.endsWith('.json');

        if (!isValid) {
          toast.error('Please upload a CSV or JSON file');
          return;
        }

        if (selectedFile.size > 10 * 1024 * 1024) {
          toast.error('File must be less than 10MB');
          return;
        }

        setFile(selectedFile);
        setResult(null);
        setError(null);
        parseFile(selectedFile);
      }
    },
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const parseFile = async (selectedFile: File) => {
    try {
      let parsedProducts: any[] = [];

      if (selectedFile.name.endsWith('.json')) {
        const text = await selectedFile.text();
        const data = JSON.parse(text);
        parsedProducts = Array.isArray(data) ? data : data.products || [];
      } else if (selectedFile.name.endsWith('.csv')) {
        const text = await selectedFile.text();
        parsedProducts = parseCSV(text);
      }

      if (parsedProducts.length === 0) {
        toast.error('No products found in the file');
        return;
      }

      const validatedProducts = parsedProducts.map((p: any) => ({
        title: p.title || p.name || '',
        price: parseFloat(p.price) || 0,
        description: p.description || '',
        stock: parseInt(p.stock) || 0,
        imageUrl: p.imageUrl || p.image || '',
        categoryId: p.categoryId || p.category_id || undefined,
      }));

      setProducts(validatedProducts);
      toast.success(`Loaded ${validatedProducts.length} products from file`);
    } catch (error: any) {
      setError(`Failed to parse file: ${error.message}`);
      toast.error(`Failed to parse file: ${error.message}`);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
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

  const removeFile = () => {
    setFile(null);
    setProducts([]);
    setResult(null);
    setError(null);
  };

  // ============================================================
  // HANDLE UPLOAD
  // ============================================================

  const handleUpload = async () => {
    if (products.length === 0) {
      toast.error('No products to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const interval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 5, 90));
      }, 300);

      const result = await bulkUploadProducts(products);
      
      clearInterval(interval);
      setUploadProgress(100);
      setResult(result);

      if (result.failed === 0) {
        toast.success(`Successfully uploaded ${result.success} products`);
      } else {
        toast.warning(`Uploaded ${result.success} products, ${result.failed} failed`);
      }

      if (result.success > 0) {
        setProducts([]);
        setFile(null);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to upload products');
      toast.error(error.message || 'Failed to upload products');
    } finally {
      setUploading(false);
    }
  };

  // ============================================================
  // MANUAL PRODUCT ENTRY
  // ============================================================

  const addManualProduct = (product: ProductWithImage) => {
    setProducts((prev) => [...prev, product]);
  };

  const removeManualProduct = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Bulk Upload Products with Images</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'file' | 'manual')}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="file">Upload File</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>

          {/* File Upload Tab */}
          <TabsContent value="file" className="space-y-4 pt-4">
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
                    CSV or JSON files (max 10MB)
                  </p>
                </div>
              )}
            </div>

            {products.length > 0 && (
              <div className="border rounded-lg p-4">
                <p className="font-medium mb-2">Products Loaded: {products.length}</p>
                <div className="max-h-48 overflow-y-auto space-y-1 text-sm">
                  {products.slice(0, 10).map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b last:border-0">
                      <span>{p.title}</span>
                      <span className="text-muted-foreground">${p.price}</span>
                    </div>
                  ))}
                  {products.length > 10 && (
                    <p className="text-muted-foreground">+ {products.length - 10} more</p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual" className="pt-4">
            <ManualProductEntry 
              onAdd={addManualProduct} 
              productsCount={products.length}
            />
          </TabsContent>
        </Tabs>

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
        {products.length > 0 && !uploading && (
          <Button 
            onClick={handleUpload} 
            className="w-full" 
            disabled={bulkUploadLoading}
            size="lg"
          >
            {bulkUploadLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading {products.length} products...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload {products.length} Products
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
          <p className="text-sm text-muted-foreground mb-2">Download template</p>
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
              CSV Template
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
              JSON Template
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// MANUAL PRODUCT ENTRY SUB-COMPONENT
// ============================================================

function ManualProductEntry({ 
  onAdd, 
  productsCount 
}: { 
  onAdd: (product: ProductWithImage) => void;
  productsCount: number;
}) {
  const [formData, setFormData] = useState<ProductWithImage>({
    title: '',
    price: 0,
    description: '',
    stock: 0,
    imageUrl: '',
    categoryId: undefined,
  });

  const [images, setImages] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || formData.price <= 0) {
      toast.error('Title and price are required');
      return;
    }
    onAdd({
      ...formData,
      imageUrl: images[0] || formData.imageUrl,
    });
    setFormData({
      title: '',
      price: 0,
      description: '',
      stock: 0,
      imageUrl: '',
      categoryId: undefined,
    });
    setImages([]);
    toast.success('Product added to upload list');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background"
            placeholder="Product title"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Price *</label>
          <input
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background"
            placeholder="19.99"
            required
          />
        </div>
        <div>
          <label className="text-sm font-medium">Stock</label>
          <input
            type="number"
            value={formData.stock}
            onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
            className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background"
            placeholder="100"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Category ID</label>
          <input
            type="number"
            value={formData.categoryId || ''}
            onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) || undefined })}
            className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background"
            placeholder="1"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full mt-1 px-3 py-2 rounded-md border border-input bg-background"
          rows={3}
          placeholder="Product description"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Image</label>
        <MultiImageUpload
          maxFiles={1}
          onImagesChange={(urls) => setImages(urls)}
        />
      </div>

      <Button type="submit" className="w-full">
        Add to Upload List ({productsCount + 1} total)
      </Button>
    </form>
  );
}