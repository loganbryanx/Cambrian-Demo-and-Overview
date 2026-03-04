# Cambrian – System Architecture

## Overview

Cambrian follows a standard three-tier architecture with a React/Next.js frontend, an ASP.NET Core REST API backend, and a PostgreSQL database. Audio files and artwork are stored in AWS S3. Payments are handled entirely through Stripe.

---

## High-Level Diagram

```
┌─────────────────────────────────────────────────┐
│                   Client                        │
│          (Browser / Mobile Web App)             │
│             React / Next.js (TypeScript)        │
└──────────────────────┬──────────────────────────┘
                       │  HTTPS / REST JSON
                       ▼
┌─────────────────────────────────────────────────┐
│                Backend API                      │
│           ASP.NET Core (.NET 8)                 │
│                                                 │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │  Auth       │  │  Domain Services         │  │
│  │  (JWT/OAuth)│  │  TrackService            │  │
│  └─────────────┘  │  LicenseService          │  │
│                   │  OrderService            │  │
│  ┌─────────────┐  │  CreatorService          │  │
│  │  Middleware │  └──────────────────────────┘  │
│  │  Logging    │                                │
│  │  Rate Limit │                                │
│  └─────────────┘                                │
└───────┬─────────────────┬───────────────────────┘
        │                 │
        ▼                 ▼
┌───────────────┐  ┌──────────────────────────────┐
│  PostgreSQL   │  │  External Services           │
│               │  │                              │
│  users        │  │  ┌──────────┐  ┌──────────┐  │
│  tracks       │  │  │  AWS S3  │  │  Stripe  │  │
│  licenses     │  │  │  (files) │  │(payments)│  │
│  orders       │  │  └──────────┘  └──────────┘  │
│  payouts      │  │                              │
└───────────────┘  └──────────────────────────────┘
```

---

## Components

### Frontend (React / Next.js)

- **Pages**: `/marketplace`, `/creator/dashboard`, `/track/[id]`, `/checkout`
- **State Management**: React Context + SWR for server state
- **Audio Preview**: Web Audio API with a 30-second preview player
- **Auth**: NextAuth.js (JWT session strategy)

### Backend API (ASP.NET Core)

- **Controllers**: `TracksController`, `OrdersController`, `LicensesController`, `CreatorsController`, `AuthController`
- **Services**: Business logic layer keeping controllers thin
- **Repositories**: EF Core (Entity Framework Core) with PostgreSQL provider
- **Middleware**: JWT validation, global exception handling, request logging, rate limiting

### Database (PostgreSQL)

Key tables:

| Table | Description |
|---|---|
| `users` | Accounts (buyers and creators) |
| `tracks` | Audio track metadata |
| `track_files` | S3 keys for audio files and artwork |
| `licenses` | License type definitions per track |
| `orders` | Purchase records |
| `order_items` | Line items per order |
| `payouts` | Creator payout records |

### Storage (AWS S3)

- Audio files stored with private ACL; pre-signed URLs generated at purchase
- Artwork stored with public-read ACL for marketplace display
- 30-second preview clips generated server-side on upload

### Payments (Stripe)

- **One-time purchases** via Stripe Checkout Sessions
- **Subscription tiers** (e.g., "Pro Creator" plan) via Stripe Billing
- Webhooks handle `checkout.session.completed` and `invoice.paid` events

---

## Authentication Flow

```
1. User logs in (email/password or OAuth)
2. Backend validates credentials → issues JWT access token (15 min) + refresh token (7 days)
3. Frontend stores tokens in httpOnly cookies
4. Requests include Bearer token in Authorization header
5. Refresh endpoint exchanges expired access token for a new one
```

---

## Data Flow: Track Purchase

```
1. Buyer clicks "Buy License" on a track page
2. Frontend POSTs /api/orders with track ID and license type
3. Backend creates an Order record (status: pending) and calls Stripe to create a Checkout Session
4. Frontend redirects buyer to Stripe-hosted checkout
5. Buyer completes payment on Stripe
6. Stripe fires webhook → checkout.session.completed
7. Backend webhook handler marks Order as complete and grants download access
8. Buyer receives email with download link (pre-signed S3 URL, 24h expiry)
```

---

## Deployment

See [`deployment.md`](deployment.md) for infrastructure and deployment details.
