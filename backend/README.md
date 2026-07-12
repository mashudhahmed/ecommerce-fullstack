# SnapCart — E-Commerce Backend

## Project Overview

SnapCart is a production-grade, enterprise-level e-commerce backend built with NestJS. It powers a complete e-commerce system with advanced features including multi-vendor support, real-time notifications, two-factor authentication, and comprehensive analytics.

### Key Highlights

- Production-ready with monitoring, logging, and health checks
- Enterprise security with 2FA, rate limiting, and JWT
- Multi-vendor marketplace with vendor approval workflow
- Real-time updates via WebSocket
- Search powered by Elasticsearch
- File upload with Cloudinary and local fallback
- Email templating with Handlebars
- Interactive API documentation with Swagger UI

---

## Technology Stack

### Backend Framework
- NestJS (v10) — Modular, TypeScript-first framework
- Node.js (v22) — Latest LTS version

### Database and ORM
- PostgreSQL — Primary database
- TypeORM (v0.3) — ORM with migrations
- Redis — Caching and session management

### Authentication and Security
- JWT — Stateless authentication
- BCrypt — Password hashing (12 rounds)
- 2FA — Two-factor authentication (TOTP + Email)
- Rate Limiting — Per-user and global rate limits
- Helmet — Security headers
- CORS — Configurable CORS policy

### Email and Notifications
- Nodemailer — SMTP email sending
- Handlebars — Email templating with layouts
- WebSocket (Socket.io) — Real-time notifications

### File Storage
- Cloudinary — Cloud image storage
- Local Storage — Fallback file storage

### Monitoring and Observability
- Prometheus — Metrics collection
- OpenTelemetry — Distributed tracing
- Sentry — Error tracking
- Health Checks — Liveness, readiness, and detailed checks

### Search
- Elasticsearch — Full-text search

### Testing
- Jest — Unit and end-to-end testing
- Supertest — HTTP testing

### API Documentation
- Swagger / OpenAPI (v3) — Interactive API documentation
- Swagger UI — API testing interface
- Swagger JSON — Machine-readable API specification

---

## Core Features

### Authentication and Authorization
- User registration (Customer and Vendor)
- JWT authentication with refresh tokens
- 2FA (Authenticator app and Email OTP)
- Role-based access (User, Vendor, Admin, SuperAdmin)
- Email verification
- Password reset with 6-digit codes
- Login attempt tracking and account lockout
- Token blacklisting
- Session management

### User Module
- Profile management with avatar upload
- Email change with password verification
- Account deletion (soft delete)
- User preferences
- Vendor profile management

### Product Module
- CRUD operations with image upload
- Category management (hierarchical)
- Stock management with bulk updates
- Product variants
- Product image gallery
- Search with Elasticsearch
- Vendor-specific product management
- Product reviews and ratings

### Cart Module
- Add, remove, and update items
- Merge guest cart with user cart
- Stock validation
- Cart persistence across sessions

### Order Module
- Order placement with idempotency
- Order status tracking (Pending → Processing → Shipped → Delivered)
- Order cancellation with stock restoration
- Order timeline and audit trail
- Vendor-specific order views
- Order statistics and analytics
- CQRS pattern (read/write separation)

### Admin Module
- User management (list, view, delete)
- Vendor management (approve, reject, suspend)
- Order management (status updates)
- Product management (CRUD)
- System settings
- Reports and exports (Excel, PDF, CSV, JSON)
- Admin statistics dashboard

### Vendor Module
- Vendor registration and approval workflow
- Vendor dashboard with statistics
- Performance metrics and analytics
- Revenue analytics
- Bulk product upload (CSV/JSON)
- Bulk product delete
- Order management for vendor products
- Order export
- Vendor reviews

### SuperAdmin Module
- Admin user management (create, list, delete)
- Full user management with role changes
- Bulk user operations
- Platform statistics
- System status monitoring
- Vendor performance overview
- Vendor ranking

