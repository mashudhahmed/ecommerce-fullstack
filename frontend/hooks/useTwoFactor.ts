// hooks/useTwoFactor.ts
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services/auth.service';
import { toast } from 'sonner';

export function useTwoFactor() {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);

  // Generate 2FA setup
  const generateMutation = useMutation({
    mutationFn: async () => {
      const result = await authService.generateTwoFactor();
      return result;
    },
    onSuccess: (data) => {
      setQrCode(data.qrCode);
      setSecret(data.secret);
      toast.success('2FA setup generated. Scan the QR code with your authenticator app.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to generate 2FA setup.');
    },
  });

  // Enable 2FA
  const enableMutation = useMutation({
    mutationFn: async (token: string) => {
      const result = await authService.enableTwoFactor(token);
      return result;
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      toast.success('2FA enabled successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to enable 2FA. Please check your token.');
    },
  });

  // Disable 2FA
  const disableMutation = useMutation({
    mutationFn: async (token: string) => {
      const result = await authService.disableTwoFactor(token);
      return result;
    },
    onSuccess: () => {
      toast.success('2FA disabled successfully.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to disable 2FA.');
    },
  });

  // Regenerate backup codes
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      const result = await authService.regenerateBackupCodes();
      return result;
    },
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      toast.success('Backup codes regenerated successfully.');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to regenerate backup codes.');
    },
  });

  // Verify a token (for validation)
  const verifyMutation = useMutation({
    mutationFn: async (token: string) => {
      const result = await authService.verifyTwoFactor(token);
      return result;
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Invalid 2FA token.');
    },
  });

  return {
    // State
    qrCode,
    secret,
    backupCodes,
    setBackupCodes,

    // Mutations
    generate: generateMutation.mutateAsync,
    generateLoading: generateMutation.isPending,
    enable: enableMutation.mutateAsync,
    enableLoading: enableMutation.isPending,
    disable: disableMutation.mutateAsync,
    disableLoading: disableMutation.isPending,
    regenerate: regenerateMutation.mutateAsync,
    regenerateLoading: regenerateMutation.isPending,
    verify: verifyMutation.mutateAsync,
    verifyLoading: verifyMutation.isPending,
  };
}