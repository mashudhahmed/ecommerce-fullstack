// app/dashboard/page.tsx
'use client';

import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, logout, logoutLoading, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Button 
          variant="destructive" 
          onClick={handleLogout} 
          disabled={logoutLoading}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          {logoutLoading ? 'Logging out...' : 'Logout'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome, {user?.name || 'User'}!</CardTitle>
          <CardDescription>
            You are successfully logged in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Role:</strong> {user?.role || 'User'}</p>
            <p><strong>Account Status:</strong> {user?.isVerified ? 'Verified' : 'Not Verified'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}