### Notifications Module
- In-app notifications
- Email notifications
- Real-time WebSocket notifications
- Notification preferences
- Mark as read/unread
- Rate limiting per channel

### Reviews Module
- Product reviews with ratings
- Review image upload
- Verified purchase check
- Helpful votes
- Report reviews
- Admin approval workflow
- Review analytics (sentiment, trends)

### Wishlist Module
- Add and remove products
- Check if product is in wishlist
- Wishlist count
- Clear wishlist

### Search Module
- Elasticsearch integration
- Full-text search
- Autocomplete suggestions
- Popular search terms
- Search with filters (category, price, stock, rating)
- Faceted search

### Analytics and Export
- Sales overview with trends
- Product performance (best sellers, top revenue)
- User analytics (total, new, active)
- Vendor analytics
- Category performance
- Export reports (Excel, PDF, CSV, JSON)

### Mailer Module
Handlebars email templates with layouts. Includes 13+ email types:

- Verification email
- Welcome email
- Password reset code
- 2FA code
- 2FA backup codes
- Order confirmation
- Order status update
- Login notification
- Password changed confirmation
- Account deletion confirmation
- Vendor approval
- Vendor rejection
- Vendor registration notification

### Security Features
- Helmet for security headers
- CORS configuration
- Rate limiting (global and per-user)
- CSRF protection
- Input validation with class-validator
- XSS prevention
- SQL injection prevention (via TypeORM)
- 2FA with backup codes
- Account lockout after failed attempts
- Refresh token rotation

### File Upload
- Cloudinary integration
- Local storage fallback
- Image optimization
- Multiple file upload
- Avatar upload
- Review images
- Product images

---

## Folder Structure

```
backend/
├── src/
│   ├── admin/                 # Admin module
│   ├── analytics/             # Analytics module
│   ├── auth/                  # Authentication module
│   ├── cart/                  # Shopping cart module
│   ├── categories/            # Categories module
│   ├── common/                # Shared utilities
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── middleware/
│   │   └── dto/
│   ├── config/                # Configuration
│   ├── database/              # Database
│   ├── events/                # WebSocket and events
│   ├── files/                 # File upload
│   ├── health/                # Health checks
│   ├── mailer/                # Email service
│   │   └── templates/
│   │       ├── layouts/
│   │       ├── partials/
│   │       └── emails/
│   ├── migrations/            # Database migrations
│   ├── monitoring/            # Monitoring and metrics
│   ├── notifications/         # Notifications
│   ├── orders/                # Orders module
│   ├── products/              # Products module
│   ├── reviews/               # Reviews module
│   ├── search/                # Elasticsearch
│   ├── superadmin/            # SuperAdmin module
│   ├── user/                  # User module
│   ├── vendor/                # Vendor module
│   ├── wishlist/              # Wishlist module
│   ├── app.module.ts          # Root module
│   └── main.ts                # Application entry (Swagger configured here)
├── test/                      # Test files
├── .env.example               # Environment variables template
├── package.json
├── tsconfig.json
└── nest-cli.json
```

---

## API Endpoints

> **Note:** All endpoints are documented interactively at `/api/v1/docs` when the server is running.

### Authentication

| Method | Endpoint | Description |
|--------|----------|--------------|
| POST | `/auth/register` | Register user |
| POST | `/auth/register/vendor` | Register vendor |
| POST | `/auth/login` | Login user |
| POST | `/auth/refresh` | Refresh token |
| GET | `/auth/me` | Get current user |
| POST | `/auth/logout` | Logout user |
| POST | `/auth/logout-all` | Logout all sessions |
| POST | `/auth/verify-email` | Verify email |
| POST | `/auth/resend-verification` | Resend verification |
| POST | `/auth/forgot-password` | Request password reset |
| POST | `/auth/verify-reset-code` | Verify reset code |
| POST | `/auth/reset-password` | Reset password |
| POST | `/auth/change-password` | Change password |
| POST | `/auth/2fa/request-code` | Request 2FA code |
| POST | `/auth/2fa/verify-email` | Verify 2FA code |
| POST | `/auth/2fa/generate` | Generate 2FA secret |
| POST | `/auth/2fa/enable` | Enable 2FA |
| POST | `/auth/2fa/verify` | Verify 2FA token |
| POST | `/auth/2fa/disable` | Disable 2FA |

