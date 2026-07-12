<div align="center">

<img src="./frontend/public/logo.png" alt="SnapCart logo" width="100"/>

# SnapCart

**A full-stack, multi-vendor e-commerce platform built with NestJS and Next.js**

[![Node](https://img.shields.io/badge/node-v22-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![NestJS](https://img.shields.io/badge/backend-NestJS%2010-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com)
[![Next.js](https://img.shields.io/badge/frontend-Next.js%2015-000000?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/language-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey)](#license)

[Overview](#overview) • [Architecture](#architecture) • [Tech Stack](#tech-stack) • [Getting Started](#getting-started) • [Documentation](#documentation)

</div>

---

## Overview

SnapCart is a production-grade, multi-vendor e-commerce platform composed of two independent applications: a NestJS backend API and a Next.js storefront. Together they support customer shopping, vendor storefront management, and platform-wide administration through role-based dashboards.

The system is built around real-world commerce requirements: order lifecycle management, vendor approval workflows, two-factor authentication, real-time notifications, full-text search, and analytics and reporting across every role in the platform.

### Highlights

- Multi-vendor marketplace with a vendor approval and moderation workflow
- Role-based access across User, Vendor, Admin, and SuperAdmin tiers
- Real-time order and notification updates via WebSocket
- Two-factor authentication (TOTP and email-based)
- Full-text product search powered by Elasticsearch
- Interactive API documentation via Swagger/OpenAPI
- Production-oriented observability: health checks, Prometheus metrics, and distributed tracing
- Responsive, accessible storefront with dark mode support

---

## Architecture

SnapCart follows a decoupled client-server architecture. The backend exposes a versioned REST API consumed by the Next.js frontend, with a WebSocket layer for real-time features shared across both.

```
┌───────────────────────┐        REST API (v1)            ┌───────────────────────┐
│                       │ ────────────────────────────▶  │                       │
│   SnapCart Frontend   │                                 │   SnapCart Backend    │
│   (Next.js 15, React) │◀─────────────────────────────  │    (NestJS 10)        │
│                       │       WebSocket (real-time)     │                       │
└───────────────────────┘                                 └───────────┬───────────┘
                                                                      │
                                                   ┌──────────────────┼──────────────────┐
                                                   │                  │                  │
                                            ┌──────▼─────┐    ┌───────▼───────┐  ┌───────▼───────┐
                                            │ PostgreSQL │    │     Redis     │  │ Elasticsearch │
                                            │ (primary)  │    │(cache/session)│  │   (search)    │
                                            └────────────┘    └───────────────┘  └───────────────┘
```

| Application | Description | Documentation |
|-------------|-------------|----------------|
| `backend/` | NestJS REST API, authentication, business logic, and data layer | [Backend README](./backend/README.md) |
| `frontend/` | Next.js storefront and role-based dashboards | [Frontend README](./frontend/README.md) |

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| Frontend Framework | Next.js 15 (App Router), React 19, TypeScript |
| Backend Framework | NestJS 10, Node.js 22 |
| Database | PostgreSQL, TypeORM |
| Caching and Sessions | Redis |
| Search | Elasticsearch |
| Real-Time | Socket.io (WebSocket) |
| Authentication | JWT, refresh token rotation, TOTP and email 2FA |
| State Management | Zustand, TanStack Query |
| Styling | Tailwind CSS, shadcn/ui |
| File Storage | Cloudinary with local fallback |
| Email | Nodemailer, Handlebars templates |
| API Documentation | Swagger / OpenAPI 3 |
| Monitoring | Prometheus, OpenTelemetry, Sentry |
| Testing | Jest, Supertest |

For the full technology breakdown of each application, see the individual READMEs linked above.

---

## Core Modules

| Module | Description |
|--------|-------------|
| Authentication | Registration, login, 2FA, email verification, password reset, session management |
| Products | Catalog, categories, variants, stock management, image galleries |
| Cart and Checkout | Persistent cart, guest cart merge, idempotent order placement |
| Orders | Status tracking, cancellation, timeline and audit trail, CQRS-based reads |
| Vendor | Registration and approval workflow, dashboard, analytics, bulk product operations |
| Admin | User and vendor management, order oversight, reporting and exports |
| SuperAdmin | Admin management, platform-wide statistics, vendor performance ranking |
| Reviews and Ratings | Verified purchase checks, moderation, sentiment analytics |
| Search | Full-text search with filters, autocomplete, and faceting |
| Notifications | In-app, email, and real-time WebSocket notifications |

---

## Getting Started

The backend and frontend are run as separate applications. Start the backend first, then the frontend, so `NEXT_PUBLIC_API_URL` has a running API to connect to.

### Prerequisites

- Node.js v22 or later
- PostgreSQL
- Redis
- Elasticsearch
- npm

### 1. Clone the Repository

```bash
git clone <repository-url>
cd snapcart
```

### 2. Set Up the Backend

```bash
cd backend
npm install
cp .env.example .env   # configure environment variables
npm run migration:run
npm run start:dev
```

The API will be available at `http://localhost:3001`, with interactive documentation at `http://localhost:3001/api/v1/docs`.

### 3. Set Up the Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # configure environment variables
npm run dev
```

The storefront will be available at `http://localhost:3000`.

Full setup instructions, environment variables, and configuration details are documented in each application's README.

---

## Documentation

| Document | Description |
|----------|-------------|
| [Backend README](./backend/README.md) | API architecture, endpoints, environment configuration, security, and Swagger documentation |
| [Frontend README](./frontend/README.md) | Application structure, state management strategy, components, and deployment |
| Swagger UI | `http://localhost:3001/api/v1/docs` (once the backend is running) |

---

## Roadmap

- Payment gateway integration (Stripe, SSLCommerz, PayPal)
- GraphQL API alongside the existing REST API
- Microservices architecture for high-traffic modules
- Kubernetes deployment configuration
- Progressive Web App (PWA) support with offline mode
- Multi-language support (i18n) across both applications
- End-to-end testing with Playwright

---

## License

This project is licensed under the MIT license.
