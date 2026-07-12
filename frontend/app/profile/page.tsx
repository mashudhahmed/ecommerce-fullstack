// app/profile/page.tsx
'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  CheckCircle, 
  XCircle,
  Edit,
  LogOut,
  ShoppingBag,
  Heart,
  Phone,
  MapPin,
  Building,
  Store,
  Camera,
  Loader2,
} from 'lucide-react';
import { formatDate, getInitials } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout, refetchUser } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.push('/login');
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, WebP, or GIF image');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setAvatarUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await apiClient.patch('/users/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('Avatar updated successfully!');
      await refetchUser();
      
      // Force a page refresh to update the avatar everywhere
      window.location.reload();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Remove your profile avatar?')) return;

    setAvatarUploading(true);
    try {
      await apiClient.delete('/users/profile/avatar');
      toast.success('Avatar removed successfully');
      await refetchUser();
      window.location.reload();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to remove avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  const roleColors = {
    user: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    vendor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    superadmin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };

  const isVendor = user.role === 'vendor';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <Link href="/profile/edit">
          <Button className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        </Link>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            {/* Avatar with upload */}
            <div className="relative group">
              <Avatar className="h-24 w-24 border-2 border-muted hover:border-primary transition-colors">
                <AvatarImage src={user.avatar || ''} alt={user.name} />
                <AvatarFallback className="text-2xl bg-orange-100 text-orange-600">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              
              {/* Upload overlay */}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={avatarUploading}
                />
                {avatarUploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            </div>

            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-2xl font-semibold">{user.name}</h2>
                {user.avatar && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveAvatar}
                    disabled={avatarUploading}
                    className="text-xs text-muted-foreground hover:text-red-500"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={roleColors[user.role]}>
                  {user.role}
                </Badge>
                {user.isVerified ? (
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Not Verified
                  </Badge>
                )}
                {isVendor && (
                  <Badge variant={user.isVendorApproved ? 'default' : 'secondary'}>
                    {user.isVendorApproved ? 'Approved' : user.isVendorRejected ? 'Rejected' : 'Pending'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {avatarUploading ? 'Uploading...' : 'Click the avatar to upload a photo'}
              </p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email - always shown */}
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>

            {/* Joined Date - always shown */}
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Joined</p>
                <p className="font-medium">{formatDate(user.createdAt)}</p>
              </div>
            </div>

            {/* Vendor-specific fields - only shown if user is vendor */}
            {isVendor && (
              <>
                {user.vendorPhoneNumber && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{user.vendorPhoneNumber}</p>
                    </div>
                  </div>
                )}
                {user.vendorAddress && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{user.vendorAddress}</p>
                    </div>
                  </div>
                )}
                {user.vendorBusinessName && (
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Business Name</p>
                      <p className="font-medium">{user.vendorBusinessName}</p>
                    </div>
                  </div>
                )}
                {user.vendorBusinessDescription && (
                  <div className="flex items-center gap-3 col-span-2">
                    <Building className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Business Description</p>
                      <p className="font-medium line-clamp-2">{user.vendorBusinessDescription}</p>
                    </div>
                  </div>
                )}
                {user.vendorBusinessRegistration && (
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Business Registration</p>
                      <p className="font-medium">{user.vendorBusinessRegistration}</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/orders">
            <Button variant="outline" className="w-full justify-start gap-3">
              <ShoppingBag className="h-4 w-4" />
              My Orders
            </Button>
          </Link>
          <Link href="/wishlist">
            <Button variant="outline" className="w-full justify-start gap-3">
              <Heart className="h-4 w-4" />
              Wishlist
            </Button>
          </Link>
          {isVendor && (
            <Link href="/vendor/dashboard">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Shield className="h-4 w-4" />
                Vendor Dashboard
              </Button>
            </Link>
          )}
          <Button
            variant="destructive"
            className="w-full justify-start gap-3"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}