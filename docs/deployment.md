# Cambrian – Deployment Guide

## Overview

Cambrian is containerised with Docker and deployed to AWS using ECS (Elastic Container Service) with Fargate. The PostgreSQL database is managed via AWS RDS. Static assets and audio files are stored in AWS S3.

---

## Prerequisites

- Docker & Docker Compose (local development)
- AWS CLI configured with appropriate IAM permissions
- .NET 8 SDK (for local backend development)
- Node.js 20+ (for local frontend development)

---

## Local Development

### 1. Clone the repository and set up environment variables

```bash
cp .env.example .env
# Edit .env with your local values
```

Required variables:

```env
# Database
DATABASE_URL=Host=localhost;Port=5432;Database=cambrian_dev;Username=postgres;Password=postgres

# JWT
JWT_SECRET=your-256-bit-secret
JWT_ISSUER=https://localhost:5001
JWT_AUDIENCE=cambrian-client

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=cambrian-dev
```

### 2. Start all services with Docker Compose

```bash
docker compose up --build
```

This starts:
- **PostgreSQL** on port 5432
- **Backend API** on port 5001 (with hot reload)
- **Frontend** on port 3000 (with Next.js hot reload)

### 3. Apply database migrations

```bash
docker compose exec api dotnet ef database update
```

### 4. Open the app

- Frontend: http://localhost:3000
- API: http://localhost:5001
- Swagger UI: http://localhost:5001/swagger

---

## Docker Images

### Backend (`Dockerfile` in `/backend`)

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Cambrian.Api/Cambrian.Api.csproj", "Cambrian.Api/"]
RUN dotnet restore "Cambrian.Api/Cambrian.Api.csproj"
COPY . .
RUN dotnet publish "Cambrian.Api/Cambrian.Api.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Cambrian.Api.dll"]
```

### Frontend (`Dockerfile` in `/frontend`)

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## AWS Infrastructure

### Architecture

```
Route 53 (DNS)
     │
     ▼
CloudFront (CDN + TLS termination)
     │
     ├──► S3 (static assets, audio files)
     │
     └──► ALB (Application Load Balancer)
              │
              ├──► ECS Fargate – Frontend (Next.js)
              │
              └──► ECS Fargate – Backend API (ASP.NET Core)
                        │
                        ├──► RDS PostgreSQL (Multi-AZ)
                        │
                        └──► ElastiCache Redis (session / rate-limit cache)
```

### Key Resources

| Resource | AWS Service | Notes |
|---|---|---|
| Frontend | ECS Fargate | Auto-scaling, min 1 / max 5 tasks |
| Backend API | ECS Fargate | Auto-scaling, min 2 / max 10 tasks |
| Database | RDS PostgreSQL 16 | Multi-AZ, automated backups |
| Cache | ElastiCache Redis | Rate limiting & session store |
| File Storage | S3 | Versioned, lifecycle rules for old previews |
| CDN | CloudFront | Serves artwork & previews globally |
| Secrets | AWS Secrets Manager | Injected as env vars at task startup |
| Container Registry | ECR | Private image registry |

---

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/deploy.yml`):

```
Push to main branch
        │
        ▼
1. Run unit tests (dotnet test / npm test)
        │
        ▼
2. Build Docker images
        │
        ▼
3. Push images to ECR
        │
        ▼
4. Update ECS task definitions
        │
        ▼
5. Deploy to ECS (rolling update, zero downtime)
        │
        ▼
6. Run smoke tests against staging
        │
        ▼
7. Promote to production (manual approval gate)
```

---

## Database Migrations

Migrations are managed with Entity Framework Core.

```bash
# Create a new migration
dotnet ef migrations add <MigrationName> --project Cambrian.Infrastructure

# Apply migrations (run automatically on startup in production)
dotnet ef database update
```

Production migrations are applied automatically when the backend container starts, before the application begins accepting traffic.

---

## Monitoring

| Tool | Purpose |
|---|---|
| CloudWatch | Container logs, metrics, and alarms |
| CloudWatch Synthetics | Uptime checks on key endpoints |
| Sentry | Application error tracking (frontend + backend) |
| Stripe Dashboard | Payment event monitoring |
