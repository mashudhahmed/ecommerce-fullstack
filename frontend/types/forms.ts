// types/forms.ts

import { ReactNode } from 'react';

// ============================================================
// FORM TYPES
// ============================================================

export interface LoginFormValues {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms?: boolean;
}

export interface RegisterVendorFormValues extends RegisterFormValues {
  businessName: string;
  businessDescription?: string;
  phoneNumber?: string;
  address?: string;
  businessRegistration?: string;
}

export interface ForgotPasswordFormValues {
  email: string;
}

export interface ResetPasswordFormValues {
  verificationToken: string;
  newPassword: string;
  confirmPassword: string;
}

export interface VerifyEmailFormValues {
  code: string;
}

export interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ProfileFormValues {
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface ProductFormValues {
  title: string;
  price: number;
  description: string;
  stock: number;
  imageUrl?: string;
  categoryId?: number;
}

export interface CategoryFormValues {
  name: string;
  description?: string;
  parentId?: number;
  imageUrl?: string;
  sortOrder?: number;
}

// ============================================================
// FORM FIELD TYPES
// ============================================================

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'textarea' | 'select' | 'checkbox' | 'file';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  options?: { label: string; value: string | number }[];
  validation?: any;
}

export interface FormSection {
  title?: string;
  description?: string;
  fields: FormField[];
}

export interface FormConfig {
  fields: FormField[];
  sections?: FormSection[];
  submitLabel?: string;
  cancelLabel?: string;
  onSubmit?: (values: any) => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

// ============================================================
// FORM STATE TYPES
// ============================================================

export interface FormState<T = any> {
  values: T;
  errors: Record<keyof T, string | undefined>;
  touched: Record<keyof T, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
}

export type FormAction<T> =
  | { type: 'SET_VALUE'; field: keyof T; value: any }
  | { type: 'SET_ERROR'; field: keyof T; error: string | undefined }
  | { type: 'SET_TOUCHED'; field: keyof T }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | { type: 'SET_VALUES'; values: T }
  | { type: 'RESET' };