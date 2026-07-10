// types/navigation.ts

import { ReactNode } from 'react';
import { RoleType } from './index';

// ============================================================
// NAVIGATION ITEM TYPES
// ============================================================

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }> | ReactNode;
  roles?: RoleType[];
  requiresAuth?: boolean;
  requiresVendor?: boolean;
  requiresAdmin?: boolean;
  children?: NavItem[];
  active?: boolean;
  external?: boolean;
  onClick?: () => void;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface NavConfig {
  sections: NavSection[];
  footer?: NavItem[];
  header?: NavItem[];
}

// ============================================================
// BREADCRUMB TYPES
// ============================================================

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: ReactNode;
}

export type BreadcrumbConfig = BreadcrumbItem[];

// ============================================================
// SIDEBAR TYPES
// ============================================================

export interface SidebarConfig {
  isOpen: boolean;
  width?: 'sm' | 'md' | 'lg' | 'full';
  position?: 'left' | 'right';
  className?: string;
}

// ============================================================
// TAB TYPES
// ============================================================

export interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  content?: ReactNode;
}

// ============================================================
// STEPPER TYPES
// ============================================================

export interface StepItem {
  id: string | number;
  label: string;
  description?: string;
  icon?: ReactNode;
  isCompleted?: boolean;
  isActive?: boolean;
  isDisabled?: boolean;
}

// ============================================================
// ROUTE TYPES
// ============================================================

export interface RouteConfig {
  path: string;
  component: React.ComponentType<any>;
  layout?: React.ComponentType<any>;
  protected?: boolean;
  roles?: RoleType[];
  redirect?: string;
  children?: RouteConfig[];
}

export interface RoutesMap {
  [key: string]: RouteConfig;
}

// ============================================================
// MENU TYPES
// ============================================================

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
  children?: MenuItem[];
}

export interface MenuConfig {
  items: MenuItem[];
  className?: string;
}

// ============================================================
// LINK TYPES
// ============================================================

export interface LinkProps {
  href: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  external?: boolean;
  onClick?: () => void;
  className?: string;
}

// ============================================================
// PAGINATION NAVIGATION TYPES
// ============================================================

export interface PaginationNavProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
}

// ============================================================
// USER NAVIGATION TYPES
// ============================================================

export interface UserNavItem {
  label: string;
  href: string;
  icon?: ReactNode;
  onClick?: () => void;
  divider?: boolean;
}

export interface UserNavConfig {
  items: UserNavItem[];
  footer?: UserNavItem[];
}

// ============================================================
// AUTH NAVIGATION TYPES
// ============================================================

export interface AuthNavConfig {
  loginRoute: string;
  registerRoute: string;
  logoutRoute: string;
  forgotPasswordRoute: string;
  resetPasswordRoute: string;
  verifyEmailRoute: string;
  dashboardRoute: string;
}

// ============================================================
// ADMIN NAVIGATION TYPES
// ============================================================

export interface AdminNavItem extends NavItem {
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

export interface AdminNavConfig {
  items: AdminNavItem[];
  sections: NavSection[];
}

// ============================================================
// VENDOR NAVIGATION TYPES
// ============================================================

export interface VendorNavItem extends NavItem {
  vendorOnly?: boolean;
}

export interface VendorNavConfig {
  items: VendorNavItem[];
  sections: NavSection[];
}

// ============================================================
// DYNAMIC NAVIGATION TYPES
// ============================================================

export interface DynamicNavItem {
  id: string;
  label: string;
  href: string;
  icon?: ReactNode;
  roles?: RoleType[];
  conditions?: (user: any) => boolean;
  children?: DynamicNavItem[];
}

export interface DynamicNavConfig {
  items: DynamicNavItem[];
  user?: any;
}

// ============================================================
// NAVIGATION HELPERS
// ============================================================

export type NavItemFilter = (item: NavItem, user?: any) => boolean;

export interface NavigationHelpers {
  filterByRole: NavItemFilter;
  filterByAuth: NavItemFilter;
  filterByVendorStatus: NavItemFilter;
}