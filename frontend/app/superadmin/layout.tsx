// app/superadmin/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Seamlessly forward legacy /superadmin routes to unified /admin portal
    let target = '/admin';
    if (pathname === '/superadmin/vendors') target = '/admin/vendors';
    else if (pathname === '/superadmin/admins') target = '/admin/admins';
    else if (pathname === '/superadmin/statistics') target = '/admin/statistics';
    else if (pathname === '/superadmin/settings') target = '/admin/platform-settings';
    else if (pathname === '/superadmin/users') target = '/admin/users';

    router.replace(target);
  }, [pathname, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
    </div>
  );
}