### Users

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/users/profile` | Get user profile |
| PATCH | `/users/profile` | Update profile |
| PATCH | `/users/profile/email` | Change email |
| PATCH | `/users/profile/avatar` | Upload avatar |
| DELETE | `/users/profile/avatar` | Remove avatar |
| DELETE | `/users/profile` | Delete account |
| GET | `/users` | Get all users (Admin) |
| GET | `/users/:id` | Get user by ID (Admin) |

### Products

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/products` | Get all products |
| GET | `/products/:id` | Get product by ID |
| GET | `/products/in-stock` | Get in-stock products |
| GET | `/products/out-of-stock` | Get out-of-stock products |
| GET | `/products/low-stock` | Get low-stock products |
| POST | `/products` | Create product |
| PUT | `/products/:id` | Update product |
| DELETE | `/products/:id` | Delete product |
| GET | `/products/vendor/my` | Get vendor products |

### Cart

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/cart` | Get cart |
| GET | `/cart/summary` | Get cart summary |
| GET | `/cart/total` | Get cart total |
| GET | `/cart/count` | Get cart item count |
| POST | `/cart` | Add to cart |
| PATCH | `/cart` | Update quantity |
| DELETE | `/cart/item/:productId` | Remove item |
| DELETE | `/cart` | Clear cart |
| POST | `/cart/checkout` | Checkout cart |

### Orders

| Method | Endpoint | Description |
|--------|----------|--------------|
| POST | `/orders` | Create order |
| GET | `/orders/my` | Get user orders |
| GET | `/orders/my/summary` | Get order summary |
| GET | `/orders/:id` | Get order by ID |
| PATCH | `/orders/:id/status` | Update order status |
| PATCH | `/orders/:id/cancel` | Cancel order |
| GET | `/orders/vendor` | Get vendor orders |
| GET | `/orders/admin/stats` | Get admin stats |

### Vendor

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/vendors/public` | Get public vendors |
| GET | `/vendors/public/:id` | Get vendor details |
| GET | `/vendors/dashboard` | Get vendor dashboard |
| GET | `/vendors/performance` | Get performance metrics |
| GET | `/vendors/revenue` | Get revenue analytics |
| GET | `/vendors/products` | Get vendor products |
| POST | `/vendors/products/bulk-upload` | Bulk upload products |
| DELETE | `/vendors/products/bulk-delete` | Bulk delete products |
| GET | `/vendors/orders` | Get vendor orders |
| GET | `/vendors/orders/export` | Export orders |
| GET | `/vendors/reviews` | Get vendor reviews |

### Admin

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/admin/stats` | Get dashboard stats |
| GET | `/admin/users` | Get all users |
| GET | `/admin/vendors` | Get all vendors |
| GET | `/admin/vendors/pending` | Get pending vendors |
| POST | `/admin/vendors/bulk-action` | Bulk vendor action |
| PATCH | `/admin/vendors/:id/suspend` | Suspend vendor |
| GET | `/admin/orders` | Get all orders |
| PATCH | `/admin/order/:id/status` | Update order status |

### SuperAdmin

| Method | Endpoint | Description |
|--------|----------|--------------|
| POST | `/superadmin/admins` | Create admin |
| GET | `/superadmin/admins` | Get all admins |
| DELETE | `/superadmin/admins/:id` | Delete admin |
| GET | `/superadmin/users` | Get all users |
| GET | `/superadmin/statistics` | Get platform statistics |
| GET | `/superadmin/system/status` | Get system status |
| GET | `/superadmin/vendors/performance` | Get vendor performance |
| GET | `/superadmin/vendors/ranking` | Get vendor ranking |
| GET | `/superadmin/vendors/growth` | Get vendor growth |

### Reviews

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/reviews/product/:productId` | Get product reviews |
| GET | `/reviews/product/:productId/stats` | Get review stats |
| POST | `/reviews` | Create review |
| PUT | `/reviews/:id` | Update review |
| DELETE | `/reviews/:id` | Delete review |
| POST | `/reviews/:id/helpful` | Mark helpful |
| POST | `/reviews/:id/report` | Report review |

