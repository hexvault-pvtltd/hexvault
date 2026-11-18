# HEXVAULT deployment on Render

The repository contains a Render Blueprint (`render.yaml`) for two Docker web services and one managed PostgreSQL database:

- `hexvault-web`: public Next.js UI, including `/careers`
- `hexvault-api`: API, authentication, HR controls, and Prisma migrations
- `hexvault-db`: PostgreSQL 16

The browser talks only to the web origin. The web service proxies `/api/*` over Render's private network to the API service, so session cookies remain same-origin.

## First deployment

1. Push the repository to GitHub.
2. In Render, choose **New > Blueprint**, connect the repository, and select `render.yaml`.
3. Apply the Blueprint. Render creates the database and services. The API container runs `prisma migrate deploy` before starting the server.
4. In each Render service, copy **Settings > Deploy Hook**.
5. Add these GitHub Actions repository secrets:
   - `RENDER_API_DEPLOY_HOOK_URL`
   - `RENDER_WEB_DEPLOY_HOOK_URL`
6. Create a protected GitHub environment named `production`. Add required reviewers if the account plan supports them.
7. Protect the `main` branch and require `HEXVAULT validation` and both Docker build checks.

Render automatic deploys are disabled in the Blueprint. A push to `main` deploys only after TypeScript, lint, tests, and both production Docker builds pass. The workflow asks Render to deploy the exact verified commit SHA.

## Optional production integrations

The core workforce, careers, and job-application workflows use PostgreSQL and work with the Blueprint as written. Configure these on `hexvault-api` before enabling their related product areas:

- Object storage: `S3_ENDPOINT`, `S3_PUBLIC_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- Malware scanning: `CLAMAV_HOST`, `CLAMAV_PORT`
- Alternative email providers: `BREVO_API_KEY`, or `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`

Never commit these values. Add them in the Render service's Environment settings.

## Database migrations

Normal deploys run reviewed migrations before the API server starts. The manual GitHub workflow is an emergency/maintenance fallback:

1. Create the protected GitHub environment `production-migrations`.
2. Add `PRODUCTION_DATABASE_URL` using Render Postgres's external URL.
3. Run **Production database migrations** from Actions on `main`.

Do not run `prisma migrate reset` against production. Review migration SQL and confirm a recoverable database backup before approving a manual migration.

## Local production stack

Copy `.env.example` to `.env`, replace every placeholder, then run:

```bash
docker compose up --build
```

The local stack includes PostgreSQL, a migration job, API, web, RustFS object storage, and ClamAV. Open `http://localhost:3000`; API readiness is available at `http://localhost:4000/api/health/ready`.

## Verification after deployment

1. Confirm `https://<web-service>/healthz` returns HTTP 200.
2. Confirm `https://<api-service>/api/health/ready` returns HTTP 200.
3. Sign in as Owner or HR and publish a job under **HR & hiring > Job postings**.
4. Submit an application from `/careers`.
5. Confirm the application appears in the HR/Owner queue and move it through Reviewing, Shortlisted, Rejected, or Hired.
6. Verify email delivery, object storage, and malware scanning if those optional integrations are enabled.

## Production plan upgrade

The checked-in Blueprint uses Render's free plans so it can be created without billing details. Free services can sleep and free PostgreSQL is not appropriate for long-lived production data. Before a real production launch:

1. Change both web service plans to at least `0.5c-512mb` and the database to a persistent paid plan.
2. Ensure database backups and test restoration are enabled.
3. Re-run `render blueprints validate render.yaml` before syncing the change.
