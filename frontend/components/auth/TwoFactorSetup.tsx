// components/auth/TwoFactorSetup.tsx
'use client';

import { useState } from 'react';
import { useTwoFactor } from '@/hooks/useTwoFactor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, CheckCircle, Copy, Download } from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

export function TwoFactorSetup() {
  const {
    qrCode,
    secret,
    backupCodes,
    generate,
    generateLoading,
    enable,
    enableLoading,
    disable,
    disableLoading,
    regenerate,
    regenerateLoading,
  } = useTwoFactor();

  const [token, setToken] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const handleGenerate = async () => {
    await generate();
  };

  const handleEnable = async () => {
    if (!token || token.length !== 6) {
      toast.error('Please enter a valid 6-digit token.');
      return;
    }
    const result = await enable(token);
    if (result.verified) {
      setIsEnabled(true);
      setShowBackupCodes(true);
    }
  };

  const handleDisable = async () => {
    if (!token || token.length !== 6) {
      toast.error('Please enter a valid 6-digit token to disable.');
      return;
    }
    await disable(token);
    setIsEnabled(false);
    setToken('');
  };

  const handleRegenerate = async () => {
    await regenerate();
    setShowBackupCodes(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  if (!qrCode && !isEnabled) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Secure your account with an authenticator app
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Two-factor authentication adds an extra layer of security to your account.
            You'll need to enter a code from your authenticator app when logging in.
          </p>
          <Button onClick={handleGenerate} disabled={generateLoading} className="w-full">
            {generateLoading ? 'Generating...' : 'Set Up 2FA'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (qrCode && !isEnabled) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Set Up 2FA</CardTitle>
          <CardDescription>Scan the QR code with your authenticator app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <div className="bg-white p-2 rounded-lg">
              <Image
                src={qrCode}
                alt="QR Code for 2FA"
                width={200}
                height={200}
                className="rounded"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Manual Setup Code</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">{secret}</code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(secret || '')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Enter 6-digit code from app</Label>
            <Input
              type="text"
              placeholder="123456"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl tracking-widest"
            />
          </div>
          <Button onClick={handleEnable} disabled={enableLoading || token.length !== 6} className="w-full">
            {enableLoading ? 'Verifying...' : 'Enable 2FA'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isEnabled) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            2FA Enabled
          </CardTitle>
          <CardDescription>Your account is secured with two-factor authentication</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showBackupCodes && backupCodes.length > 0 && (
            <Alert variant="default" className="bg-yellow-50 border-yellow-200">
              <AlertTitle className="text-yellow-800">Save your backup codes</AlertTitle>
              <AlertDescription className="text-yellow-700">
                <p className="text-sm mb-2">
                  Store these backup codes in a safe place. Each code can be used only once.
                </p>
                <div className="grid grid-cols-2 gap-1 font-mono text-sm bg-white p-2 rounded border">
                  {backupCodes.map((code, i) => (
                    <span key={i}>{code}</span>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(backupCodes.join('\n'))}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'backup-codes.txt';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Enter 6-digit code to disable or regenerate</Label>
            <Input
              type="text"
              placeholder="123456"
              maxLength={6}
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-2xl tracking-widest"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={regenerateLoading || token.length !== 6}
            >
              {regenerateLoading ? 'Regenerating...' : 'Regenerate Backup Codes'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              disabled={disableLoading || token.length !== 6}
            >
              {disableLoading ? 'Disabling...' : 'Disable 2FA'}
            </Button>
          </div>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          <p>
            Backup codes can only be used once. Keep them secure.
          </p>
        </CardFooter>
      </Card>
    );
  }

  return null;
}