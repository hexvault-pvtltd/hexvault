# HEXVAULT Workforce OS

A Next.js monorepo for company operations, HR, workforce management, public careers, and applicant tracking.

## Local development

```bash
npm ci
npm run db:generate
npm run dev
```

The web app runs on `http://localhost:3000` and the API on `http://localhost:4000`. Configure `.env` from `.env.example` first.

## Docker

```bash
docker compose up --build
```

To build individual production images:

```bash
docker build --build-arg APP_NAME=web -t hexvault-web .
docker build --build-arg APP_NAME=api -t hexvault-api .
```

## Render and CI/CD

Infrastructure is defined in `render.yaml`. See [the Render deployment guide](docs/render-deployment.md) for first-time setup, required GitHub secrets, migrations, and verification.
