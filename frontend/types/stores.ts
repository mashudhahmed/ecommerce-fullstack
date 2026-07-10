// types/stores.ts

import { User, CartItem, Product } from './index';

// ============================================================
// AUTH STORE TYPES
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

// ============================================================
// CART STORE TYPES
// ============================================================

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

// ============================================================
// UI STORE TYPES
// ============================================================

export interface UIState {
  sidebarOpen: boolean;
  isDarkMode: boolean;
  isLoading: boolean;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  setLoading: (loading: boolean) => void;
}

// ============================================================
// NOTIFICATION STORE TYPES
// ============================================================

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

// ============================================================
// PERSIST CONFIG TYPES
// ============================================================

export interface PersistConfig<T> {
  name: string;
  partialize?: (state: T) => Partial<T>;
  onRehydrateStorage?: () => (state: T | undefined) => void;
  version?: number;
  migrate?: (persistedState: any, version: number) => T | Promise<T>;
}