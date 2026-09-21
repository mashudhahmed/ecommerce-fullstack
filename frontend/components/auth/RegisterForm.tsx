// components/auth/RegisterForm.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Users, Store } from 'lucide-react';
import Link from 'next/link';
import { UserRegistrationForm } from './UserRegistrationForm';
import { VendorRegistrationForm } from './VendorRegistrationForm';

export function RegisterForm() {
  const [activeTab, setActiveTab] = useState<'user' | 'vendor'>('user');

  return (
    <Card className="w-full max-w-[460px] mx-auto shadow-lg border-primary/10">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-2">
          <div className="relative h-14 w-14">
            <Image src="/logo.png" alt="SnapCart" fill sizes="56px" className="object-contain" priority />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Sign up to start shopping, or{' '}
          <Link
            href="/login"
            className="font-semibold text-orange-600 underline underline-offset-4 transition-colors hover:text-orange-700"
          >
            Sign in
          </Link>
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs 
          value={activeTab} 
          onValueChange={(v) => setActiveTab(v as 'user' | 'vendor')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger 
              value="user" 
              className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              <Users className="h-4 w-4" />
              User
            </TabsTrigger>
            <TabsTrigger 
              value="vendor" 
              className="flex items-center gap-2 data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              <Store className="h-4 w-4" />
              Vendor
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user">
            <UserRegistrationForm />
          </TabsContent>

          <TabsContent value="vendor">
            <VendorRegistrationForm />
          </TabsContent>
        </Tabs>
      </CardContent>

      <CardFooter className="flex flex-col gap-4 border-t border-border pt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-orange-600 transition-colors hover:text-orange-700"
          >
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

// ✅ Also export as default for compatibility
export default RegisterForm;