# SnapCart — E-Commerce Frontend

## Project Overview

SnapCart Frontend is a modern, production-grade e-commerce storefront built with Next.js. It provides a seamless shopping experience with features including user authentication, product browsing, shopping cart, order management, vendor dashboard, and admin panels.

### Key Highlights

- Modern Next.js 15 with App Router architecture
- Production Live Deployment on Vercel: [https://snapcart-fullstack.vercel.app](https://snapcart-fullstack.vercel.app)
- Real-time buyer–seller inquiry chat drawer and WebSocket notifications
- Multi-vendor package group order splitting & live 4-step package journey tracker
- Customer self-service order cancellation with automated stock & escrow restoration
- Faceted catalog search and discovery (departments, price tiers, star ratings, in-stock toggle)
- Google OAuth 2.0 with dynamic origin resolution & TOTP/Email 2FA
- Responsive design with dark mode and accessibility-first navigation
- Comprehensive role-based dashboards (Customer, Vendor, Admin, SuperAdmin)

---

## Technology Stack

### Framework and Core
- Next.js (v15) — React framework with App Router
- React (v19) — UI library
- TypeScript — Type-safe development

### State Management
- Zustand — Client-side persistent state (Auth, Cart, Preferences)
- TanStack Query (v5) — Server-state management and query caching

### Styling
- Tailwind CSS (v4) — Utility-first CSS framework
- shadcn/ui — High quality accessible component primitives
- tw-animate-css — Micro-animations
- clsx + tailwind-merge — Conditional class utility

### Forms and Validation
- React Hook Form — Form state handling
- Zod — Declarative runtime schema validation
- @hookform/resolvers — Form resolver integration

### API and Networking
- Axios — HTTP client with auth refresh interceptors and idempotency key injection
- Socket.io-client — Real-time WebSocket event streaming
- cookies-next + js-cookie — Cookie handling

### UI Components
- Lucide React — UI icon system
- Radix UI — Accessible headless components
- Sonner — High-performance toast notifications
- Recharts — Analytics charting library
- @hello-pangea/dnd — Drag-and-drop interactions

---

## Core Features

### Authentication & Security
- User and vendor registration
- Login with email/password
- Google OAuth 2.0 social sign-in with automatic client origin return
- Two-factor authentication (TOTP Authenticator apps & Email OTP)
- Email verification & password recovery
- Session refresh rotation with HttpOnly cross-site cookies
- Role-based route guards (Customer, Vendor, Admin, SuperAdmin)

### Product Experience & Discovery
- Faceted search: filter by category/departments, price slider, star rating, and in-stock toggles
- Product detail view with multi-image gallery
- Product reviews, ratings, and sentiment breakdown
- Wishlist management and synchronization
- Direct seller contact button with floating live chat drawer

### Shopping Cart
- Multi-vendor item grouping into distinct seller shipment packages
- Optimistic updates and persistent cart storage
- Seamless guest cart merging on login
- Real-time stock reservation validation

### Checkout & Order Lifecycle
- Idempotent order checkout with address validation
- Multi-vendor package order splitting with individual tracking
- Live 4-step package journey tracker (Placed ➔ Processing ➔ Shipped ➔ Delivered)
- Customer order cancellation modal with stock & escrow restoration
- Printable PDF invoices and packing slips

### Role-Based Portals
- **Customer Account**: Order tracking, profile management, returns, addresses (`/profile`, `/orders`)
- **Vendor Central**: Product catalog management, order fulfillment, balance & payout requests (`/vendor/dashboard`)
- **Admin Portal**: Operational catalog oversight, customer management, financial reports (`/admin`)
- **SuperAdmin Governance**: Administrator staff management, vendor KYC verification, payout approval (`/superadmin`)
- Vendor profile management

### Admin Dashboard
- User management
- Vendor management (approve, reject, suspend)
- Order management
- Product management
- System settings
- Reports and exports

### SuperAdmin Dashboard
- Admin user management
- Full user management
- Vendor performance overview
- Platform statistics
- System monitoring
- Vendor ranking

### Real-Time Features
- Live notifications via WebSocket
- Order status updates
- Vendor approval notifications
- Real-time cart updates

### Accessibility
- Skip to content link
- Keyboard navigation support
- ARIA labels and roles
- Focus management
- Screen reader support
- Reduced motion preference

---

## Project Structure

```
frontend/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes (grouped)
│   │   ├── login/
│   │   ├── register/
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   └── verify-email/
│   ├── admin/                    # Admin dashboard
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── users/
│   │   ├── vendors/
│   │   ├── orders/
│   │   ├── products/
│   │   ├── settings/
│   │   └── reports/
│   ├── cart/                     # Shopping cart
│   ├── categories/               # Categories
│   ├── checkout/                 # Checkout process
│   ├── dashboard/                # User dashboard
│   ├── orders/                   # Order management
│   ├── products/                 # Product pages
│   ├── profile/                  # User profile
│   ├── search/                   # Search results
│   ├── superadmin/               # SuperAdmin dashboard
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── admins/
│   │   ├── users/
│   │   ├── vendors/
│   │   ├── statistics/
│   │   └── settings/
│   ├── vendor/                   # Vendor dashboard
│   │   ├── layout.tsx
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── analytics/
│   │   ├── profile/
│   │   └── settings/
│   ├── wishlist/                 # Wishlist
│   ├── ClientLayout.tsx          # Client wrapper
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   ├── loading.tsx               # Loading state
│   └── not-found.tsx             # 404 page
├── components/                   # Reusable components
│   ├── auth/                     # Authentication components
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   ├── RegisterTabs.tsx
│   │   ├── ForgotPasswordForm.tsx
│   │   ├── ResetPasswordForm.tsx
│   │   ├── VerifyEmailForm.tsx
│   │   ├── TwoFactorSetup.tsx
│   │   ├── UserRegistrationForm.tsx
│   │   └── VendorRegistrationForm.tsx
│   ├── cart/                     # Cart components
│   │   └── CartItem.tsx
│   ├── categories/               # Category components
│   │   └── CategoryForm.tsx
│   ├── orders/                   # Order components
│   │   ├── OrderCard.tsx
│   │   ├── OrderFilters.tsx
│   │   ├── OrderStats.tsx
│   │   └── OrderStatusBadge.tsx
│   ├── products/                 # Product components
│   │   ├── ProductCard.tsx
│   │   ├── ProductDetail.tsx
│   │   ├── ProductForm.tsx
│   │   ├── ProductList.tsx
│   │   ├── ImageGallery.tsx
│   │   ├── MultiImageUpload.tsx
│   │   └── RelatedProducts.tsx
│   ├── profile/                  # Profile components
│   │   ├── ProfileForm.tsx
│   │   └── AvatarUpload.tsx
│   ├── reviews/                  # Review components
│   │   ├── ReviewForm.tsx
│   │   └── ReviewList.tsx
│   ├── shared/                   # Shared components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Providers.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── SkipToContent.tsx
│   ├── ui/                       # shadcn/ui components
│   ├── vendor/                   # Vendor components
│   │   ├── BulkUploadWithImages.tsx
│   │   ├── VendorBulkUpload.tsx
│   │   └── FileUpload.tsx
│   └── wishlist/                 # Wishlist components
│       └── WishlistButton.tsx
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts
│   ├── useCart.ts
│   ├── useProducts.ts
│   ├── useOrders.ts
│   ├── useWishlist.ts
│   ├── useVendor.ts
│   ├── useAdmin.ts
│   ├── useSuperAdmin.ts
│   ├── useCategories.ts
│   ├── useReviews.ts
│   ├── useSearch.ts
│   ├── useExport.ts
│   ├── useWebSocket.ts
│   ├── useTwoFactor.ts
│   └── useDebounce.ts
├── lib/                          # Utilities and configuration
│   ├── api-client.ts             # Axios client with interceptors
│   ├── query-client.ts           # TanStack Query config
│   ├── utils.ts                  # Utility functions
│   ├── seo.ts                    # SEO metadata generator
│   ├── animations.ts             # CSS animation helpers
│   ├── accessibility.ts          # Accessibility utilities
│   ├── performance.ts            # Performance tracking
│   ├── fallback-products.ts      # Fallback product data
│   ├── fallback-categories.ts    # Fallback category data
│   └── fallback-orders.ts        # Fallback order data
├── services/                     # API services
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── product.service.ts
│   ├── cart.service.ts
│   ├── order.service.ts
│   ├── category.service.ts
│   ├── review.service.ts
│   ├── wishlist.service.ts
│   ├── vendor.service.ts
│   ├── admin.service.ts
│   ├── search.service.ts
│   ├── export.service.ts
│   └── notification.service.ts
├── store/                        # Zustand stores
│   ├── auth-store.ts
│   ├── cart-store.ts
│   ├── ui-store.ts
│   └── wishlist-store.ts
├── types/                        # TypeScript type definitions
│   ├── index.ts
│   ├── api.ts
│   ├── hooks.ts
│   ├── stores.ts
│   ├── forms.ts
│   ├── navigation.ts
│   ├── components.ts
│   └── errors.ts
├── validations/                  # Zod validation schemas
│   └── schemas.ts
├── public/                       # Static assets
├── middleware.ts                 # Route protection
├── next.config.js                # Next.js configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── postcss.config.js             # PostCSS configuration
├── tsconfig.json                 # TypeScript configuration
└── package.json                  # Dependencies
```

---

## Key Components

### Header
The header component provides navigation, search, cart preview, notifications, and user menu:

- Responsive design with mobile menu
- Search with autocomplete suggestions
- Cart preview with item management
- Notification bell with real-time updates
- User dropdown with role-based navigation
- Dark mode toggle

### Product Card
Product cards display product information with:

- Image with lazy loading
- Title, price, and rating
- Stock status badge
- Add to cart functionality
- Wishlist toggle
- Quick view option

### Shopping Cart
The cart system includes:

- Optimistic updates for instant UI feedback
- Quantity controls
- Item removal with confirmation
- Cart total calculation
- Checkout flow

### Order Management
Order pages provide:

- Order list with filtering and sorting
- Order detail with timeline
- Order status tracking
- Order cancellation
- Export functionality

---

## Environment Variables

Create a `.env.local` file based on `.env.example`:

### Development (`.env.local`)
```env
# API Configuration (NestJS backend running on port 3001)
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# App Configuration (Next.js running on port 3002)
NEXT_PUBLIC_APP_URL=http://localhost:3002

# Features
NEXT_PUBLIC_ENABLE_2FA=true
```

### Production (Configured in Vercel Dashboard)
```env
# API Configuration (Render Backend)
NEXT_PUBLIC_API_URL=https://your-backend-service.onrender.com/api/v1
NEXT_PUBLIC_WS_URL=wss://your-backend-service.onrender.com

# App Configuration (Vercel Production Domain)
NEXT_PUBLIC_APP_URL=https://snapcart-fullstack.vercel.app

# Features
NEXT_PUBLIC_ENABLE_2FA=true
```

---

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/mashudhahmed/ecommerce-fullstack.git
cd ecommerce-fullstack/frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env.local
```

### 4. Start the Development Server

```bash
npm run dev
```

The application will be running at [http://localhost:3002](http://localhost:3002).

### 5. Build for Production

```bash
npm run build
npm start
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server on port 3002 |
| `npm run build` | Build optimized production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint check |
| `npm run clean` | Clean `.next` and build caches |

---

## Key Features in Detail

### Authentication Flow
1. User registers or signs in with email/password or Google OAuth
2. Google OAuth passes origin directly to preserve Vercel production destination
3. Verification email sent with 6-digit code for self-serve recovery
4. 2FA verification modal (TOTP Authenticator or Email OTP)
5. Automatic role-based navigation based on account capabilities

### Role-Based Portals

| Role | Primary Portal | Available Features |
|------|-------------------|----------|
| Customer | `/profile`, `/orders` | Order History, Package Tracker, Address Book, Wishlist |
| Vendor | `/vendor/dashboard` | Product Catalog, Multi-Image Upload, Orders, Wallet & Payouts |
| Store Admin | `/admin` | Store Operations, Catalog Moderation, Order Status, Reports |
| SuperAdmin | `/superadmin` | Platform Governance, Admin Management, Vendor KYC Approvals |

### Real-Time Features
- WebSocket connection established on login
- Real-time notifications for orders and vendor status
- Live updates for order status changes

### Accessibility
- All interactive elements have ARIA labels
- Keyboard navigation support
- Focus management for modals and dialogs
- Reduced motion preference respected
- Skip-to-content link

### Performance Optimization
- Image optimization with the Next.js Image component
- Code splitting with dynamic imports
- Lazy loading for components
- Server-side rendering where appropriate
- Static generation for product pages

---

## State Management Strategy

### Client State (Zustand)
- Auth state (user, authentication status)
- Cart state (items, quantities, totals)
- UI state (sidebar, dark mode, loading)
- Wishlist state (items, sync status)

### Server State (TanStack Query)
- Products, categories, reviews
- Orders, order history, summaries
- User profile and settings
- Vendor data and analytics
- Real-time cache invalidation

### Persistence
- Auth state persisted in local storage
- Cart state persisted across sessions
- Wishlist state persisted

---

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:cov
```

---

## Deployment

### Vercel Deployment (Production)

The storefront is deployed and optimized for Vercel:

1. **Import Git Repository**:
   - In the [Vercel Dashboard](https://vercel.com), import `ecommerce-fullstack`.
   - Set **Root Directory** to `frontend`.
   - Leave **Framework Preset** as `Next.js`.

2. **Configure Environment Variables**:
   Add the following under **Project Settings > Environment Variables**:
   | Variable | Value Description |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | Your Render backend API URL (e.g. `https://your-backend.onrender.com/api/v1`) |
   | `NEXT_PUBLIC_WS_URL` | Your Render WebSocket URL (e.g. `wss://your-backend.onrender.com`) |
   | `NEXT_PUBLIC_APP_URL` | Your Vercel frontend URL (`https://snapcart-fullstack.vercel.app`) |
   | `NEXT_PUBLIC_ENABLE_2FA` | `true` |

3. **Deploy**:
   - Click **Deploy**. Subsequent pushes to `main` will trigger automated zero-downtime previews and production releases.

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome for Android)

---

## Future Improvements

- Progressive Web App (PWA) with offline caching
- Additional payment gateways (Stripe, PayPal, SSLCommerz)
- Product comparison side-by-side modal
- Multi-language support (i18n)
- Automated visual regression testing
- End-to-end test suite with Playwright
- Performance monitoring with Lighthouse CI
