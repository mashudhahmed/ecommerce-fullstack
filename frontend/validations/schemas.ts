// frontend/validations/schemas.ts
import { z } from 'zod';

// ============================================================
// USER REGISTRATION
// ============================================================

export const registerSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  
  email: z.string()
    .email('Invalid email address'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(32, 'Password cannot exceed 32 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// ============================================================
// VENDOR REGISTRATION
// ============================================================

export const registerVendorSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  
  email: z.string()
    .email('Invalid email address'),
  
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(32, 'Password cannot exceed 32 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  
  confirmPassword: z.string(),
  
  businessName: z.string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name cannot exceed 100 characters'),
  
  businessDescription: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  
  phoneNumber: z.string()
    .regex(/^\+?[\d\s-]{10,}$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  
  address: z.string()
    .max(200, 'Address cannot exceed 200 characters')
    .optional()
    .or(z.literal('')),
  
  businessRegistration: z.string()
    .max(50, 'Registration number cannot exceed 50 characters')
    .optional()
    .or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// ============================================================
// LOGIN
// ============================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// ============================================================
// FORGOT PASSWORD
// ============================================================

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// ============================================================
// RESET PASSWORD
// ============================================================

export const resetPasswordSchema = z.object({
  verificationToken: z.string().min(6, 'Invalid token'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(32)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number, and special character'
    ),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// ============================================================
// EMAIL VERIFICATION
// ============================================================

export const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

// ============================================================
// PRODUCT - UPDATED WITH CATEGORY AND OPTIONAL FIELDS
// ============================================================

export const productSchema = z.object({
  title: z.string()
    .min(2, 'Title must be at least 2 characters')
    .max(150, 'Title cannot exceed 150 characters'),

  // ✅ Fixed: Removed invalid_type_error, using refine instead
  price: z.number()
    .positive('Price must be greater than 0')
    .max(1000000, 'Price is too high')
    .refine((val) => !isNaN(val), 'Price must be a number'),

  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description cannot exceed 2000 characters')
    .optional()
    .or(z.literal('')),

  // ✅ Fixed: Removed invalid_type_error, using refine instead
  stock: z.number()
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative')
    .refine((val) => !isNaN(val), 'Stock must be a number'),

  imageUrl: z.string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),

  // ✅ Fixed: Removed invalid_type_error, using refine instead
  categoryId: z.number()
    .int('Category ID must be a whole number')
    .positive('Please select a category')
    .refine((val) => !isNaN(val), 'Category ID must be a number')
    .optional(),

  compareAtPrice: z.number()
    .positive('Compare at price must be greater than 0')
    .optional()
    .or(z.literal('')),

  sku: z.string()
    .max(50, 'SKU cannot exceed 50 characters')
    .optional()
    .or(z.literal('')),

  isActive: z.boolean().default(true).optional(),

  isTrending: z.boolean().default(false).optional(),

  isNew: z.boolean().default(false).optional(),

  additionalImages: z.array(z.string().url('Invalid image URL'))
    .optional()
    .default([]),
});

// ============================================================
// PRODUCT FILTERS
// ============================================================

export const productFiltersSchema = z.object({
  search: z.string().optional(),
  categoryId: z.number().int().positive().optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  inStock: z.boolean().optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'newest', 'popular', 'rating']).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

// ============================================================
// TYPE EXPORTS
// ============================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterVendorInput = z.infer<typeof registerVendorSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type ProductFiltersInput = z.infer<typeof productFiltersSchema>;