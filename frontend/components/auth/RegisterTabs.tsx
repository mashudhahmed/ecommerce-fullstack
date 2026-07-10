// components/auth/RegisterTabs.tsx
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { RegisterForm } from './RegisterForm';
import { RegisterVendorForm } from './RegisterVendorForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Store } from 'lucide-react';

export function RegisterTabs() {
  const [activeTab, setActiveTab] = useState<'user' | 'vendor'>('user');

  return (
    <div className="w-full max-w-md">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="relative h-10 w-10">
            <Image
              src="/logo.png"
              alt="SnapCart"
              width={40}
              height={40}
              className="object-contain"
              priority
            />
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            SnapCart
          </span>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Create Account
        </h1>
        <p className="text-sm text-muted-foreground">
          Join thousands of happy shoppers
        </p>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'user' | 'vendor')}
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
          <RegisterForm />
        </TabsContent>

        <TabsContent value="vendor">
          <RegisterVendorForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}