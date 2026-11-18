# HEXVAULT Workforce OS

A Next.js monorepo for company operations, HR, workforce management, public careers, and applicant tracking.

## Architecture

- **Frontend (`apps/web`)**: Next.js web application (hosted separately, e.g., on Vercel).
- **Backend API (`apps/api`)**: Next.js REST API, authentication, and HR services (hosted on Render as `hexvault-api`).
- **Shared Core (`packages/core`)**: Shared domain logic, database client, and feature utilities.
- **Database (`hexvault-db`)**: Managed PostgreSQL 16 on Render.

## Local development

```bash
npm ci
npm run db:generate
npm run dev
```

- The Web UI runs on `http://localhost:3000`.
- The API service runs on `http://localhost:4000`.
- Configure `.env` from `.env.example` before running.

## Local Docker Stack

To run the complete local stack (PostgreSQL, RustFS S3-compatible object storage, ClamAV, API, and Web):

```bash
docker compose up --build
```

To build individual production container images locally:

```bash
docker build --build-arg APP_NAME=api -t hexvault-api .
docker build --build-arg APP_NAME=web -t hexvault-web .
```

## CI/CD Pipeline

The GitHub Actions CI/CD workflow (`.github/workflows/ci.yml`) runs on pull requests and pushes to `main`:

1. **Validation & Quality Gates**:
   - Clean dependency installation (`npm ci`) with global package caching.
   - Transient PostgreSQL 16 service container for testing migrations.
   - Generates Prisma client and validates migration application (`prisma migrate deploy`).
   - Verifies schema synchronization and checks for drift (`prisma migrate status`).
   - TypeScript type-checking across `apps/web` and `apps/api`.
   - Linting with ESLint.
   - Next.js production builds with compiler build caching (`.next/cache`).
   - Automated tests execution.

2. **Automated Render Deployment**:
   - On merges to `main`, triggers a verified exact-commit deployment for `hexvault-api` on Render.

### Required GitHub Secrets

Configure these under **Settings > Secrets and variables > Actions**:

| Secret | Description |
| :--- | :--- |
| `RENDER_API_DEPLOY_HOOK_URL` | Deploy Hook URL for `hexvault-api` (from Render Service > Settings). |
| `PRODUCTION_DATABASE_URL` | External PostgreSQL connection URL (for manual fallback migrations workflow). |

For blueprint setup, environment variables, and post-deployment verification, see the [Render Deployment Guide](docs/render-deployment.md).
