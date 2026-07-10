// types/components.ts

import { ReactNode } from 'react';
import { Product, Order, CartItem, User } from './index';

// ============================================================
// LAYOUT TYPES
// ============================================================

export interface LayoutProps {
  children: ReactNode;
}

export interface PageProps {
  params: Record<string, string>;
  searchParams: Record<string, string | string[] | undefined>;
}

// ============================================================
// COMPONENT PROPS
// ============================================================

export interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onViewDetails?: (product: Product) => void;
  className?: string;
}

export interface ProductListProps {
  products: Product[];
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

export interface OrderCardProps {
  order: Order;
  showActions?: boolean;
  onCancel?: (orderId: number) => void;
  onViewDetails?: (orderId: number) => void;
  className?: string;
}

export interface CartItemProps {
  item: CartItem;
  onUpdateQuantity?: (productId: number, quantity: number) => void;
  onRemove?: (productId: number) => void;
  className?: string;
}

export interface UserAvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error;
  onRetry?: () => void;
  className?: string;
}

// ============================================================
// FORM COMPONENT PROPS
// ============================================================

export interface FormFieldProps {
  name: string;
  label?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export interface InputProps extends FormFieldProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
  value?: string | number;
  onChange?: (value: string | number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface SelectProps extends FormFieldProps {
  options: SelectOption[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  multiple?: boolean;
}

export interface TextareaProps extends FormFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
  maxLength?: number;
}

export interface CheckboxProps extends FormFieldProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

// ============================================================
// DIALOG/OVERLAY PROPS
// ============================================================

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export interface SheetProps extends DialogProps {
  side?: 'left' | 'right' | 'top' | 'bottom';
}

export interface ModalProps extends DialogProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

// ============================================================
// NAVIGATION PROPS
// ============================================================

export interface NavItemProps {
  href: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export interface BreadcrumbItemProps {
  label: string;
  href?: string;
  active?: boolean;
}

export interface TabItemProps {
  label: string;
  value: string;
  icon?: ReactNode;
  disabled?: boolean;
}

// ============================================================
// TABLE PROPS
// ============================================================

export interface ColumnDef<T> {
  id: string;
  header: string | ReactNode;
  accessorKey?: keyof T;
  accessorFn?: (row: T) => any;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  onRowClick?: (row: T) => void;
  className?: string;
}

// ============================================================
// PAGINATION PROPS
// ============================================================

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
}

// ============================================================
// TOAST/NOTIFICATION PROPS
// ============================================================

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ============================================================
// MENU/DROPDOWN PROPS
// ============================================================

export interface MenuItem {
  label: string;
  value: string;
  icon?: ReactNode;
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

export interface DropdownProps {
  trigger: ReactNode;
  items: MenuItem[];
  align?: 'start' | 'center' | 'end';
  className?: string;
}