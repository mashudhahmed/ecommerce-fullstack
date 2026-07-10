// app/vendor/settings/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Save, Loader2 } from 'lucide-react';

export default function VendorSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    orderUpdates: true,
    lowStockAlerts: true,
    weeklyReports: false,
    shippingRate: 0,
    processingTime: 2,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key],
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // API call to update settings
      // await updateVendorSettings(settings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your store preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive important updates via email
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={() => handleToggle('emailNotifications')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Order Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when orders are placed
                </p>
              </div>
              <Switch
                checked={settings.orderUpdates}
                onCheckedChange={() => handleToggle('orderUpdates')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when products are low in stock
                </p>
              </div>
              <Switch
                checked={settings.lowStockAlerts}
                onCheckedChange={() => handleToggle('lowStockAlerts')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Receive weekly performance reports
                </p>
              </div>
              <Switch
                checked={settings.weeklyReports}
                onCheckedChange={() => handleToggle('weeklyReports')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Shipping Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Shipping Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shippingRate">Default Shipping Rate ($)</Label>
              <Input
                id="shippingRate"
                name="shippingRate"
                type="number"
                step="0.01"
                value={settings.shippingRate}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="processingTime">Processing Time (Days)</Label>
              <Input
                id="processingTime"
                name="processingTime"
                type="number"
                min="1"
                max="10"
                value={settings.processingTime}
                onChange={handleChange}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading} className="gap-2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Settings
        </Button>
      </form>
    </div>
  );
}