### Wishlist

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/wishlist` | Get wishlist |
| POST | `/wishlist` | Add to wishlist |
| DELETE | `/wishlist/:productId` | Remove from wishlist |
| GET | `/wishlist/check/:productId` | Check if in wishlist |
| GET | `/wishlist/count` | Get wishlist count |
| DELETE | `/wishlist` | Clear wishlist |

### Analytics and Export

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/export/users` | Export users |
| GET | `/export/orders` | Export orders |
| GET | `/export/products` | Export products |
| GET | `/export/analytics` | Export analytics |

### Search

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/search` | Search products |
| GET | `/search/autocomplete` | Autocomplete suggestions |
| GET | `/search/popular` | Popular search terms |

### Health

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/health` | Health check |
| GET | `/health/liveness` | Liveness probe |
| GET | `/health/readiness` | Readiness probe |
| GET | `/health/detailed` | Detailed health |

### Monitoring

| Method | Endpoint | Description |
|--------|----------|--------------|
| GET | `/monitoring/metrics` | Prometheus metrics |
| GET | `/monitoring/metrics/json` | Metrics in JSON |

---

## API Documentation

This project uses Swagger/OpenAPI for interactive API documentation.

### Accessing Swagger UI

Once the server is running, you can access the Swagger UI at:

```
http://localhost:3001/api/v1/docs
```

### Features

- Interactive API testing
- Request/response schema validation
- Authentication support (JWT Bearer token)
- All endpoints documented with:
  - Request parameters
  - Request body schemas
  - Response schemas
  - Error codes
  - Example values

### Using Swagger for Authentication

1. Navigate to `http://localhost:3001/api/v1/docs`
2. Click the "Authorize" button
3. Enter your JWT token in the format: `Bearer <your-token>`
4. Click "Authorize"
5. Now you can test authenticated endpoints directly from the UI

### Export OpenAPI Specification

The OpenAPI specification is available in JSON format at:

```
http://localhost:3001/api/v1/docs-json
```

This can be used with:
- Postman (import as OpenAPI)
- API client generators
- Documentation generators
- API testing tools

---

## Installation and Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ecommerce-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Application
NODE_ENV=development
PORT=3001

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5434
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=ecommerce_db

# JWT
JWT_SECRET=your_super_secret_jwt_key_min_32_characters
JWT_EXPIRES_IN=7d

# Super Admin
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_PASSWORD=Admin@123456

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM_NAME=SnapCart
ADMIN_NOTIFICATION_EMAILS=admin@example.com

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Redis
REDIS_URL=redis://localhost:6379

# Elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX=products
```

### 4. Run Database Migrations

```bash
npm run migration:run
```

### 5. Start the Server

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

---

## Security Considerations

- JWT with refresh tokens
- HTTP-only cookies
- Rate limiting
- CSRF protection
- SQL injection prevention
- XSS prevention
- Two-factor authentication
- Password hashing with bcrypt
- Account lockout
- Token blacklisting

---

## Future Improvements

- Payment integration (Stripe, SSLCommerz, PayPal)
- Bulk import and export with Excel
- Advanced analytics dashboard
- AI-powered product recommendations
- Multi-language support
- Mobile app API optimization
- GraphQL API
- Microservices architecture
- Kubernetes deployment

---

## Summary of Changes Made

| Item | Change |
|------|--------|
| API Prefix | Added note about `/api/v1` prefix |
| CORS | Added `CORS_ORIGIN` to `.env` example |
| Database SSL | Added `DATABASE_SSL` to `.env` example |
| Formatting | Fixed minor formatting inconsistencies |

