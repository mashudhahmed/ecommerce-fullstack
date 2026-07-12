# SnapCart — E-Commerce Frontend

## Project Overview

SnapCart Frontend is a modern, production-grade e-commerce storefront built with Next.js. It provides a seamless shopping experience with features including user authentication, product browsing, shopping cart, order management, vendor dashboard, and admin panels.

### Key Highlights

- Modern Next.js 15 with App Router architecture
- Server-side rendering (SSR) and static site generation (SSG)
- Real-time updates via WebSocket
- Optimistic UI updates for instant feedback
- Responsive design for all devices
- Dark mode support
- Accessibility-first approach
- Comprehensive role-based dashboards

---

## Technology Stack

### Framework and Core
- Next.js (v15) — React framework with App Router
- React (v19) — UI library
- TypeScript — Type-safe development

### State Management
- Zustand — Client-side state management
- TanStack Query (v5) — Server-state management and caching
- Persist middleware — Zustand persistence

### Styling
- Tailwind CSS (v4) — Utility-first CSS framework
- shadcn/ui — Reusable component library
- tw-animate-css — Animation utilities
- clsx + tailwind-merge — Conditional class names

### Forms and Validation
- React Hook Form — Form handling
- Zod — Schema validation
- @hookform/resolvers — Zod integration

### API and Networking
- Axios — HTTP client with interceptors
- Socket.io-client — Real-time WebSocket communication
- cookies-next + js-cookie — Cookie management

### UI Components
- Lucide React — Icon library
- Radix UI — Accessible primitives
- CMDK — Command palette
- Sonner — Toast notifications
- Recharts — Charting library
- @hello-pangea/dnd — Drag and drop

### Animations
- Framer Motion — Animation library

### Utilities
- date-fns — Date formatting
- UUID — Unique ID generation

---

## Core Features

### Authentication
- User and vendor registration
- Login with email/password
- Two-factor authentication (2FA)
- Email verification
- Password reset flow
- Session management with refresh tokens
- Role-based access control

### Product Experience
- Product listing with filters and search
- Product detail page with image gallery
- Product reviews and ratings
- Related products
- Wishlist management
- Category browsing

### Shopping Cart
- Add, remove, and update items
- Optimistic updates
- Cart persistence
- Merge guest cart on login
- Cart summary and totals

### Checkout and Orders
- Secure checkout process
- Order placement with idempotency
- Order history and tracking
- Order cancellation
- Order status updates

### User Dashboard
- Profile management with avatar upload
- Order summary and statistics
- Recent orders
- Wishlist management
- Account settings

### Vendor Dashboard
- Product management (CRUD with bulk operations)
- Order management and status updates
- Analytics and performance metrics
- Revenue tracking
- Bulk product upload
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

Create a `.env.local` file:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:3001

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Features
NEXT_PUBLIC_ENABLE_2FA=true
```

---

## Installation and Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ecommerce-frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file based on the template above.

### 4. Start the Development Server

```bash
npm run dev
```

### 5. Build for Production

```bash
npm run build
npm start
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run clean` | Clean build artifacts |

---

## Key Features in Detail

### Authentication Flow
1. User registers with email and password
2. Verification email sent with 6-digit code
3. User verifies email
4. User logs in
5. 2FA verification (if enabled)
6. Redirect to appropriate dashboard

### Role-Based Dashboards

| Role | Dashboard Access | Features |
|------|-------------------|----------|
| User | `/dashboard` | Orders, Profile, Wishlist |
| Vendor | `/vendor` | Products, Orders, Analytics |
| Admin | `/admin` | Users, Vendors, Orders, Products |
| SuperAdmin | `/superadmin` | Admins, Users, Vendors, Statistics |

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

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome for Android)

---

## Future Improvements

- PWA support
- Offline mode
- Advanced search filters
- Product comparison
- Social login (Google, Facebook)
- Multi-language support (i18n)
- Automated accessibility testing
- End-to-end testing with Playwright
- Performance monitoring with Lighthouse CI
