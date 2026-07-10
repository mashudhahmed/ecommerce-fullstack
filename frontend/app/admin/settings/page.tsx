// app/admin/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, Loader2, Shield, Bell, Globe, Database, Mail, Lock, UserCog } from 'lucide-react';
import { useAdmin } from '@/hooks/useAdmin';

export default function AdminSettingsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { stats } = useAdmin();
  const [loading, setLoading] = useState(false);

  // Redirect if not admin
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role !== 'admin' && user?.role !== 'superadmin') {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    storeName: 'SnapCart',
    storeEmail: 'admin@snapcart.com',
    storePhone: '+1 (555) 123-4567',
    storeAddress: '123 Main St, New York, NY 10001',
    storeCurrency: 'USD',
    storeTimezone: 'America/New_York',
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    orderNotifications: true,
    customerNotifications: true,
    vendorNotifications: true,
    inventoryNotifications: true,
    systemNotifications: true,
    emailDigest: false,
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorRequired: false,
    sessionTimeout: 60,
    maxLoginAttempts: 5,
    passwordPolicy: 'strong',
    ipWhitelist: '',
  });

  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    debugMode: false,
    cacheEnabled: true,
    logLevel: 'info',
  });

  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setGeneralSettings((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleNotificationToggle = (key: keyof typeof notificationSettings) => {
    setNotificationSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setSecuritySettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSystemToggle = (key: keyof typeof systemSettings) => {
    setSystemSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent, section: string) => {
    e.preventDefault();
    setLoading(true);

    try {
      // API call to update settings
      // await updateAdminSettings(section, settings);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(`${section} settings saved successfully!`);
    } catch (error) {
      toast.error(`Failed to save ${section} settings`);
    } finally {
      setLoading(false);
    }
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
      <div>
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground">
          Manage your store configuration and preferences
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="general" className="gap-2">
            <Globe className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Database className="h-4 w-4" />
            System
          </TabsTrigger>
        </TabsList>

        {/* ============================================================
            GENERAL SETTINGS
        ============================================================ */}
        <TabsContent value="general">
          <form onSubmit={(e) => handleSubmit(e, 'General')}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-orange-500" />
                  General Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="storeName">Store Name</Label>
                    <Input
                      id="storeName"
                      name="storeName"
                      value={generalSettings.storeName}
                      onChange={handleGeneralChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeEmail">Store Email</Label>
                    <Input
                      id="storeEmail"
                      name="storeEmail"
                      type="email"
                      value={generalSettings.storeEmail}
                      onChange={handleGeneralChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storePhone">Store Phone</Label>
                    <Input
                      id="storePhone"
                      name="storePhone"
                      value={generalSettings.storePhone}
                      onChange={handleGeneralChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeCurrency">Currency</Label>
                    <Input
                      id="storeCurrency"
                      name="storeCurrency"
                      value={generalSettings.storeCurrency}
                      onChange={handleGeneralChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storeTimezone">Timezone</Label>
                    <Input
                      id="storeTimezone"
                      name="storeTimezone"
                      value={generalSettings.storeTimezone}
                      onChange={handleGeneralChange}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeAddress">Store Address</Label>
                  <Input
                    id="storeAddress"
                    name="storeAddress"
                    value={generalSettings.storeAddress}
                    onChange={handleGeneralChange}
                  />
                </div>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* ============================================================
            NOTIFICATION SETTINGS
        ============================================================ */}
        <TabsContent value="notifications">
          <form onSubmit={(e) => handleSubmit(e, 'Notification')}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-orange-500" />
                  Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Order Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications for new orders
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.orderNotifications}
                      onCheckedChange={() => handleNotificationToggle('orderNotifications')}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Customer Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications for new customer registrations
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.customerNotifications}
                      onCheckedChange={() => handleNotificationToggle('customerNotifications')}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Vendor Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications for vendor applications
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.vendorNotifications}
                      onCheckedChange={() => handleNotificationToggle('vendorNotifications')}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Inventory Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications for low stock items
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.inventoryNotifications}
                      onCheckedChange={() => handleNotificationToggle('inventoryNotifications')}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>System Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications for system updates
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.systemNotifications}
                      onCheckedChange={() => handleNotificationToggle('systemNotifications')}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Digest</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive daily email digest of all notifications
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.emailDigest}
                      onCheckedChange={() => handleNotificationToggle('emailDigest')}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* ============================================================
            SECURITY SETTINGS
        ============================================================ */}
        <TabsContent value="security">
          <form onSubmit={(e) => handleSubmit(e, 'Security')}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-500" />
                  Security Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      name="sessionTimeout"
                      type="number"
                      value={securitySettings.sessionTimeout}
                      onChange={handleSecurityChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                    <Input
                      id="maxLoginAttempts"
                      name="maxLoginAttempts"
                      type="number"
                      value={securitySettings.maxLoginAttempts}
                      onChange={handleSecurityChange}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication Required</Label>
                      <p className="text-sm text-muted-foreground">
                        Require 2FA for all admin users
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.twoFactorRequired}
                      onCheckedChange={() => setSecuritySettings(prev => ({
                        ...prev,
                        twoFactorRequired: !prev.twoFactorRequired
                      }))}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="ipWhitelist">IP Whitelist (comma separated)</Label>
                    <Input
                      id="ipWhitelist"
                      name="ipWhitelist"
                      placeholder="192.168.1.1, 10.0.0.1"
                      value={securitySettings.ipWhitelist}
                      onChange={handleSecurityChange}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to allow all IPs
                    </p>
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* ============================================================
            SYSTEM SETTINGS
        ============================================================ */}
        <TabsContent value="system">
          <form onSubmit={(e) => handleSubmit(e, 'System')}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-orange-500" />
                  System Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Put the store in maintenance mode
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.maintenanceMode}
                      onCheckedChange={() => handleSystemToggle('maintenanceMode')}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Debug Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable debug logging
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.debugMode}
                      onCheckedChange={() => handleSystemToggle('debugMode')}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Cache Enabled</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable caching for better performance
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.cacheEnabled}
                      onCheckedChange={() => handleSystemToggle('cacheEnabled')}
                    />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="logLevel">Log Level</Label>
                    <Input
                      id="logLevel"
                      name="logLevel"
                      value={systemSettings.logLevel}
                      onChange={(e) => setSystemSettings(prev => ({
                        ...prev,
                        logLevel: e.target.value
                      }))}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}