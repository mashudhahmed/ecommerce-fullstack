// app/profile/edit/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ProfileEditPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // ✅ Use only properties that exist on User type
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    // ✅ Vendor-specific fields (only if user is vendor)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // API call to update profile
      // await updateProfile(formData);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Profile updated successfully!');
      router.push('/profile');
    } catch (error) {
      toast.error('Failed to update profile');
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
          <CardContent className="space-y-4">
            {/* ✅ Name - always shown */}
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

            {/* ✅ Email - always shown (disabled) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            {/* ✅ Vendor-specific fields - only shown if user is vendor */}
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
          <Button type="submit" disabled={loading} className="gap-2">
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
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}