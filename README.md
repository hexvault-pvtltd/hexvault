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

## Project structure

```
company_management/
├── apps/web/                  Next.js app (website + workspace)
│   └── src/
│       ├── app/               Pages and API routes
│       │   ├── (auth)/        Login, invitations, password reset
│       │   ├── (workspace)/   Dashboard, attendance, leave, projects, tasks, chat...
│       │   ├── api/v1/        REST API
│       │   ├── careers/       Public careers page
│       │   └── contact/       Public contact page
│       ├── components/
│       │   ├── landing/       Public landing page
│       │   │   ├── content/   All menu and footer popup text (edit here)
│       │   │   ├── navigation/ hero/ footer/ background/ shared/
│       │   └── ...            Workspace UI components
│       └── styles/            landing.css and brand typography
├── packages/core/             Shared business logic (auth, db, leave, tasks...)
├── prisma/                    Database schema and migrations
├── scripts/                   Helper scripts
└── render.yaml, Dockerfile, docker-compose.yml   Deployment
```
