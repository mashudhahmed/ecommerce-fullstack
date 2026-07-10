// app/superadmin/settings/page.tsx
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
import { 
  Save, 
  Loader2, 
  Shield, 
  Globe, 
  Database, 
  Users, 
  Server, 
  Lock, 
  Mail,
  Activity,
  Settings as SettingsIcon
} from 'lucide-react';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';

export default function SuperAdminSettingsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const { statistics, systemStatus } = useSuperAdmin();
  const [loading, setLoading] = useState(false);

  // Redirect if not superadmin
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role !== 'superadmin') {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Platform Settings
  const [platformSettings, setPlatformSettings] = useState({
    platformName: 'SnapCart',
    platformEmail: 'support@snapcart.com',
    platformUrl: 'https://snapcart.com',
    defaultCurrency: 'USD',
    defaultLanguage: 'en',
    defaultTimezone: 'UTC',
  });

  // User Management Settings
  const [userSettings, setUserSettings] = useState({
    allowRegistration: true,
    requireEmailVerification: true,
    requireVendorApproval: true,
    defaultUserRole: 'user',
    maxUsersPerPage: 20,
    sessionTimeout: 60,
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorRequired: false,
    passwordMinLength: 8,
    passwordRequireSpecial: true,
    passwordRequireNumber: true,
    passwordRequireUppercase: true,
    passwordExpiryDays: 90,
    maxLoginAttempts: 5,
    rateLimitPerMinute: 100,
  });

  // System Settings
  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    debugMode: false,
    cacheEnabled: true,
    analyticsEnabled: true,
    logLevel: 'info',
    autoBackup: true,
    backupFrequency: 'daily',
  });

  // Email Settings
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: '',
    smtpPass: '',
    fromEmail: '',
    fromName: 'SnapCart',
    mailDriver: 'smtp',
  });

  const handlePlatformChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlatformSettings((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleUserSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setUserSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleUserToggle = (key: keyof typeof userSettings) => {
    setUserSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSecuritySettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSecurityToggle = (key: keyof typeof securitySettings) => {
    setSecuritySettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSystemToggle = (key: keyof typeof systemSettings) => {
    setSystemSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setEmailSettings((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent, section: string) => {
    e.preventDefault();
    setLoading(true);

    try {
      // API call to update settings
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
        <h1 className="text-3xl font-bold">SuperAdmin Settings</h1>
        <p className="text-muted-foreground">
          Manage platform-wide configuration and preferences
        </p>
        {systemStatus && (
          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm text-muted-foreground">System Status:</span>
            <span className="text-sm font-medium text-green-500 flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Operational
            </span>
          </div>
        )}
      </div>

      <Tabs defaultValue="platform" className="space-y-6">
        <TabsList className="grid w-full max-w-3xl grid-cols-5">
          <TabsTrigger value="platform" className="gap-2">
            <Globe className="h-4 w-4" />
            Platform
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Server className="h-4 w-4" />
            System
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
        </TabsList>

        {/* ============================================================
            PLATFORM SETTINGS
        ============================================================ */}
        <TabsContent value="platform">
          <form onSubmit={(e) => handleSubmit(e, 'Platform')}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-orange-500" />
                  Platform Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="platformName">Platform Name</Label>
                    <Input
                      id="platformName"
                      name="platformName"
                      value={platformSettings.platformName}
                      onChange={handlePlatformChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platformEmail">Platform Email</Label>
                    <Input
                      id="platformEmail"
                      name="platformEmail"
                      type="email"
                      value={platformSettings.platformEmail}
                      onChange={handlePlatformChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platformUrl">Platform URL</Label>
                    <Input
                      id="platformUrl"
                      name="platformUrl"
                      value={platformSettings.platformUrl}
                      onChange={handlePlatformChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultCurrency">Default Currency</Label>
                    <Input
                      id="defaultCurrency"
                      name="defaultCurrency"
                      value={platformSettings.defaultCurrency}
                      onChange={handlePlatformChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultLanguage">Default Language</Label>
                    <Input
                      id="defaultLanguage"
                      name="defaultLanguage"
                      value={platformSettings.defaultLanguage}
                      onChange={handlePlatformChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultTimezone">Default Timezone</Label>
                    <Input
                      id="defaultTimezone"
                      name="defaultTimezone"
                      value={platformSettings.defaultTimezone}
                      onChange={handlePlatformChange}
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
            USER MANAGEMENT SETTINGS
        ============================================================ */}
        <TabsContent value="users">
          <form onSubmit={(e) => handleSubmit(e, 'User Management')}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-500" />
                  User Management Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Allow Registration</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow new users to register
                      </p>
                    </div>
                    <Switch
                      checked={userSettings.allowRegistration}
                      onCheckedChange={() => handleUserToggle('allowRegistration')}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Email Verification</Label>
                      <p className="text-sm text-muted-foreground">
                        Require users to verify their email
                      </p>
                    </div>
                    <Switch
                      checked={userSettings.requireEmailVerification}
                      onCheckedChange={() => handleUserToggle('requireEmailVerification')}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Vendor Approval</Label>
                      <p className="text-sm text-muted-foreground">
                        Require admin approval for vendor accounts
                      </p>
                    </div>
                    <Switch
                      checked={userSettings.requireVendorApproval}
                      onCheckedChange={() => handleUserToggle('requireVendorApproval')}
                    />
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="defaultUserRole">Default User Role</Label>
                      <Input
                        id="defaultUserRole"
                        name="defaultUserRole"
                        value={userSettings.defaultUserRole}
                        onChange={handleUserSettingChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxUsersPerPage">Max Users Per Page</Label>
                      <Input
                        id="maxUsersPerPage"
                        name="maxUsersPerPage"
                        type="number"
                        value={userSettings.maxUsersPerPage}
                        onChange={handleUserSettingChange}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      name="sessionTimeout"
                      type="number"
                      value={userSettings.sessionTimeout}
                      onChange={handleUserSettingChange}
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
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require 2FA</Label>
                      <p className="text-sm text-muted-foreground">
                        Require two-factor authentication for all users
                      </p>
                    </div>
                    <Switch
                      checked={securitySettings.twoFactorRequired}
                      onCheckedChange={() => handleSecurityToggle('twoFactorRequired')}
                    />
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="passwordMinLength">Password Min Length</Label>
                      <Input
                        id="passwordMinLength"
                        name="passwordMinLength"
                        type="number"
                        value={securitySettings.passwordMinLength}
                        onChange={handleSecurityChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passwordExpiryDays">Password Expiry (days)</Label>
                      <Input
                        id="passwordExpiryDays"
                        name="passwordExpiryDays"
                        type="number"
                        value={securitySettings.passwordExpiryDays}
                        onChange={handleSecurityChange}
                      />
                    </div>
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
                  <div className="space-y-2">
                    <Label htmlFor="rateLimitPerMinute">Rate Limit (requests per minute)</Label>
                    <Input
                      id="rateLimitPerMinute"
                      name="rateLimitPerMinute"
                      type="number"
                      value={securitySettings.rateLimitPerMinute}
                      onChange={handleSecurityChange}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Special Character</Label>
                    </div>
                    <Switch
                      checked={securitySettings.passwordRequireSpecial}
                      onCheckedChange={() => handleSecurityToggle('passwordRequireSpecial')}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Number</Label>
                    </div>
                    <Switch
                      checked={securitySettings.passwordRequireNumber}
                      onCheckedChange={() => handleSecurityToggle('passwordRequireNumber')}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Uppercase</Label>
                    </div>
                    <Switch
                      checked={securitySettings.passwordRequireUppercase}
                      onCheckedChange={() => handleSecurityToggle('passwordRequireUppercase')}
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
            SYSTEM SETTINGS
        ============================================================ */}
        <TabsContent value="system">
          <form onSubmit={(e) => handleSubmit(e, 'System')}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-orange-500" />
                  System Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Put the entire platform in maintenance mode
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
                        Enable debug logging for the platform
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
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Analytics Enabled</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable platform analytics tracking
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.analyticsEnabled}
                      onCheckedChange={() => handleSystemToggle('analyticsEnabled')}
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto Backup</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically backup database
                      </p>
                    </div>
                    <Switch
                      checked={systemSettings.autoBackup}
                      onCheckedChange={() => handleSystemToggle('autoBackup')}
                    />
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="space-y-2">
                      <Label htmlFor="backupFrequency">Backup Frequency</Label>
                      <Input
                        id="backupFrequency"
                        name="backupFrequency"
                        value={systemSettings.backupFrequency}
                        onChange={(e) => setSystemSettings(prev => ({
                          ...prev,
                          backupFrequency: e.target.value
                        }))}
                      />
                    </div>
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
            EMAIL SETTINGS
        ============================================================ */}
        <TabsContent value="email">
          <form onSubmit={(e) => handleSubmit(e, 'Email')}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-orange-500" />
                  Email Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input
                      id="smtpHost"
                      name="smtpHost"
                      value={emailSettings.smtpHost}
                      onChange={handleEmailChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      name="smtpPort"
                      type="number"
                      value={emailSettings.smtpPort}
                      onChange={handleEmailChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpUser">SMTP Username</Label>
                    <Input
                      id="smtpUser"
                      name="smtpUser"
                      value={emailSettings.smtpUser}
                      onChange={handleEmailChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPass">SMTP Password</Label>
                    <Input
                      id="smtpPass"
                      name="smtpPass"
                      type="password"
                      value={emailSettings.smtpPass}
                      onChange={handleEmailChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fromEmail">From Email</Label>
                    <Input
                      id="fromEmail"
                      name="fromEmail"
                      type="email"
                      value={emailSettings.fromEmail}
                      onChange={handleEmailChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fromName">From Name</Label>
                    <Input
                      id="fromName"
                      name="fromName"
                      value={emailSettings.fromName}
                      onChange={handleEmailChange}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMTP Secure (SSL/TLS)</Label>
                    <p className="text-sm text-muted-foreground">
                      Use secure connection for SMTP
                    </p>
                  </div>
                  <Switch
                    checked={emailSettings.smtpSecure}
                    onCheckedChange={() => setEmailSettings(prev => ({
                      ...prev,
                      smtpSecure: !prev.smtpSecure
                    }))}
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
      </Tabs>
    </div>
  );
}