# Cambrian – AI Music Marketplace *(In Development)*

Cambrian is a full-stack platform that allows creators to upload, license, and sell AI-generated music. It provides a marketplace where buyers can browse, preview, and purchase tracks, while creators manage their catalogue, set licensing terms, and receive payouts — all through a clean, modern interface.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React / Next.js (TypeScript) |
| Backend API | ASP.NET Core (.NET 8) |
| Database | PostgreSQL |
| Payments | Stripe (subscriptions & one-time purchases) |
| Auth | JWT + OAuth 2.0 |
| Storage | AWS S3 (audio files & artwork) |
| Hosting | Docker / AWS ECS |

---

## Architecture Overview

```
User (Browser / Mobile)
        │
        ▼
  Frontend (React / Next.js)
        │
        ▼
  Backend API (ASP.NET Core)
        │
        ├──► PostgreSQL  (user accounts, tracks, licenses, orders)
        │
        ├──► AWS S3      (audio file & artwork storage)
        │
        └──► Stripe      (payment processing & subscriptions)
```

See [`docs/architecture.md`](docs/architecture.md) for the full system design.

---

## Key Features

- 🎵 **Creator Upload Flow** – drag-and-drop upload with automatic waveform generation and tagging
- 🛒 **Marketplace** – browse, preview (30-second clips), and purchase individual tracks or bundles
- 📄 **Flexible Licensing** – per-track licensing options (personal, commercial, exclusive)
- 💳 **Stripe Payments** – one-time purchases and monthly subscription tiers
- 🔐 **JWT Authentication** – secure login, refresh tokens, and OAuth (Google / GitHub)
- 📊 **Creator Dashboard** – earnings, download analytics, and payout history

---

## Repository Structure

```
cambrian-demo
│
├── README.md
├── docs
│   ├── architecture.md       ← system design & component diagram
│   ├── api-design.md         ← REST API reference
│   └── deployment.md         ← Docker / AWS deployment guide
│
├── example-backend
│   └── sample-controller.cs  ← ASP.NET Core controller example
│
├── example-frontend
│   └── sample-component.jsx  ← React marketplace component example
│
└── screenshots               ← UI screenshots
```

> **Note:** This repository is an architecture overview and portfolio demo. It contains simplified examples and documentation — not the full production codebase.

---

## Documentation

- [Architecture](docs/architecture.md)
- [API Design](docs/api-design.md)
- [Deployment](docs/deployment.md)

---

## Screenshots

See the [`screenshots/`](screenshots/) directory for UI previews of the platform.

---

## Contact

Built by [Logan Bryan](https://github.com/loganbryanx). Feel free to reach out for questions or collaboration opportunities.
