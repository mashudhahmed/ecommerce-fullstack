// app/profile/edit/page.tsx
'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, Camera, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { getInitials } from '@/lib/utils';

export default function ProfileEditPage() {
  const { user, refetchUser } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar || null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    vendorPhoneNumber: user?.vendorPhoneNumber || '',
    vendorAddress: user?.vendorAddress || '',
    vendorBusinessName: user?.vendorBusinessName || '',
    vendorBusinessDescription: user?.vendorBusinessDescription || '',
    vendorBusinessRegistration: user?.vendorBusinessRegistration || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, WebP, or GIF image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setSelectedAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleRemoveAvatar = async () => {
    setSelectedAvatarFile(null);
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (user?.avatar) {
      try {
        setAvatarUploading(true);
        await apiClient.delete('/users/profile/avatar');
        await refetchUser();
        toast.success('Avatar removed');
      } catch (err: any) {
        toast.error('Failed to remove avatar');
      } finally {
        setAvatarUploading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Upload avatar if selected
      if (selectedAvatarFile) {
        const avatarFormData = new FormData();
        avatarFormData.append('avatar', selectedAvatarFile);
        await apiClient.patch('/users/profile/avatar', avatarFormData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      // 2. Update profile fields
      const updatePayload: Record<string, any> = {
        name: formData.name.trim(),
      };

      if (user?.role === 'vendor') {
        updatePayload.vendorPhoneNumber = formData.vendorPhoneNumber.trim() || undefined;
        updatePayload.vendorAddress = formData.vendorAddress.trim() || undefined;
        updatePayload.vendorBusinessName = formData.vendorBusinessName.trim() || undefined;
        updatePayload.vendorBusinessDescription = formData.vendorBusinessDescription.trim() || undefined;
        updatePayload.vendorBusinessRegistration = formData.vendorBusinessRegistration.trim() || undefined;
      }

      await apiClient.patch('/users/profile', updatePayload);
      await refetchUser();
      toast.success('Profile updated successfully!');
      router.push('/profile');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const isVendor = user?.role === 'vendor';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/profile">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Edit Profile</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <div className="relative group">
                <Avatar className="h-20 w-20 border-2 border-muted hover:border-primary transition-colors">
                  <AvatarImage src={avatarPreview || ''} alt={formData.name} />
                  <AvatarFallback className="text-xl bg-orange-100 text-orange-600">
                    {getInitials(formData.name || user?.name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-5 w-5 text-white" />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarSelect}
                  className="hidden"
                  disabled={avatarUploading || loading}
                />
              </div>

              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-8 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading || loading}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Change photo
                  </Button>
                  {(avatarPreview || user?.avatar) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs h-8 text-red-500 hover:text-red-600 cursor-pointer"
                      onClick={handleRemoveAvatar}
                      disabled={avatarUploading || loading}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG, WebP or GIF up to 5MB
                </p>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            {/* Email (disabled) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                disabled
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            {/* Vendor-specific fields */}
            {isVendor && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="vendorPhoneNumber">Phone Number</Label>
                  <Input
                    id="vendorPhoneNumber"
                    name="vendorPhoneNumber"
                    type="tel"
                    value={formData.vendorPhoneNumber}
                    onChange={handleChange}
                    placeholder="+1234567890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendorAddress">Business Address</Label>
                  <Textarea
                    id="vendorAddress"
                    name="vendorAddress"
                    value={formData.vendorAddress}
                    onChange={handleChange}
                    rows={3}
                    placeholder="123 Main St, City, Country"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendorBusinessName">Business Name</Label>
                  <Input
                    id="vendorBusinessName"
                    name="vendorBusinessName"
                    value={formData.vendorBusinessName}
                    onChange={handleChange}
                    placeholder="My Store"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendorBusinessDescription">Business Description</Label>
                  <Textarea
                    id="vendorBusinessDescription"
                    name="vendorBusinessDescription"
                    value={formData.vendorBusinessDescription}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Describe your business..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vendorBusinessRegistration">Business Registration Number</Label>
                  <Input
                    id="vendorBusinessRegistration"
                    name="vendorBusinessRegistration"
                    value={formData.vendorBusinessRegistration}
                    onChange={handleChange}
                    placeholder="REG-12345"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3 mt-6">
          <Button type="submit" disabled={loading} className="gap-2 cursor-pointer">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/profile')}
            className="cursor-pointer"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}