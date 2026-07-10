// components/auth/VendorRegistrationForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, EyeOff, Loader2, AlertCircle, Mail, Lock, User, 
  Building2, Phone, MapPin, FileText, ArrowRight, Store 
} from 'lucide-react';
import { registerVendorSchema, type RegisterVendorInput } from '@/validations/schemas';
import { useAuth, AuthError } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ============================================================
// PASSWORD STRENGTH INDICATOR
// ============================================================

const PasswordStrength = ({ password }: { password: string }) => {
  const getStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.match(/[a-z]/) && pwd.match(/[A-Z]/)) score++;
    if (pwd.match(/\d/)) score++;
    if (pwd.match(/[^a-zA-Z0-9]/)) score++;
    return score;
  };

  const score = getStrength(password);
  const strengthMap = [
    { label: 'Weak', color: 'bg-red-500' },
    { label: 'Fair', color: 'bg-orange-500' },
    { label: 'Good', color: 'bg-yellow-500' },
    { label: 'Strong', color: 'bg-green-500' },
  ];

  if (!password) return null;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-300",
              i < score ? strengthMap[score - 1]?.color || 'bg-muted' : 'bg-muted'
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Password strength: <span className="font-medium">{strengthMap[score - 1]?.label || 'Weak'}</span>
      </p>
    </div>
  );
};

// ============================================================
// VENDOR REGISTRATION FORM
// ============================================================

export function VendorRegistrationForm() {
  const router = useRouter();
  const { registerVendor, registerVendorLoading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const form = useForm<RegisterVendorInput>({
    resolver: zodResolver(registerVendorSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      businessName: '',
      businessDescription: '',
      phoneNumber: '',
      address: '',
      businessRegistration: '',
    },
  });

  const onSubmit = async (data: RegisterVendorInput) => {
    setErrorMessage(null);
    form.clearErrors();

    if (!acceptedTerms) {
      toast.error('Please accept the Terms of Service');
      return;
    }

    try {
      const payload = {
        name: data.name,
        email: data.email,
        password: data.password,
        businessName: data.businessName,
        businessDescription: data.businessDescription,
        phoneNumber: data.phoneNumber,
        address: data.address,
        businessRegistration: data.businessRegistration,
      };

      const result = await registerVendor(payload);
      toast.success(result.message || 'Vendor registration successful!');
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
    } catch (error: any) {
      let message = 'Registration failed. Please try again.';
      let isConflict = false;

      if (error instanceof AuthError) {
        message = error.getDisplayMessage();
        if (error.isConflict()) isConflict = true;
      }

      if (message.toLowerCase().includes('already registered') || isConflict) {
        setErrorMessage('This email is already registered. Please login instead.');
        toast.error('Email already exists');
        setTimeout(() => router.push('/login'), 3000);
        return;
      }

      setErrorMessage(message);
      toast.error(message);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription className="whitespace-pre-line">
                  {errorMessage}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Common Fields */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Full Name</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="John Doe"
                    disabled={registerVendorLoading}
                    autoComplete="name"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="vendor@example.com"
                    type="email"
                    disabled={registerVendorLoading}
                    autoComplete="email"
                    className="pl-10"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    disabled={registerVendorLoading}
                    className="pl-10 pr-12"
                    autoComplete="new-password"
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      setPassword(e.target.value);
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={registerVendorLoading}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <PasswordStrength password={password} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-medium">Confirm Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    disabled={registerVendorLoading}
                    className="pl-10 pr-12"
                    autoComplete="new-password"
                    {...field}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={registerVendorLoading}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* ✅ Vendor Specific Fields */}
        <div className="space-y-4 border-t pt-4 mt-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Store className="h-4 w-4" />
            Business Information
          </div>

          <FormField
            control={form.control}
            name="businessName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Business Name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="My Store"
                      disabled={registerVendorLoading}
                      className="pl-10"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="businessDescription"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Business Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your business..."
                    disabled={registerVendorLoading}
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Phone Number</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="+1234567890"
                      disabled={registerVendorLoading}
                      className="pl-10"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Business Address</FormLabel>
                <FormControl>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      placeholder="123 Main St, City, Country"
                      disabled={registerVendorLoading}
                      rows={2}
                      className="pl-10"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="businessRegistration"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium">Business Registration (Optional)</FormLabel>
                <FormControl>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="REG-12345"
                      disabled={registerVendorLoading}
                      className="pl-10"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Terms & Submit */}
        <div className="flex items-start gap-2 pt-1">
          <input
            type="checkbox"
            id="terms-vendor"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="h-4 w-4 mt-1 rounded border-gray-300 text-primary focus:ring-primary/20 transition-colors"
          />
          <label htmlFor="terms-vendor" className="text-sm text-muted-foreground">
            I agree to the{' '}
            <Link href="/terms" className="text-primary hover:underline font-medium transition-colors">
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-primary hover:underline font-medium transition-colors">
              Privacy Policy
            </Link>
          </label>
        </div>

        <Button
          type="submit"
          className="w-full gap-2 group bg-orange-500 hover:bg-orange-600"
          disabled={registerVendorLoading}
          size="lg"
        >
          {registerVendorLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating vendor account...
            </>
          ) : (
            <>
              Register as Vendor
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}