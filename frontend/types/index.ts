// types/index.ts

// ============================================================
// USER TYPES
// ============================================================

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'vendor' | 'admin' | 'superadmin';
  isVerified: boolean;
  isVendorApproved?: boolean;
  isVendorRejected?: boolean;
  vendorBusinessName?: string;
  vendorBusinessDescription?: string;
  vendorPhoneNumber?: string;
  vendorAddress?: string;
  vendorBusinessRegistration?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// AUTH TYPES
// ============================================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface RegisterVendorData {
  name: string;
  email: string;
  password: string;
  businessName: string;
  businessDescription?: string;
  phoneNumber?: string;
  address?: string;
  businessRegistration?: string;
}

export interface AuthResponse {
  message: string;
  access_token?: string;
  user: User;
}

export interface AuthResponseWithToken extends AuthResponse {
  access_token: string;
}

// ============================================================
// PRODUCT TYPES
// ============================================================

export interface Product {
  images: boolean;
  id: number;
  title: string;
  price: number;
  description: string;
  stock: number;
  imageUrl?: string;
  compareAtPrice?: number;   // ✅ Optional – for discounts
  isActive?: boolean;
  averageRating?: number;
  totalReviews?: number;
  isNew?: boolean;          // ✅ Optional – shows "New" badge
  isTrending?: boolean;     // ✅ Optional – shows "Trending" badge
  owner?: User;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductData {
  title: string;
  price: number;
  description: string;
  stock: number;
  imageUrl?: string;
  categoryId?: number;
}

export interface UpdateProductData extends Partial<CreateProductData> {}

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  minRating?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popular' | 'rating';
  page?: number;
  limit?: number;
}

// ============================================================
// CATEGORY TYPES
// ============================================================

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: number;
  parent?: Category;
  children?: Category[];
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  parentId?: number;
  imageUrl?: string;
  sortOrder?: number;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  isActive?: boolean;
}

// ============================================================
// CART TYPES
// ============================================================

export interface CartItem {
  id: number;
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface CartTotal {
  total: number;
  itemCount: number;
  items: CartItem[];
}

export interface CartSummary {
  items: CartItem[];
  total: number;
  itemCount: number;
}

export interface AddToCartData {
  productId: number;
  quantity: number;
}

export interface UpdateCartData {
  productId: number;
  quantity: number;
}

// ============================================================
// ORDER TYPES
// ============================================================

export interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  price: number;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: number;
  user: User;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  shippingAddress?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  cancelledBy?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderData {
  items: {
    productId: number;
    quantity: number;
  }[];
  shippingAddress?: string;
}

export interface UpdateOrderStatusData {
  status: OrderStatus;
}

export interface OrderSummary {
  totalOrders: number;
  totalSpent: number;
  pendingOrders: number;
  recentOrders: Order[];
}

export interface AdminOrderStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
}

// ============================================================
// VENDOR TYPES
// ============================================================

export interface VendorStats {
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface VendorOrderSummary {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
}

export interface PendingVendor {
  id: number;
  name: string;
  email: string;
  businessName: string;
  businessDescription?: string;
  phoneNumber?: string;
  address?: string;
  businessRegistration?: string;
  createdAt: string;
}

// Vendor Dashboard Stats (full dashboard data)
export interface VendorDashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  recentOrders: Order[];
}

// Vendor Performance Metrics
export interface PerformanceMetrics {
  salesTrend: { date: string; revenue: number; orders: number }[];
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  growthRate: number;
  topProducts: { id: number; title: string; sold: number; revenue: number }[];
}

// ============================================================
// REVIEW TYPES
// ============================================================

