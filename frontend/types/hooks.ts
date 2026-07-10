// types/hooks.ts

import {
  AuthResponse,
  CartItem,
  Category,
  CreateCategoryData,
  CreateOrderData,
  CreateProductData,
  DashboardStats,
  LoginCredentials,
  Order,
  OrderSummary,
  Product,
  RegisterData,
  RegisterVendorData,
  SearchFilters,
  SearchResult,
  User,
  VendorOrderSummary,
  VendorStats,
  // ✅ New imports for added features
  WishlistItem,
  Review,
  ReviewStats,
  CreateReviewData,
  VendorStats as VendorStatsType,
  PerformanceMetrics,
  ExportFormat,
} from './index';

// ============================================================
// AUTH HOOK RETURN TYPE
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
// CART HOOK RETURN TYPE
// ============================================================

export interface UseCartReturn {
  items: CartItem[];
  serverCart: CartItem[];
  isLoading: boolean;
  totalItems: number;
  totalPrice: number;
  refetch: () => void;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  addToCart: (data: { productId: number; quantity: number }) => Promise<CartItem>;
  addToCartLoading: boolean;
  updateQuantityServer: (data: { productId: number; quantity: number }) => Promise<CartItem>;
  removeItemServer: (productId: number) => Promise<void>;
  clearCartServer: () => Promise<void>;
}

// ============================================================
// PRODUCTS HOOK RETURN TYPE
// ============================================================

export interface UseProductsReturn {
  products: Product[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  inStockProducts: Product[];
  lowStockProducts: Product[];
  getProduct: (id: number) => Promise<Product | null>;
  createProduct: (data: CreateProductData) => Promise<Product>;
  createProductLoading: boolean;
  updateProduct: (data: { id: number; data: Partial<CreateProductData> }) => Promise<Product>;
  updateProductLoading: boolean;
  deleteProduct: (id: number) => Promise<void>;
  deleteProductLoading: boolean;
  searchProducts: (query: string) => Promise<Product[]>;
  getVendorProducts: () => Promise<Product[]>;
  getVendorStats: () => Promise<VendorStats>;
}

// ============================================================
// ORDERS HOOK RETURN TYPE
// ============================================================

export interface UseOrdersReturn {
  orders: Order[];
  isLoading: boolean;
  orderSummary: OrderSummary;
  createOrder: (data: CreateOrderData) => Promise<Order>;
  isCreatingOrder: boolean;
  cancelOrder: (id: number) => Promise<Order>;
  isCancellingOrder: boolean;
  getOrder: (id: number) => Promise<Order>;
  getVendorOrders: () => Promise<Order[]>;
  getVendorOrderSummary: () => Promise<VendorOrderSummary>;
}

// ============================================================
// ADMIN HOOK RETURN TYPE
// ============================================================

export interface UseAdminReturn {
  stats: DashboardStats | undefined;
  statsLoading: boolean;
  users: User[] | undefined;
  usersLoading: boolean;
  allOrders: Order[] | undefined;
  ordersLoading: boolean;
  allProducts: Product[] | undefined;
  productsLoading: boolean;
  deleteUser: (id: number) => Promise<void>;
  updateOrderStatus: (data: { id: number; status: string }) => Promise<Order>;
  createAdmin: (data: { name: string; email: string; password: string }) => Promise<User>;
  getAdmins: () => Promise<User[]>;
  deleteAdmin: (id: number) => Promise<void>;
  getPendingVendors: () => Promise<User[]>;
  approveVendor: (id: number) => Promise<void>;
  rejectVendor: (id: number, reason?: string) => Promise<void>;
  // ✅ New admin vendor actions (bulk, suspend, stats)
  bulkVendorAction: (data: { action: string; vendorIds: number[]; reason?: string }) => Promise<any>;
  suspendVendor: (id: number, suspended: boolean, reason?: string) => Promise<User>;
  getVendorStats: () => Promise<{
    totalVendors: number;
    activeVendors: number;
    pendingVendors: number;
    rejectedVendors: number;
    suspendedVendors: number;
    topVendors: any[];
    vendorGrowth: any[];
  }>;
}

// ============================================================
// CATEGORIES HOOK RETURN TYPE
// ============================================================

export interface UseCategoriesReturn {
  categories: Category[];
  categoryTree: Category[];
  isLoading: boolean;
  createCategory: (data: CreateCategoryData) => Promise<Category>;
  createCategoryLoading: boolean;
  updateCategory: (data: { id: number; data: Partial<CreateCategoryData> }) => Promise<Category>;
  updateCategoryLoading: boolean;
  deleteCategory: (id: number) => Promise<void>;
  deleteCategoryLoading: boolean;
  getCategory: (id: number) => Promise<Category | null>;
  getCategoryStats: () => Promise<{ total: number; active: number; rootCategories: number }>;
}

// ============================================================
// SEARCH HOOK RETURN TYPE
// ============================================================

export interface UseSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  filters: SearchFilters;
  updateFilters: (filters: Partial<SearchFilters>) => void;
  goToPage: (page: number) => void;
  results: SearchResult | undefined;
  suggestions: string[] | undefined;
  popularTerms: string[] | undefined;
  isLoading: boolean;
  reindex: () => Promise<void>;
  reindexLoading: boolean;
}

