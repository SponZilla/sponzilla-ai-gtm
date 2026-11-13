# AutoGTM runs as a long-lived Express + Prisma process, so it needs a host
# that keeps a container alive (Render, Railway, Fly, ECS) — not a static or
# serverless target.
#
# Build:  docker build -t sponzilla-ai-gtm .
# Run:    docker run --env-file .env -p 3000:3000 sponzilla-ai-gtm
# Migrate: docker run --env-file .env sponzilla-ai-gtm npm run db:migrate

FROM node:20-slim AS build

WORKDIR /app

# Workspace manifests first, so a source-only change does not reinstall deps.
COPY package.json package-lock.json* ./
COPY packages ./packages
RUN npm ci

COPY prisma ./prisma
COPY prisma7.config.ts tsconfig.json ./
COPY src ./src

# tsc emits dist/; prebuild regenerates the Prisma client from the schema.
RUN npm run build

FROM node:20-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

# Only what the server needs at runtime: dependencies, compiled output, the
# generated Prisma client and the schema used by migrations.
COPY package.json package-lock.json* ./
COPY packages ./packages
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./src/generated
COPY prisma ./prisma
COPY prisma7.config.ts ./

EXPOSE 3000

# /health is liveness, /ready checks PostgreSQL.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/server.js"]
