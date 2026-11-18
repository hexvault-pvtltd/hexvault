# Build either the web or API workspace from the monorepo root:
# docker build --build-arg APP_NAME=web -t hexvault-web .
# docker build --build-arg APP_NAME=api -t hexvault-api .
FROM node:22-alpine AS base
WORKDIR /workspace
RUN apk add --no-cache openssl

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/core/package.json packages/core/package.json
RUN npm ci

FROM base AS migrations
WORKDIR /workspace
RUN npm init -y && npm install --no-save --no-package-lock prisma@6.19.0
COPY prisma ./prisma
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM deps AS builder
ARG APP_NAME=web
ARG API_INTERNAL_URL=http://api:4000
ARG API_INTERNAL_HOSTPORT=
ENV API_INTERNAL_URL=${API_INTERNAL_URL}
ENV API_INTERNAL_HOSTPORT=${API_INTERNAL_HOSTPORT}
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV DIRECT_URL=postgresql://build:build@127.0.0.1:5432/build
COPY . .
RUN npx prisma generate
RUN npm run build --workspace @hexvault/${APP_NAME}
RUN mkdir -p /standalone/apps/${APP_NAME}/.next
RUN cp -a apps/${APP_NAME}/.next/standalone/. /standalone/
RUN cp -a apps/${APP_NAME}/.next/static /standalone/apps/${APP_NAME}/.next/static
RUN if [ -d apps/${APP_NAME}/public ]; then cp -a apps/${APP_NAME}/public /standalone/apps/${APP_NAME}/public; fi

FROM node:22-alpine AS runner
ARG APP_NAME=web
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
RUN apk add --no-cache openssl
WORKDIR /workspace
COPY --from=builder /standalone/ ./
COPY --from=builder /workspace/node_modules/bcryptjs /workspace/node_modules/bcryptjs
COPY --from=builder /workspace/scripts/provision-object-store.mjs /workspace/scripts/provision-object-store.mjs
COPY --from=migrations /workspace/node_modules /workspace/migrations/node_modules
COPY --from=migrations /workspace/prisma /workspace/prisma
WORKDIR /workspace/apps/${APP_NAME}
RUN chown -R node:node /workspace
USER node
EXPOSE 3000 4000
CMD ["node", "server.js"]