export interface Review {
  id: number;
  user: User;
  product: Product;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
  isApproved: boolean;
  isDeleted: boolean;
  metadata?: {
    verifiedPurchase?: boolean;
    helpfulCount?: number;
    reportedCount?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewData {
  productId: number;
  rating: number;
  title?: string;
  comment: string;
  images?: string[];
}

export interface ReviewStats {
  average: number;
  total: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// 🆕 Review response with pagination and stats
export interface ReviewResponse {
  data: Review[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    averageRating: number;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
}

// ============================================================
// WISHLIST TYPES
// ============================================================

export interface WishlistItem {
  id: number;
  user: User;
  product: Product;
  createdAt: string;
}

// 🆕 Wishlist response with pagination
export interface WishlistResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ============================================================
// COUPON TYPES
// ============================================================

export interface Coupon {
  id: number;
  code: string;
  name: string;
  description?: string;
  discountType: 'percentage' | 'fixed' | 'free_shipping';
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  validFrom: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  status: 'active' | 'expired' | 'used' | 'disabled';
  isFirstOrderOnly: boolean;
  applicableUsers?: User[];
  applicableProducts?: Product[];
  createdAt: string;
  updatedAt: string;
}

export interface ApplyCouponData {
  code: string;
}

// ============================================================
// SHIPPING TYPES
// ============================================================

export type ShippingMethod = 'standard' | 'express' | 'overnight' | 'same_day' | 'free' | 'international';
export type ShippingStatus = 'pending' | 'processing' | 'shipped' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed' | 'returned';

export interface Shipping {
  id: number;
  order: Order;
  method: ShippingMethod;
  cost: number;
  status: ShippingStatus;
  trackingNumber?: string;
  carrier?: string;
  address: {
    name: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  estimatedDelivery?: string;
  shippedAt?: string;
  deliveredAt?: string;
  trackingHistory?: {
    status: ShippingStatus;
    timestamp: string;
    location?: string;
    notes?: string;
  }[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// RETURN TYPES
// ============================================================

export type ReturnReason = 'defective' | 'wrong_item' | 'damaged' | 'not_as_described' | 'change_of_mind' | 'other';
export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'shipped' | 'received' | 'refunded' | 'completed';

export interface Return {
  id: number;
  order: Order;
  user: User;
  items: {
    productId: number;
    productName: string;
    quantity: number;
    price: number;
  }[];
  reason: ReturnReason;
  description: string;
  images?: string[];
  status: ReturnStatus;
  refundAmount?: number;
  refundTransactionId?: string;
  adminNotes?: string;
  rejectionReason?: string;
  approvedAt?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  data: T;
  timestamp: string;
  path: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

export interface ApiError {
  success: false;
  statusCode: number;
  message: string;
  error?: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
  path?: string;
}

// ============================================================
// DASHBOARD TYPES
// ============================================================

export interface DashboardStats {
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  revenue: number;
  pendingOrders: number;
  totalVendors?: number;
  pendingVendors?: number;
  userStats?: {
    totalUsers: number;
    totalVendors: number;
    totalAdmins: number;
    totalSuperAdmins: number;
    verifiedUsers: number;
    pendingVendors: number;
    approvedVendors: number;
  };
}

// ============================================================
// ADMIN TYPES
// ============================================================

export interface AdminStats {
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  revenue: number;
  pendingOrders: number;
}

export interface AdminUser extends User {
  role: 'admin' | 'superadmin';
}

// ============================================================
// SEARCH TYPES
// ============================================================

export interface SearchFilters {
  page?: number;
  limit?: number;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  minRating?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  data: Product[];
  total: number;
  page: number;
  limit: number;
  aggs: {
    categories: { id: number; count: number }[];
    priceRanges: { from: number; to: number; count: number }[];
  };
}

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

// ============================================================
// COMPONENT PROPS TYPES
// ============================================================

export interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export interface OrderCardProps {
  order: Order;
  showActions?: boolean;
  onCancel?: (orderId: number) => void;
}

export interface CartItemProps {
  item: CartItem;
  onUpdateQuantity?: (id: number, quantity: number) => void;
  onRemove?: (id: number) => void;
}

// ============================================================
// STORE TYPES
// ============================================================

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setAuthenticated: (value: boolean) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  hydrate: () => void;
}

export interface CartState {
  items: CartItem[];
  isSynced: boolean;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  syncWithServer: (serverItems: CartItem[]) => void;
  setSynced: () => void;
}

export interface UIState {
  sidebarOpen: boolean;
  isDarkMode: boolean;
  isLoading: boolean;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  setLoading: (loading: boolean) => void;
}

// ============================================================
// NAVIGATION TYPES
// ============================================================

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  roles?: ('user' | 'vendor' | 'admin' | 'superadmin')[];
  requiresAuth?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// ============================================================
// TOAST/NOTIFICATION TYPES
// ============================================================

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ============================================================
// META TYPES
// ============================================================

export interface MetaData {
  title: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  ogType?: 'website' | 'product' | 'article';
}

// ============================================================
// ENVIRONMENT TYPES
// ============================================================

export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_APP_URL: string;
}

// ============================================================
// FILTERS & PAGINATION TYPES
// ============================================================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  categoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  minRating?: number;
}

// ============================================================
// ENUMS (for better type safety)
// ============================================================

export enum UserRole {
  USER = 'user',
  VENDOR = 'vendor',
  ADMIN = 'admin',
  SUPER_ADMIN = 'superadmin',
}

export enum OrderStatusEnum {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
  FREE_SHIPPING = 'free_shipping',
}

export enum CouponStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  USED = 'used',
  DISABLED = 'disabled',
}

export enum ShippingMethodEnum {
  STANDARD = 'standard',
  EXPRESS = 'express',
  OVERNIGHT = 'overnight',
  SAME_DAY = 'same_day',
  FREE = 'free',
  INTERNATIONAL = 'international',
}

export enum ShippingStatusEnum {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RETURNED = 'returned',
}

export enum ReturnReasonEnum {
  DEFECTIVE = 'defective',
  WRONG_ITEM = 'wrong_item',
  DAMAGED = 'damaged',
  NOT_AS_DESCRIBED = 'not_as_described',
  CHANGE_OF_MIND = 'change_of_mind',
  OTHER = 'other',
}

export enum ReturnStatusEnum {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SHIPPED = 'shipped',
  RECEIVED = 'received',
  REFUNDED = 'refunded',
  COMPLETED = 'completed',
}

// ============================================================
// UTILITY TYPES
// ============================================================

export type StatusType = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type RoleType = 'user' | 'vendor' | 'admin' | 'superadmin';

export type SortOrder = 'asc' | 'desc';

export type SortBy = 'price' | 'rating' | 'newest' | 'popular' | 'name';

export type ProductStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'published' | 'unpublished' | 'out_of_stock';

// ============================================================
// RESPONSE HELPER TYPES
// ============================================================

export type PaginatedResult<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type ApiResult<T> = {
  data: T;
  message?: string;
  statusCode: number;
};

// ============================================================
// HOOK RETURN TYPES
// ============================================================

export interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  loginLoading: boolean;
  loginError: Error | null;
  register: (data: RegisterData) => Promise<AuthResponse>;
  registerLoading: boolean;
  registerError: Error | null;
  registerVendor: (data: RegisterVendorData) => Promise<AuthResponse>;
  registerVendorLoading: boolean;
  registerVendorError: Error | null;
  verifyEmail: (email: string, code: string) => Promise<AuthResponse>;
  verifyEmailLoading: boolean;
  verifyEmailError: Error | null;
  resendVerification: (email: string) => Promise<{ message: string }>;
  resendVerificationLoading: boolean;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  forgotPasswordLoading: boolean;
  verifyResetCode: (email: string, code: string) => Promise<{ verificationToken: string }>;
  verifyResetCodeLoading: boolean;
  resetPassword: (verificationToken: string, newPassword: string) => Promise<{ message: string }>;
  resetPasswordLoading: boolean;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ message: string }>;
  changePasswordLoading: boolean;
  logout: () => Promise<{ message: string }>;
  logoutLoading: boolean;
  logoutAll: () => Promise<{ message: string; sessionsEnded: number }>;
  logoutAllLoading: boolean;
}

// ============================================================
// 🆕 ADDITIONAL TYPES FOR NEW FEATURES
// ============================================================

// Export Format
export type ExportFormat = 'excel' | 'pdf' | 'csv' | 'json';

// WebSocket Message
export interface WebSocketMessage {
  event: string;
  data: any;
  timestamp: string;
}

// System Status (SuperAdmin)
export interface SystemStatus {
  system: {
    status: string;
    uptime: number;
    timestamp: string;
    nodeVersion: string;
    platform: string;
  };
  stats: {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
  };
}

// Admin Extended Stats (SuperAdmin)
export interface AdminStatsExtended {
  total: {
    users: number;
    vendors: number;
    admins: number;
    superAdmins: number;
  };
  verification: {
    verified: number;
    unverified: number;
    pendingVendors: number;
    approvedVendors: number;
  };
  recentUsers: User[];
  timestamp: string;
}

// ============================================================
// TWO-FACTOR AUTHENTICATION TYPES
// ============================================================

export interface TwoFactorSetup {
  secret: string;
  qrCode: string;
  otpauthUrl: string;
}

export interface TwoFactorVerify {
  verified: boolean;
  backupCodes?: string[];
}

export interface TwoFactorStatus {
  isEnabled: boolean;
  method: 'authenticator' | 'sms' | 'email';
  phoneNumber?: string;
  email?: string;
}

// ============================================================
// EXPORT ALL
// ============================================================

export * from './api';
export * from './components';
export * from './forms';
export * from './hooks';
export * from './stores';
export * from './errors';