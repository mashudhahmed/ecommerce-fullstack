// types/index.ts

// ============================================
// USER TYPES
// ============================================

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'superadmin';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// AUTH TYPES - ✅ FIXED: user is now required
// ============================================

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  access_token?: string;
  user: User; // ✅ Required - not optional
}

export interface AuthResponseWithToken extends AuthResponse {
  access_token: string; // ✅ Token is required
}

// ============================================
// PRODUCT TYPES
// ============================================

export interface Product {
  id: number;
  title: string;
  price: number;
  description: string;
  stock: number;
  imageUrl?: string;
  owner?: User;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductData {
  title: string;
  price: number;
  description: string;
  stock: number;
  imageUrl?: string;
}

export interface UpdateProductData extends Partial<CreateProductData> {}

// ============================================
// CART TYPES
// ============================================

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

// ============================================
// ORDER TYPES
// ============================================

export interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  user: User;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderData {
  items: {
    productId: number;
    quantity: number;
  }[];
}

export interface OrderSummary {
  totalOrders: number;
  totalSpent: number;
  pendingOrders: number;
  recentOrders: Order[];
}

// ============================================
// API RESPONSE TYPES
// ============================================

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

// ============================================
// DASHBOARD TYPES
// ============================================

export interface DashboardStats {
  totalOrders: number;
  totalProducts: number;
  totalUsers: number;
  revenue: number;
  pendingOrders: number;
}

// ============================================
// ADMIN TYPES
// ============================================

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

// ============================================
// FILTERS & SEARCH TYPES
// ============================================

export interface ProductFilters {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'popular';
}

export interface PaginationParams {
  page: number;
  limit: number;
}

// ============================================
// FORM TYPES
// ============================================

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

// ============================================
// COMPONENT PROPS TYPES
// ============================================

export interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export interface OrderCardProps {
  order: Order;
  showActions?: boolean;
}

export interface CartItemProps {
  item: CartItem;
  onUpdateQuantity?: (id: number, quantity: number) => void;
  onRemove?: (id: number) => void;
}

// ============================================
// UTILITY TYPES
// ============================================

export type StatusType = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type RoleType = 'user' | 'admin' | 'superadmin';

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export type ProductStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'published' | 'unpublished' | 'out_of_stock';

// ============================================
// ENUMS (for better type safety)
// ============================================

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin',
}

export enum OrderStatusEnum {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum ProductStatusEnum {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PUBLISHED = 'published',
  UNPUBLISHED = 'unpublished',
  OUT_OF_STOCK = 'out_of_stock',
}

// ============================================
// STORE TYPES
// ============================================

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

export interface UIState {
  sidebarOpen: boolean;
  isDarkMode: boolean;
  isLoading: boolean;
}

// ============================================
// NAVIGATION TYPES
// ============================================

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType;
  roles?: RoleType[];
  requiresAuth?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

// ============================================
// TOAST/NOTIFICATION TYPES
// ============================================

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// ============================================
// META TYPES
// ============================================

export interface MetaData {
  title: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
}

// ============================================
// ENVIRONMENT TYPES
// ============================================

export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_APP_URL: string;
}