// ============================================================
// 🆕 VENDOR HOOK RETURN TYPE
// ============================================================

export interface UseVendorReturn {
  // Dashboard
  dashboard: VendorStatsType | undefined;
  dashboardLoading: boolean;
  performance: PerformanceMetrics | undefined;
  performanceLoading: boolean;
  refetchDashboard: () => void;

  // Products
  productsData: { data: Product[]; meta: any } | undefined;
  productsLoading: boolean;
  bulkUploadProducts: (products: any[]) => Promise<any>;
  bulkUploadLoading: boolean;
  bulkDeleteProducts: (productIds: number[]) => Promise<any>;
  bulkDeleteLoading: boolean;

  // Orders
  ordersData: { data: Order[]; meta: any } | undefined;
  ordersLoading: boolean;
  updateOrderStatus: (data: { orderId: number; status: string }) => Promise<Order>;
  updateOrderStatusLoading: boolean;
}

// ============================================================
// 🆕 WISHLIST HOOK RETURN TYPE
// ============================================================

export interface UseWishlistReturn {
  wishlist: Product[];
  total: number;
  isLoading: boolean;
  count: number;
  addToWishlist: (productId: number) => Promise<WishlistItem>;
  addLoading: boolean;
  removeFromWishlist: (productId: number) => Promise<void>;
  removeLoading: boolean;
  clearWishlist: () => Promise<void>;
  clearLoading: boolean;
  checkInWishlist: (productId: number) => Promise<boolean>;
}

// ============================================================
// 🆕 REVIEWS HOOK RETURN TYPE
// ============================================================

export interface UseReviewsReturn {
  reviews: Review[];
  stats: ReviewStats | undefined;
  statsLoading: boolean;
  isLoading: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  createReview: (data: CreateReviewData) => Promise<Review>;
  createLoading: boolean;
  deleteReview: (reviewId: number) => Promise<void>;
  deleteLoading: boolean;
  markHelpful: (reviewId: number) => Promise<void>;
}

// ============================================================
// 🆕 EXPORT HOOK RETURN TYPE
// ============================================================

export interface UseExportReturn {
  exportData: (
    type: 'users' | 'orders' | 'products' | 'analytics',
    format: ExportFormat,
    filters?: any
  ) => Promise<void>;
  loading: boolean;
}

// ============================================================
// 🆕 WEBSOCKET HOOK RETURN TYPE
// ============================================================

export interface UseWebSocketReturn {
  isConnected: boolean;
  lastMessage: any;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (event: string, data: any) => void;
  socket: any; // SocketIO socket instance
}

// ============================================================
// 🆕 SUPERADMIN HOOK RETURN TYPE
// ============================================================

export interface UseSuperAdminReturn {
  // Vendor management
  vendors: User[] | undefined;
  vendorsLoading: boolean;
  approveVendor: (id: number) => Promise<void>;
  rejectVendor: (id: number, reason?: string) => Promise<void>;
  suspendVendor: (id: number) => Promise<void>;
  activateVendor: (id: number) => Promise<void>;
  // Admin management
  admins: User[] | undefined;
  adminsLoading: boolean;
  createAdmin: (data: { name: string; email: string; password: string }) => Promise<User>;
  deleteAdmin: (id: number) => Promise<void>;
  // User management
  users: User[] | undefined;
  usersLoading: boolean;
  deleteUser: (id: number) => Promise<void>;
  updateUserStatus: (id: number, isVerified: boolean) => Promise<User>;
  changeUserRole: (id: number, role: string) => Promise<User>;
  // Bulk operations
  bulkDeleteUsers: (userIds: number[]) => Promise<any>;
  // Statistics
  statistics: any;
  statisticsLoading: boolean;
  systemStatus: any;
  systemStatusLoading: boolean;
}