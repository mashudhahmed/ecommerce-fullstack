<div align="center">

<img src="./frontend/public/logo.png" alt="SnapCart logo" width="100"/>

# SnapCart

**A full-stack, multi-vendor e-commerce platform built with NestJS and Next.js**

[![Live Demo](https://img.shields.io/badge/demo-snapcart--fullstack.vercel.app-orange?style=for-the-badge&logo=vercel)](https://snapcart-fullstack.vercel.app)
<br/>

[![Node](https://img.shields.io/badge/node-v22-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![NestJS](https://img.shields.io/badge/backend-NestJS%2010-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![Next.js](https://img.shields.io/badge/frontend-Next.js%2015-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/database-Neon%20Postgres-00E599?logo=postgresql&logoColor=white)](https://neon.tech)
[![Cloudinary](https://img.shields.io/badge/media-Cloudinary-3448C5?logo=cloudinary&logoColor=white)](https://cloudinary.com)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](#license)

[Overview](#overview) • [Live Deployment](#live-deployment) • [Architecture](#architecture) • [Pre-Seeded Test Accounts](#pre-seeded-test-accounts) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Documentation](#documentation)

</div>

---

## Overview

SnapCart is a production-grade, multi-vendor marketplace platform composed of two independent applications: a **NestJS backend API** and a **Next.js storefront**. Together they support customer shopping, multi-vendor package order splitting, seller central store management, and platform-wide administration through role-based access control (RBAC).

The platform addresses end-to-end commerce requirements: vendor KYC onboarding pipelines, escrow and payout settlement, customer self-service order cancellations with automated stock restoration, real-time buyer-seller inquiry chat, faceted catalog discovery, and enterprise observability.

### Highlights

- **Multi-Vendor Marketplace Architecture**: Order splitting across distinct vendor packages with individual shipment fulfillment.
- **Vendor KYC Onboarding Pipeline**: 3-step compliance review with rejection reason feedback and re-submission flow.
- **Escrow & Vendor Payouts**: Automated escrow holding upon checkout, releasing to available balance upon delivery with withdrawal request management.
- **Live 4-Step Package Journey Tracker**: Real-time package progression (Order Placed ➔ Processing ➔ Shipped ➔ Delivered) and customer cancellation flow.
- **Real-Time Buyer–Seller Inquiry Chat**: Floating live chat drawer accessible directly from product Buy Boxes and order cards.
- **Faceted Catalog Discovery**: Multi-filter catalog search by departments, dynamic price sliders, minimum star ratings, and in-stock availability.
- **Google OAuth & 2FA**: Social authentication with dynamic origin resolution alongside TOTP Authenticator and email 2FA.
- **Cloud Media Storage**: Automatic cloud asset streaming via Cloudinary with resilient local disk fallbacks.
- **Interactive API Documentation**: Swagger/OpenAPI documentation at `/api/v1/docs`.

---

## Live Deployment

The platform is configured for multi-cloud deployment:

| Layer | Provider | URL |
|---|---|---|
| **Frontend Storefront** | Vercel | [https://snapcart-fullstack.vercel.app](https://snapcart-fullstack.vercel.app) |
| **Backend API** | Render | Managed Web Service (`/api/v1`) |
| **Database** | Neon | Serverless PostgreSQL with auto-SSL |
| **Media Assets** | Cloudinary | CDN-optimized image delivery |

---

## Pre-Seeded Test Accounts

The platform includes verified test accounts ready for evaluation across every tier (Default password: `Password@123`):

| Role | Email | Password | Access & Capabilities |
|---|---|---|---|
| **Super Admin** | `superadmin@marketplace.com` | `Password@123` | Platform governance, admins, payouts, vendor approval, settings |
| **Operations Admin** | `admin@marketplace.com` | `Password@123` | Catalog moderation, customer orders, customer accounts, financial reports |
| **Verified Vendor** | `vendor@marketplace.com` | `Password@123` | ElectroTech Solutions store ($1,250 wallet balance, product management, payouts) |
| **Customer** | `customer@marketplace.com` | `Password@123` | Verified shopper, package tracking, cart, order cancellations, live chat |

---

## Architecture

SnapCart follows a decoupled client-server architecture. The backend exposes a versioned REST API consumed by the Next.js frontend, with a WebSocket layer for real-time buyer-seller chat and order status updates.

```
┌──────────────────────────────────┐        REST API (v1)            ┌──────────────────────────────────┐
│                                  │ ────────────────────────────▶  │                                  │
│        SnapCart Frontend         │                                 │         SnapCart Backend         │
│   (Next.js 15, React 19, Vercel) │◀─────────────────────────────  │    (NestJS 10, Node 22, Render)  │
│                                  │       WebSocket (real-time)     │                                  │
└──────────────────────────────────┘                                 └───────────┬──────────────────────┘
                                                                                 │
                                               ┌─────────────────────────────────┼───────────────────────────────┐
                                               │                                 │                               │
                                        ┌──────▼────────┐                ┌───────▼───────┐               ┌───────▼───────┐
                                        │Neon PostgreSQL│                │  Cloudinary   │               │ Elasticsearch │
                                        │(Serverless DB)│                │ (Media Assets)│               │   (Search)    │
                                        └───────────────┘                └───────────────┘               └───────────────┘
```

| Application | Description | Documentation |
|-------------|-------------|----------------|
| `backend/` | NestJS REST API, TypeORM, authentication, business logic, and seeders | [Backend README](./backend/README.md) |
| `frontend/` | Next.js 15 App Router storefront, UI components, and role-based panels | [Frontend README](./frontend/README.md) |

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend Framework** | Next.js 15 (App Router), React 19, TypeScript |
| **Backend Framework** | NestJS 10, Node.js 22 |
| **Database** | PostgreSQL (Neon serverless or local), TypeORM |
| **File & Media Storage** | Cloudinary SDK with automatic local disk fallback |
| **Real-Time Communication** | Socket.io (WebSocket for notifications and inquiry chat) |
| **Authentication & Security** | JWT (HttpOnly cross-site cookies), Google OAuth 2.0, TOTP & Email 2FA |
| **State Management** | Zustand (persistent client state), TanStack Query v5 (server cache) |
| **Styling & UI** | Tailwind CSS v4, shadcn/ui, Radix UI primitives, Lucide Icons |
| **Email Service** | Nodemailer with Handlebars responsive email templates |
| **API Documentation** | Swagger / OpenAPI 3.0 |
| **Observability** | Prometheus metrics, OpenTelemetry, Sentry, Terminus Health Checks |

---

## Getting Started

### Prerequisites

- Node.js v20 or later (v22 recommended)
- PostgreSQL (Local or [Neon](https://neon.tech))
- npm

### 1. Clone the Repository

```bash
git clone https://github.com/mashudhahmed/ecommerce-fullstack.git
cd ecommerce-fullstack
```

### 2. Set Up the Backend

```bash
cd backend
npm install
cp .env.example .env   # Configure DATABASE_URL or host credentials
npm run build
npm run start:dev
```

- API Base: `http://localhost:3001/api/v1`
- Swagger Documentation: `http://localhost:3001/api/v1/docs`

### 3. Set Up the Frontend

```bash
cd ../frontend
npm install
cp .env.example .env.local   # Points to http://localhost:3001/api/v1
npm run dev
```

- Storefront Web App: `http://localhost:3002`

---

## Documentation

| Document | Description |
|----------|-------------|
| [Backend README](./backend/README.md) | API architecture, Neon setup, Cloudinary configuration, RBAC endpoints, and Render deployment |
| [Frontend README](./frontend/README.md) | Next.js app structure, Vercel deployment checklist, state management, and role-based views |
| Swagger UI | `http://localhost:3001/api/v1/docs` (when backend is running) |

---

## License

This project is licensed under the MIT License.
