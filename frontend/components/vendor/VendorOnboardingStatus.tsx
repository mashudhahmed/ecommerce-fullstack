// components/vendor/VendorOnboardingStatus.tsx
'use client';

import React, { useState } from 'react';
import { User } from '@/types';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth-store';
import { 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Store, 
  Building2, 
  Phone, 
  MapPin, 
  FileText, 
  ArrowRight, 
  ShieldCheck, 
  RefreshCw,
  LogOut,
  Mail,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface VendorOnboardingStatusProps {
  user: User;
}

export function VendorOnboardingStatus({ user }: VendorOnboardingStatusProps) {
  const router = useRouter();
  const { setUser, logout } = useAuthStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Resubmission form state initialized from current user values
  const [businessName, setBusinessName] = useState(user.vendorBusinessName || '');
  const [phoneNumber, setPhoneNumber] = useState(user.vendorPhoneNumber || '');
  const [address, setAddress] = useState(user.vendorAddress || '');
  const [businessRegistration, setBusinessRegistration] = useState(user.vendorBusinessRegistration || '');
  const [businessDescription, setBusinessDescription] = useState(user.vendorBusinessDescription || '');

  const isRejected = user.isVendorRejected;

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      toast.error('Store / Business name is required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await authService.resubmitVendorApplication({
        businessName: businessName.trim(),
        phoneNumber: phoneNumber.trim(),
        address: address.trim(),
        businessRegistration: businessRegistration.trim(),
        businessDescription: businessDescription.trim(),
      });
      
      setUser(res.vendor);
      setIsEditing(false);
      toast.success('Your application has been resubmitted for verification!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to resubmit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out successfully');
      router.push('/login');
    } catch {
      toast.error('Failed to log out');
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Banner Branding */}
      <div className="flex items-center justify-between pb-6 border-b border-border/60 mb-8">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Merchant Partner Portal</h1>
            <p className="text-xs text-muted-foreground">Compliance & Seller Identity Verification</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleLogout}
          className="text-muted-foreground hover:text-red-600 hover:bg-red-50 text-xs gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </Button>
      </div>

      {/* Main Status Container */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-sm overflow-hidden">
        {/* Status Header Strip */}
        <div className={`p-6 sm:p-8 border-b ${
          isRejected 
            ? 'bg-red-500/5 border-red-500/20' 
            : 'bg-amber-500/5 border-amber-500/20'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl shrink-0 ${
                isRejected 
                  ? 'bg-red-500/10 text-red-600 ring-4 ring-red-500/10' 
                  : 'bg-amber-500/10 text-amber-600 ring-4 ring-amber-500/10'
              }`}>
                {isRejected ? (
                  <AlertCircle className="h-7 w-7" />
                ) : (
                  <Clock className="h-7 w-7 animate-pulse" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    isRejected 
                      ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300' 
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                  }`}>
                    {isRejected ? 'Action Required' : 'Under Review'}
                  </span>
                  <span className="text-xs text-muted-foreground">Ref #{user.id.toString().padStart(6, '0')}</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mt-1 text-foreground">
                  {isRejected 
                    ? 'Application Requires Revisions' 
                    : 'Merchant Verification in Progress'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                  {isRejected
                    ? 'Our compliance team reviewed your documentation and requested adjustments before your store can go live.'
                    : 'Your business details are currently undergoing verification by our marketplace compliance team.'}
                </p>
              </div>
            </div>

            {/* Refresh / Check Button */}
            {!isRejected && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
                className="self-start sm:self-center text-xs gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Check Status
              </Button>
            )}
          </div>
        </div>

        {/* Verification Timeline / Steps */}
        <div className="p-6 sm:p-8 border-b border-border/50 bg-muted/10">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Verification Roadmap
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Step 1 */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/60">
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">1. Account Created</p>
                <p className="text-[11px] text-muted-foreground">Credentials confirmed</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${
              isRejected 
                ? 'bg-red-500/5 border-red-500/20' 
                : 'bg-amber-500/5 border-amber-500/20'
            }`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                isRejected 
                  ? 'bg-red-500/10 text-red-600' 
                  : 'bg-amber-500/10 text-amber-600'
              }`}>
                {isRejected ? <AlertCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {isRejected ? '2. Action Required' : '2. Identity & Tax Review'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {isRejected ? 'Revisions requested' : 'Standard 24-48 hours'}
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 opacity-70">
              <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs shrink-0">
                <Store className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">3. Marketplace Activation</p>
                <p className="text-[11px] text-muted-foreground">Instant catalog access</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body: Either Rejection Details + Form OR Pending Summary */}
        <div className="p-6 sm:p-8">
          {isRejected ? (
            <div className="space-y-6">
              {/* Review Note Box */}
              <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 p-4">
                <h4 className="text-sm font-semibold text-red-900 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Reason from Marketplace Compliance Reviewer
                </h4>
                <p className="text-sm text-red-800 dark:text-red-200 mt-1.5 leading-relaxed bg-white/70 dark:bg-red-950/40 p-3 rounded-lg border border-red-200/60 dark:border-red-900/40">
                  {user.vendorRejectionReason || 'Please verify your registered business credentials and provide complete contact information.'}
                </p>
              </div>

              {/* Editable Resubmission Form */}
              <div className="border border-border rounded-xl p-5 sm:p-6 bg-card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-foreground text-base">Update & Resubmit Information</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Correct the details below and submit for immediate re-examination.
                    </p>
                  </div>
                  {!isEditing && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditing(true)}
                      className="text-xs"
                    >
                      Edit Information
                    </Button>
                  )}
                </div>

                <form onSubmit={handleResubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1.5">
                        Legal Business / Store Name *
                      </label>
                      <Input
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Apex Global Trading Ltd."
                        disabled={!isEditing && !isRejected}
                        required
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1.5">
                        Business Phone Number
                      </label>
                      <Input
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+1 (555) 019-2834"
                        disabled={!isEditing && !isRejected}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1.5">
                        Tax ID / Business Registration Number
                      </label>
                      <Input
                        value={businessRegistration}
                        onChange={(e) => setBusinessRegistration(e.target.value)}
                        placeholder="e.g. US-EIN-9928172"
                        disabled={!isEditing && !isRejected}
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground block mb-1.5">
                        Physical Registered Address
                      </label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Suite 400, Commerce Tower, NY"
                        disabled={!isEditing && !isRejected}
                        className="text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-foreground block mb-1.5">
                      Store Description & Catalog Overview
                    </label>
                    <Textarea
                      value={businessDescription}
                      onChange={(e) => setBusinessDescription(e.target.value)}
                      placeholder="Briefly describe the categories of products you sell, brand affiliations, etc."
                      rows={3}
                      disabled={!isEditing && !isRejected}
                      className="text-sm"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-medium text-sm px-6"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          Resubmit Application
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            /* Pending Approval View */
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-border/80 rounded-xl p-4 bg-muted/20">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Submitted Store Details
                  </h4>
                  <dl className="space-y-2.5 text-xs">
                    <div className="flex items-start gap-2">
                      <Store className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <dt className="text-muted-foreground">Store Name</dt>
                        <dd className="font-semibold text-foreground text-sm">{user.vendorBusinessName || 'Not specified'}</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <dt className="text-muted-foreground">Owner Contact</dt>
                        <dd className="text-foreground">{user.name} ({user.email})</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <dt className="text-muted-foreground">Phone Number</dt>
                        <dd className="text-foreground">{user.vendorPhoneNumber || 'None on record'}</dd>
                      </div>
                    </div>
                  </dl>
                </div>

                <div className="border border-border/80 rounded-xl p-4 bg-muted/20">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Registration & Compliance
                  </h4>
                  <dl className="space-y-2.5 text-xs">
                    <div className="flex items-start gap-2">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <dt className="text-muted-foreground">Tax / Registration ID</dt>
                        <dd className="font-semibold text-foreground">{user.vendorBusinessRegistration || 'Under verification'}</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <dt className="text-muted-foreground">Operating Address</dt>
                        <dd className="text-foreground">{user.vendorAddress || 'Standard regional'}</dd>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <dt className="text-muted-foreground">Store Summary</dt>
                        <dd className="text-foreground line-clamp-2">{user.vendorBusinessDescription || 'General merchandise merchant'}</dd>
                      </div>
                    </div>
                  </dl>
                </div>
              </div>

              {/* What happens next banner */}
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3.5">
                <ShieldCheck className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-blue-900 dark:text-blue-300">
                    What happens next?
                  </p>
                  <p className="text-blue-800 dark:text-blue-200 leading-relaxed">
                    Once our administration approves your seller application, you will receive an email confirmation and immediate access to your full seller suite: product catalog management, order fulfillment, return requests, and automated weekly payout balances.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
