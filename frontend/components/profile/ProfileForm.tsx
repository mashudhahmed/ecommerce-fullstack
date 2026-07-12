// frontend/components/profile/ProfileForm.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { User } from '@/types';
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
import { AvatarUpload } from '@/components/profile/AvatarUpload'; // ✅ Fix import path

// ============================================================
// SCHEMA
// ============================================================

const profileFormSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  
  // ✅ Use correct field names from User type
  vendorPhoneNumber: z.string()
    .regex(/^\+?[\d\s-]{10,}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  
  vendorAddress: z.string()
    .max(200, 'Address cannot exceed 200 characters')
    .optional()
    .or(z.literal('')),
  
  // Vendor specific fields
  vendorBusinessName: z.string()
    .max(100, 'Business name cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
  
  vendorBusinessDescription: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
  
  vendorPhoneNumber_alt: z.string()
    .regex(/^\+?[\d\s-]{10,}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  
  vendorAddress_alt: z.string()
    .max(200, 'Address cannot exceed 200 characters')
    .optional()
    .or(z.literal('')),
  
  vendorBusinessRegistration: z.string()
    .max(50, 'Registration number cannot exceed 50 characters')
    .optional()
    .or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

// ============================================================
// PROPS
// ============================================================

interface ProfileFormProps {
  user: User;
  isVendor?: boolean;
  onSuccess?: () => void;
}

// ============================================================
// PROFILE FORM
// ============================================================

export function ProfileForm({ user, isVendor = false, onSuccess }: ProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(user.avatar);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user.name || '',
      vendorPhoneNumber: user.vendorPhoneNumber || '',
      vendorAddress: user.vendorAddress || '',
      vendorBusinessName: user.vendorBusinessName || '',
      vendorBusinessDescription: user.vendorBusinessDescription || '',
      vendorPhoneNumber_alt: user.vendorPhoneNumber || '',
      vendorAddress_alt: user.vendorAddress || '',
      vendorBusinessRegistration: user.vendorBusinessRegistration || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setLoading(true);

    try {
      const payload = {
        name: data.name,
        phoneNumber: data.vendorPhoneNumber || data.vendorPhoneNumber_alt,
        address: data.vendorAddress || data.vendorAddress_alt,
        vendorBusinessName: data.vendorBusinessName,
        vendorBusinessDescription: data.vendorBusinessDescription,
        vendorPhoneNumber: data.vendorPhoneNumber || data.vendorPhoneNumber_alt,
        vendorAddress: data.vendorAddress || data.vendorAddress_alt,
        vendorBusinessRegistration: data.vendorBusinessRegistration,
        avatar: avatarUrl,
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
      const response = await fetch(`${apiUrl}/users/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      toast.success('Profile updated successfully');
      onSuccess?.();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar Upload */}
        <AvatarUpload
          currentAvatar={avatarUrl}
          onUploadComplete={(url: string) => setAvatarUrl(url)}
        />

        {/* Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name *</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email (Read-only) */}
        <div className="space-y-2">
          <FormLabel>Email</FormLabel>
          <Input value={user.email} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">Email cannot be changed</p>
        </div>

        {/* Phone */}
        <FormField
          control={form.control}
          name="vendorPhoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="+1234567890" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Address */}
        <FormField
          control={form.control}
          name="vendorAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Your address"
                  rows={2}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Vendor Fields */}
        {isVendor && (
          <>
            <div className="border-t pt-4 mt-4">
              <h3 className="font-semibold text-lg mb-4">Business Information</h3>
            </div>

            <FormField
              control={form.control}
              name="vendorBusinessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your business name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vendorBusinessDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your business"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vendorBusinessRegistration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Registration Number</FormLabel>
                  <FormControl>
                    <Input placeholder="REG-12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
}